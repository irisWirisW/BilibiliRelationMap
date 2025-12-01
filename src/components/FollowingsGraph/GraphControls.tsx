import React from "react";
import { Button, Space } from "antd";
import {
  ReloadOutlined,
  ZoomInOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { GraphStats } from "./types";
import { NODE_COLOR_NORMAL, NODE_COLOR_VIP } from "./graphConfig";

interface GraphControlsProps {
  loading: boolean;
  dataLoaded: boolean;
  stats: GraphStats;
  debugMode: boolean;
  onLoadData: () => void;
  onResetView: () => void;
  onToggleDebug: () => void;
}

/**
 * GraphControls 组件
 * 负责图形的控制按钮和统计信息显示
 */
const GraphControls: React.FC<GraphControlsProps> = ({
  loading,
  dataLoaded,
  stats,
  debugMode,
  onLoadData,
  onResetView,
  onToggleDebug,
}) => {
  return (
    <div
      style={{
        padding: "12px",
        borderBottom: "1px solid #f0f0f0",
        backgroundColor: "#fafafa",
      }}
    >
      <Space>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={onLoadData}
          loading={loading}
          disabled={loading}
        >
          {dataLoaded ? "重新加载数据" : "加载关注网络"}
        </Button>
        <Button
          icon={<ZoomInOutlined />}
          onClick={onResetView}
          disabled={!dataLoaded || loading}
        >
          重置视图
        </Button>
        <Button
          icon={<SettingOutlined />}
          onClick={onToggleDebug}
          type={debugMode ? "primary" : "default"}
        >
          调试参数
        </Button>
        {dataLoaded && (
          <Space split="|" style={{ color: "#666", fontSize: "13px" }}>
            <span>总关注: {stats.total}</span>
            <span style={{ color: NODE_COLOR_NORMAL, fontWeight: "bold" }}>
              有关系: {stats.connected}
            </span>
            <span style={{ color: "#999" }}>
              孤立: {stats.total - stats.connected}
            </span>
            <span style={{ color: NODE_COLOR_VIP }}>关系: {stats.links}</span>
          </Space>
        )}
      </Space>
    </div>
  );
};

export default GraphControls;
