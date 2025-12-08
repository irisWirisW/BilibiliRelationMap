import React, { useEffect, useState } from "react";
import { message as antdMessage } from "antd";
import { migrationTool } from "../utils/migrationTool";
import logger from "../utils/logger";

/**
 * StorageMigrator 组件
 * 负责在应用启动时自动迁移 localStorage 数据到 IndexedDB
 */
const StorageMigrator: React.FC = () => {
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    const performMigration = async () => {
      // 检查是否已经迁移过
      if (migrationTool.isMigrationCompleted()) {
        logger.log("数据迁移已完成，跳过");
        setMigrated(true);
        return;
      }

      try {
        logger.log("开始自动迁移 localStorage 到 IndexedDB...");
        const stats = await migrationTool.migrate();

        if (stats.migrated > 0) {
          antdMessage.success(
            `成功迁移 ${stats.migrated} 个缓存项到 IndexedDB`,
            3,
          );
          logger.log("迁移统计:", stats);
        }

        if (stats.failed > 0) {
          logger.warn(`迁移失败项数: ${stats.failed}`, stats.errors);
        }

        setMigrated(true);
      } catch (error) {
        logger.error("迁移过程出错:", error);
        antdMessage.error("数据迁移失败，将继续使用 localStorage");
      }
    };

    performMigration();
  }, []);

  // 不渲染任何 UI，纯后台迁移
  return null;
};

export default StorageMigrator;
