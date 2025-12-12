import { FansResponse, CommonFollowingsResponse } from "../types/bilibili";
import { cacheManager } from "../utils/cacheManager";
import logger from "../utils/logger";

// ================== 速率限制和重试配置 ==================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

// 请求队列，用于速率限制
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 300; // 最小请求间隔 300ms

/**
 * 延迟函数
 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 计算指数退避延迟时间
 */
const calculateBackoffDelay = (
  attempt: number,
  config: RetryConfig,
): number => {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 添加 30% 随机抖动
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
};

/**
 * 等待速率限制
 */
const waitForRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    await delay(MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
};

// ================== 通用 HTTP 请求层 ==================

interface BiliApiResponse {
  code: number;
  message: string;
  ttl?: number;
  data?: unknown;
}

/**
 * 判断错误是否可重试
 */
const isRetryableError = (error: Error, statusCode?: number): boolean => {
  // HTTP 429 (Too Many Requests) 或 5xx 错误可重试
  if (statusCode && (statusCode === 429 || statusCode >= 500)) {
    return true;
  }
  // 网络错误和超时可重试
  if (
    error.message.includes("网络请求失败") ||
    error.message.includes("请求超时")
  ) {
    return true;
  }
  return false;
};

/**
 * 单次请求执行
 */
const executeRequest = <T extends BiliApiResponse>(
  url: string,
): Promise<{ data: T; status: number }> => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      timeout: 30000,
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          const error = new Error(
            `HTTP 错误: ${response.status} ${response.statusText}`,
          );
          (error as any).statusCode = response.status;
          reject(error);
          return;
        }

        try {
          const data: T = JSON.parse(response.responseText);
          if (data.code === 0) {
            resolve({ data, status: response.status });
          } else if (data.code === -412) {
            // B站风控限制
            const error = new Error("请求被风控限制，请稍后重试");
            (error as any).statusCode = 429;
            reject(error);
          } else {
            reject(new Error(data.message || "请求失败"));
          }
        } catch (e) {
          reject(new Error("响应解析失败"));
        }
      },
      onerror: () => {
        reject(new Error("网络请求失败"));
      },
      ontimeout: () => {
        reject(new Error("请求超时"));
      },
    });
  });
};

/**
 * 通用 API 请求函数（带速率限制和指数退避重试）
 */
const request = async <T extends BiliApiResponse>(
  url: string,
  params?: Record<string, string | number>,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> => {
  const fullUrl = new URL(url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        fullUrl.searchParams.append(key, String(value));
      }
    });
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // 等待速率限制
      await waitForRateLimit();

      const { data } = await executeRequest<T>(fullUrl.toString());
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const statusCode = (error as any)?.statusCode;

      // 如果不可重试或已达最大重试次数，抛出错误
      if (
        !isRetryableError(lastError, statusCode) ||
        attempt === retryConfig.maxRetries
      ) {
        throw lastError;
      }

      // 计算退避延迟并等待
      const backoffDelay = calculateBackoffDelay(attempt, retryConfig);
      logger.warn(
        `请求失败，${Math.round(backoffDelay / 1000)}秒后重试 (${attempt + 1}/${retryConfig.maxRetries}):`,
        lastError.message,
      );
      await delay(backoffDelay);
    }
  }

  throw lastError || new Error("请求失败");
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
