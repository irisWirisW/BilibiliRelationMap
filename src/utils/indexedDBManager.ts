/**
 * IndexedDB 管理工具
 * 使用 idb 库提供的 Promise API
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";
import logger from "./logger";

interface CacheItem<T> {
  data: T;
  expiry: number; // 过期时间戳
}

interface BilibiliDB extends DBSchema {
  cache: {
    key: string;
    value: CacheItem<any>;
  };
}

interface IndexedDBConfig {
  expiryDays: number; // 过期天数，默认 30 天
}

const DEFAULT_CONFIG: IndexedDBConfig = {
  expiryDays: 30, // 30天（1个月）
};

class IndexedDBManager {
  private dbName = "bilibili_helper_db";
  private storeName = "cache";
  private version = 1;
  private config: IndexedDBConfig;
  private dbPromise: Promise<IDBPDatabase<BilibiliDB>> | null = null;

  constructor(config: Partial<IndexedDBConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化数据库连接
   */
  private async getDB(): Promise<IDBPDatabase<BilibiliDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<BilibiliDB>(this.dbName, this.version, {
        upgrade(db) {
          // 创建 object store
          if (!db.objectStoreNames.contains("cache")) {
            db.createObjectStore("cache");
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * 设置缓存
   */
  async set<T>(key: string, data: T): Promise<void> {
    try {
      const db = await this.getDB();
      const expiry = Date.now() + this.config.expiryDays * 24 * 60 * 60 * 1000;
      const cacheItem: CacheItem<T> = { data, expiry };
      await db.put("cache", cacheItem, key);
    } catch (error) {
      logger.error("IndexedDB 写入失败:", error);
      throw error;
    }
  }

  /**
   * 获取缓存
   * 如果缓存不存在或已过期，返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      const cacheItem = await db.get("cache", key);

      if (!cacheItem) return null;

      // 检查是否过期
      if (Date.now() > cacheItem.expiry) {
        await this.remove(key);
        return null;
      }

      return cacheItem.data as T;
    } catch (error) {
      logger.error("IndexedDB 读取失败:", error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async remove(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete("cache", key);
    } catch (error) {
      logger.error("IndexedDB 删除失败:", error);
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    try {
      const db = await this.getDB();
      await db.clear("cache");
    } catch (error) {
      logger.error("IndexedDB 清除失败:", error);
    }
  }

  /**
   * 获取所有键
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.getDB();
      const keys = await db.getAllKeys("cache");
      return keys as string[];
    } catch (error) {
      logger.error("IndexedDB 获取键列表失败:", error);
      return [];
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<IndexedDBConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 导出单例
export const indexedDBManager = new IndexedDBManager();
