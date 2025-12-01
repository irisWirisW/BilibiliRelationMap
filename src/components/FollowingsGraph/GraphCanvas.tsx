import React, { useRef, useEffect } from "react";
import { Cosmograph } from "@cosmograph/cosmograph";
import { GraphNode, GraphLink, DebugParams } from "./types";
import { getCosmographConfig, NODE_COLOR_NORMAL, NODE_COLOR_VIP } from "./graphConfig";

interface GraphCanvasProps {
  graphData: { nodes: GraphNode[]; links: GraphLink[] } | null;
  debugParams: DebugParams;
  onGraphReady?: (graph: Cosmograph<GraphNode, GraphLink>) => void;
}

/**
 * GraphCanvas 组件
 * 负责渲染 Cosmograph 图形
 */
const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graphData,
  debugParams,
  onGraphReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Cosmograph<GraphNode, GraphLink> | null>(null);

  // 初始化 Cosmograph 实例
  useEffect(() => {
    if (!containerRef.current) return;

    const config = getCosmographConfig(debugParams);

    const graph = new Cosmograph(containerRef.current, {
      ...config,
      // Hover 高亮 - 鼠标悬停时选中节点及邻居
      onNodeMouseOver: (node: GraphNode | undefined) => {
        if (node && graphRef.current) {
          graphRef.current.selectNode(node, true);
        }
      },

      // 鼠标移出时恢复
      onNodeMouseOut: () => {
        if (graphRef.current) {
          graphRef.current.unselectNodes();
        }
      },

      // 点击事件
      onClick: (node: GraphNode | undefined) => {
        if (node) {
          window.open(`https://space.bilibili.com/${node.id}`, "_blank");
        }
      },
    });

    graphRef.current = graph;

    // 通知父组件图形已就绪
    if (onGraphReady) {
      onGraphReady(graph);
    }

    return () => {
      // Cosmograph 使用 remove 方法而不是 destroy
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  // 当数据或参数变化时更新图形
  useEffect(() => {
    if (!graphRef.current || !graphData) return;

    console.log(
      `更新网络图: ${graphData.nodes.length} 个节点, ${graphData.links.length} 条边`,
    );

    graphRef.current.setData(graphData.nodes, graphData.links);
  }, [graphData]);

  // 当调试参数变化时更新配置
  useEffect(() => {
    if (!graphRef.current) return;

    const config = getCosmographConfig(debugParams);

    graphRef.current.setConfig({
      ...config,
      // 重新绑定事件处理函数
      onNodeMouseOver: (node: GraphNode | undefined) => {
        if (node && graphRef.current) {
          graphRef.current.selectNode(node, true);
        }
      },
      onNodeMouseOut: () => {
        if (graphRef.current) {
          graphRef.current.unselectNodes();
        }
      },
      onClick: (node: GraphNode | undefined) => {
        if (node) {
          window.open(`https://space.bilibili.com/${node.id}`, "_blank");
        }
      },
    });
  }, [debugParams]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          border: "1px solid #f0f0f0",
          borderRadius: "4px",
        }}
      />

      {!graphData && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            color: "#999",
            padding: "20px",
            borderRadius: "8px",
            backgroundColor: "#f5f5f5",
          }}
        >
          <p style={{ fontSize: "14px", marginBottom: "16px" }}>
            点击"加载关注网络"按钮开始
          </p>
          <div
            style={{ fontSize: "12px", lineHeight: "1.8", textAlign: "left" }}
          >
            <div>🌑 黑色背景（暗色主题）</div>
            <div>
              🔵{" "}
              <span style={{ color: NODE_COLOR_NORMAL, fontWeight: "bold" }}>
                亮青色节点
              </span>
              ：普通用户
            </div>
            <div>
              🔴{" "}
              <span style={{ color: NODE_COLOR_VIP, fontWeight: "bold" }}>
                亮粉色节点
              </span>
              ：大会员用户
            </div>
            <div>📏 节点大小：根据关注关系数量动态调整</div>
            <div>→ 箭头：关注关系</div>
            <div>👆 悬停节点：显示用户名</div>
          </div>
        </div>
      )}
    </>
  );
};

export default GraphCanvas;
