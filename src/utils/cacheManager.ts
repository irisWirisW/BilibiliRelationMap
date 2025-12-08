/**
 * 缓存管理工具
 * 支持 IndexedDB（优先）和 localStorage（降级）双存储
 */

import { indexedDBManager } from "./indexedDBManager";
import logger from "./logger";

interface CacheItem<T> {
  data: T;
  expiry: number; // 过期时间戳
}

type StorageType = "localStorage" | "indexedDB" | "auto";

interface CacheConfig {
  expiryDays: number; // 过期天数，默认 30 天
  storage: StorageType; // 存储类型
}

const DEFAULT_CONFIG: CacheConfig = {
  expiryDays: 30, // 30天（1个月）
  storage: "auto", // 自动选择：优先 IndexedDB，降级到 localStorage
};

class CacheManager {
  private prefix = "bilibili_helper_";
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 设置缓存（异步版本，支持 IndexedDB）
   */
  async setAsync<T>(key: string, data: T): Promise<void> {
    const storage = this.config.storage;

    // IndexedDB 优先
    if (storage === "indexedDB" || storage === "auto") {
      try {
        await indexedDBManager.set(key, data);
        return;
      } catch (error) {
        logger.warn("IndexedDB 写入失败，降级到 localStorage:", error);
        if (storage === "indexedDB") {
          throw error; // 如果明确指定只用 IndexedDB，则抛出错误
        }
      }
    }

    // localStorage 降级
    this.setSync(key, data);
  }

  /**
   * 设置缓存（同步版本，仅 localStorage）
   */
  set<T>(key: string, data: T): void {
    this.setSync(key, data);
  }

  /**
   * 内部同步设置方法
   */
  private setSync<T>(key: string, data: T): void {
    const expiry = Date.now() + this.config.expiryDays * 24 * 60 * 60 * 1000;
    const cacheItem: CacheItem<T> = { data, expiry };

    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(cacheItem));
    } catch (error) {
      logger.error("localStorage 写入失败:", error);
    }
  }

  /**
   * 获取缓存（异步版本，支持 IndexedDB）
   */
  async getAsync<T>(key: string): Promise<T | null> {
    const storage = this.config.storage;

    // IndexedDB 优先
    if (storage === "indexedDB" || storage === "auto") {
      try {
        const data = await indexedDBManager.get<T>(key);
        if (data !== null) {
          return data;
        }
        // IndexedDB 中没有，继续尝试 localStorage（可能是旧数据）
      } catch (error) {
        logger.warn("IndexedDB 读取失败，降级到 localStorage:", error);
      }
    }

    // localStorage 降级或备份读取
    if (storage === "localStorage" || storage === "auto") {
      return this.getSync<T>(key);
    }

    return null;
  }

  /**
   * 获取缓存（同步版本，仅 localStorage）
   */
  get<T>(key: string): T | null {
    return this.getSync<T>(key);
  }

  /**
   * 内部同步获取方法
   */
  private getSync<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const cacheItem: CacheItem<T> = JSON.parse(item);

      // 检查是否过期
      if (Date.now() > cacheItem.expiry) {
        this.remove(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      logger.error("localStorage 读取失败:", error);
      return null;
    }
  }

  /**
   * 删除缓存（同时删除两个存储）
   */
  async removeAsync(key: string): Promise<void> {
    try {
      await indexedDBManager.remove(key);
    } catch (error) {
      logger.warn("IndexedDB 删除失败:", error);
    }
    this.remove(key);
  }

  /**
   * 删除缓存（同步版本，仅 localStorage）
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      logger.error("localStorage 删除失败:", error);
    }
  }

  /**
   * 清除所有缓存（同时清除两个存储）
   */
  async clearAsync(): Promise<void> {
    try {
      await indexedDBManager.clear();
    } catch (error) {
      logger.warn("IndexedDB 清除失败:", error);
    }
    this.clear();
  }

  /**
   * 清除所有缓存（同步版本，仅 localStorage）
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      logger.error("localStorage 清除失败:", error);
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 导出单例
export const cacheManager = new CacheManager();
