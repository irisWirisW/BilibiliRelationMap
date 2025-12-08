import React from "react";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import DAGGraphView from "./index";

/**
 * DAG Graph 组件演示页面
 * 独立的测试页面，可以直接运行查看效果
 */
const DAGGraphDemo: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
        <DAGGraphView />
      </div>
    </ConfigProvider>
  );
};

export default DAGGraphDemo;
