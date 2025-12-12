import { FansResponse, CommonFollowingsResponse } from "../types/bilibili";
import { cacheManager } from "../utils/cacheManager";
import logger from "../utils/logger";

// ================== 通用 HTTP 请求层 ==================

interface BiliApiResponse {
  code: number;
  message: string;
  ttl?: number;
  data?: unknown;
}

/**
 * 通用 API 请求函数
 * 封装 GM_xmlhttpRequest，统一处理请求和响应
 */
const request = <T extends BiliApiResponse>(
  url: string,
  params?: Record<string, string | number>,
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          fullUrl.searchParams.append(key, String(value));
        }
      });
    }

    GM_xmlhttpRequest({
      method: "GET",
      url: fullUrl.toString(),
      timeout: 30000,
      onload: (response) => {
        // 修复1: 检查 HTTP 状态码
        if (response.status < 200 || response.status >= 300) {
          reject(
            new Error(`HTTP 错误: ${response.status} ${response.statusText}`),
          );
          return;
        }

        try {
          const data: T = JSON.parse(response.responseText);
          if (data.code === 0) {
            resolve(data);
          } else {
            reject(new Error(data.message || "请求失败"));
          }
        } catch (e) {
          reject(
            new Error(
              `解析响应失败: ${e instanceof Error ? e.message : String(e)}`,
            ),
          );
        }
      },
      onerror: (response) => {
        reject(new Error(`网络请求失败: ${response.error || "未知错误"}`));
      },
      ontimeout: () => {
        reject(new Error("请求超时"));
      },
    });
  });
};

// ================== 类型定义 ==================

interface NavResponse {
  code: number;
  message: string;
  ttl: number;
  data: {
    isLogin: boolean;
    mid: number;
    uname: string;
  };
}

interface GetFansListParams {
  vmid: number;
  ps?: number;
  pn?: number;
  offset?: string;
}

export interface CommonFollowingsResult {
  response: CommonFollowingsResponse;
  fromCache: boolean;
}

// 修复3: 请求去重 - 缓存正在进行的请求
const pendingRequests = new Map<string, Promise<CommonFollowingsResult>>();

// ================== API 函数 ==================

/**
 * 通过 API 获取当前登录用户的 mid
 */
export const getCurrentUserMidFromAPI = async (): Promise<number> => {
  const data = await request<NavResponse>(
    "https://api.bilibili.com/x/web-interface/nav",
  );

  // 修复2: 检查 data.data 是否存在
  if (!data.data) {
    throw new Error("无效的响应数据");
  }

  if (!data.data.isLogin) {
    throw new Error("用户未登录");
  }

  return data.data.mid;
};

/**
 * 获取当前用户的 mid (同步方法)
 * 从页面中提取，适合在 B站页面内使用
 */
export const getCurrentUserMid = (): number => {
  // 尝试从页面 URL 获取
  const match = window.location.href.match(/space\.bilibili\.com\/(\d+)/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // 尝试从页面元素获取
  const midElement = document.querySelector("[data-usercard-mid]");
  if (midElement) {
    const mid = midElement.getAttribute("data-usercard-mid");
    if (mid) return parseInt(mid, 10);
  }

  return 0;
};

/**
 * 获取粉丝列表
 */
export const getFansList = (
  params: GetFansListParams,
): Promise<FansResponse> => {
  const { vmid, ps = 20, pn = 1, offset } = params;
  return request<FansResponse>("https://api.bilibili.com/x/relation/fans", {
    vmid,
    ps,
    pn,
    ...(offset && { offset }),
  });
};

/**
 * 获取关注列表
 */
export const getFollowingsList = (
  params: GetFansListParams,
): Promise<FansResponse> => {
  const { vmid, ps = 20, pn = 1 } = params;
  return request<FansResponse>(
    "https://api.bilibili.com/x/relation/followings",
    {
      vmid,
      ps,
      pn,
    },
  );
};

/**
 * 获取共同关注列表（带缓存和请求去重）
 */
export const getCommonFollowings = async (
  vmid: number,
  useCache: boolean = true,
): Promise<CommonFollowingsResult> => {
  const cacheKey = `common_followings_${vmid}`;

  // 先查询缓存
  if (useCache) {
    const cached = cacheManager.get<CommonFollowingsResponse>(cacheKey);
    if (cached) {
      logger.log(`从缓存加载共同关注 (mid: ${vmid})`);
      return { response: cached, fromCache: true };
    }
  }

  // 修复3: 检查是否有正在进行的相同请求，避免重复请求
  const pendingKey = `pending_${vmid}`;
  if (pendingRequests.has(pendingKey)) {
    logger.log(`复用进行中的请求 (mid: ${vmid})`);
    return pendingRequests.get(pendingKey)!;
  }

  // 创建请求 Promise
  const requestPromise = (async (): Promise<CommonFollowingsResult> => {
    try {
      const response = await request<CommonFollowingsResponse>(
        "https://api.bilibili.com/x/relation/followings/followed_upper",
        { vmid },
      );

      // 存入缓存
      cacheManager.set(cacheKey, response);
      logger.log(`API 请求共同关注 (mid: ${vmid}), 已缓存`);

      return { response, fromCache: false };
    } finally {
      // 请求完成后从 pending 中移除
      pendingRequests.delete(pendingKey);
    }
  })();

  // 将请求添加到 pending 中
  pendingRequests.set(pendingKey, requestPromise);

  return requestPromise;
};
