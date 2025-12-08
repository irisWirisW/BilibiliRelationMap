import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import logger from "./utils/logger";

// 等待 DOM 加载完成
const init = () => {
  // 创建容器元素
  const container = document.createElement("div");
  container.id = "react-userscript-root";
  document.body.appendChild(container);

  // 渲染 React 应用
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  logger.log("[React Userscript] 脚本已加载");
};

// 确保 DOM 已经加载完成
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
