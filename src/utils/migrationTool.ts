/**
 * localStorage 到 IndexedDB 迁移工具
 * 将现有的 localStorage 数据复制到 IndexedDB，但不删除 localStorage
 */

import { indexedDBManager } from "./indexedDBManager";
import logger from "./logger";

interface MigrationStats {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: string[];
}

interface CacheItem<T> {
  data: T;
  expiry: number;
}

class MigrationTool {
  private prefix = "bilibili_helper_";
  private migrationKey = "bilibili_helper_migration_completed";

  /**
   * 检查是否已经迁移过
   */
  isMigrationCompleted(): boolean {
    try {
      const completed = localStorage.getItem(this.migrationKey);
      return completed === "true";
    } catch {
      return false;
    }
  }

  /**
   * 标记迁移完成
   */
  private markMigrationCompleted(): void {
    try {
      localStorage.setItem(this.migrationKey, "true");
    } catch (error) {
      logger.error("无法标记迁移状态:", error);
    }
  }

  /**
   * 执行迁移
   * @param force 是否强制重新迁移（即使之前已迁移）
   */
  async migrate(force: boolean = false): Promise<MigrationStats> {
    const stats: MigrationStats = {
      total: 0,
      migrated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    // 检查是否需要迁移
    if (!force && this.isMigrationCompleted()) {
      logger.log("迁移已完成，跳过");
      return stats;
    }

    logger.log("开始迁移 localStorage 到 IndexedDB...");

    try {
      // 获取所有以 prefix 开头的 localStorage 键
      const keys = Object.keys(localStorage).filter(
        (key) => key.startsWith(this.prefix) && key !== this.migrationKey,
      );

      stats.total = keys.length;
      logger.log(`发现 ${stats.total} 个待迁移项`);

      for (const fullKey of keys) {
        try {
          const item = localStorage.getItem(fullKey);
          if (!item) {
            stats.skipped++;
            continue;
          }

          // 解析数据
          const cacheItem: CacheItem<any> = JSON.parse(item);

          // 检查是否已过期
          if (Date.now() > cacheItem.expiry) {
            logger.log(`跳过过期项: ${fullKey}`);
            stats.skipped++;
            continue;
          }

          // 获取不带前缀的键名
          const key = fullKey.substring(this.prefix.length);

          // 写入 IndexedDB
          await indexedDBManager.set(key, cacheItem.data);

          stats.migrated++;
          logger.log(`已迁移: ${key}`);
        } catch (error) {
          stats.failed++;
          const errorMsg = `迁移失败 ${fullKey}: ${error instanceof Error ? error.message : String(error)}`;
          stats.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      // 标记迁移完成
      if (!force) {
        this.markMigrationCompleted();
      }

      logger.log("迁移完成:", stats);
      return stats;
    } catch (error) {
      logger.error("迁移过程出错:", error);
      stats.errors.push(
        `总体错误: ${error instanceof Error ? error.message : String(error)}`,
      );
      return stats;
    }
  }

  /**
   * 重置迁移状态（用于调试）
   */
  resetMigrationStatus(): void {
    try {
      localStorage.removeItem(this.migrationKey);
      logger.log("迁移状态已重置");
    } catch (error) {
      logger.error("重置迁移状态失败:", error);
    }
  }
}

// 导出单例
export const migrationTool = new MigrationTool();
