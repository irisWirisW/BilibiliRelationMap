import { FansResponse, CommonFollowingsResponse } from "../types/bilibili";
import { cacheManager } from "../utils/cacheManager";

interface NavResponse {
  code: number;
  message: string;
  ttl: number;
  data: {
    isLogin: boolean;
    mid: number;
    uname: string;
    // ... 其他字段
  };
}

/**
 * 通过 API 获取当前登录用户的 mid
 * 使用 /x/web-interface/nav 接口
 */
export const getCurrentUserMidFromAPI = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url: "https://api.bilibili.com/x/web-interface/nav",
      onload: (response) => {
        try {
          const data: NavResponse = JSON.parse(response.responseText);
          if (data.code === 0 && data.data.isLogin) {
            resolve(data.data.mid);
          } else if (!data.data.isLogin) {
            reject(new Error("用户未登录"));
          } else {
            reject(new Error(data.message || "获取用户信息失败"));
          }
        } catch (error) {
          reject(new Error("解析响应失败"));
        }
      },
      onerror: () => {
        reject(new Error("网络请求失败"));
      },
    });
  });
};

/**
 * 获取当前用户的 mid (同步方法)
 * 从页面中提取，适合在 B站页面内使用
 * 如果需要更可靠的方式，请使用 getCurrentUserMidFromAPI()
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

  // 返回 0 表示需要用户提供
  return 0;
};

interface GetFansListParams {
  vmid: number;
  ps?: number; // 每页项数，默认 50
  pn?: number; // 页码，默认 1
  offset?: string; // 偏移量
}

/**
 * 获取粉丝列表
 * 使用 GM_xmlhttpRequest 发起跨域请求
 */
export const getFansList = (
  params: GetFansListParams,
): Promise<FansResponse> => {
  return new Promise((resolve, reject) => {
    const { vmid, ps = 20, pn = 1, offset } = params;

    const url = new URL("https://api.bilibili.com/x/relation/fans");
    url.searchParams.append("vmid", vmid.toString());
    url.searchParams.append("ps", ps.toString());
    url.searchParams.append("pn", pn.toString());
    if (offset) {
      url.searchParams.append("offset", offset);
    }

    GM_xmlhttpRequest({
      method: "GET",
      url: url.toString(),
      onload: (response) => {
        try {
          const data: FansResponse = JSON.parse(response.responseText);
          if (data.code === 0) {
            resolve(data);
          } else {
            reject(new Error(data.message || "请求失败"));
          }
        } catch (error) {
          reject(new Error("解析响应失败"));
        }
      },
      onerror: (error) => {
        reject(new Error("网络请求失败"));
      },
    });
  });
};

/**
 * 获取关注列表
 * 使用 GM_xmlhttpRequest 发起跨域请求
 */
export const getFollowingsList = (
  params: GetFansListParams,
): Promise<FansResponse> => {
  return new Promise((resolve, reject) => {
    const { vmid, ps = 20, pn = 1 } = params;

    const url = new URL("https://api.bilibili.com/x/relation/followings");
    url.searchParams.append("vmid", vmid.toString());
    url.searchParams.append("ps", ps.toString());
    url.searchParams.append("pn", pn.toString());

    GM_xmlhttpRequest({
      method: "GET",
      url: url.toString(),
      onload: (response) => {
        try {
          const data: FansResponse = JSON.parse(response.responseText);
          if (data.code === 0) {
            resolve(data);
          } else {
            reject(new Error(data.message || "请求失败"));
          }
        } catch (error) {
          reject(new Error("解析响应失败"));
        }
      },
      onerror: (error) => {
        reject(new Error("网络请求失败"));
      },
    });
  });
};

/** 共同关注返回结果（带缓存标记） */
export interface CommonFollowingsResult {
  response: CommonFollowingsResponse;  // 改名为 response，避免与 response.data 混淆
  fromCache: boolean;
}

/**
 * 获取共同关注列表
 * 使用缓存机制，避免重复请求
 * 返回结果包含 fromCache 标记，用于优化后续处理
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
      console.log(`从缓存加载共同关注 (mid: ${vmid})`);
      return { response: cached, fromCache: true };
    }
  }

  // 缓存未命中，发起请求
  return new Promise((resolve, reject) => {
    const url = new URL(
      "https://api.bilibili.com/x/relation/followings/followed_upper",
    );
    url.searchParams.append("vmid", vmid.toString());

    GM_xmlhttpRequest({
      method: "GET",
      url: url.toString(),
      onload: (response) => {
        try {
          const data: CommonFollowingsResponse = JSON.parse(
            response.responseText,
          );
          if (data.code === 0) {
            // 存入缓存
            cacheManager.set(cacheKey, data);
            console.log(`API 请求共同关注 (mid: ${vmid}), 已缓存`);
            resolve({ response: data, fromCache: false });
          } else {
            reject(new Error(data.message || "请求失败"));
          }
        } catch (error) {
          reject(new Error("解析响应失败"));
        }
      },
      onerror: (error) => {
        reject(new Error("网络请求失败"));
      },
    });
  });
};

