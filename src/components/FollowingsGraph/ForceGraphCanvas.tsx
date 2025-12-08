import React, { useRef, useEffect } from "react";
import ForceGraph from "force-graph";
import { GraphNode, GraphLink, DebugParams } from "./types";
import {
  applyForceGraphConfig,
  NODE_COLOR_NORMAL,
  NODE_COLOR_VIP,
} from "./forceGraphConfig";

interface ForceGraphCanvasProps {
  graphData: { nodes: GraphNode[]; links: GraphLink[] } | null;
  debugParams: DebugParams;
  onGraphReady?: (graph: ForceGraph) => void;
}

/**
 * ForceGraphCanvas 组件
 * 负责渲染 force-graph 图形
 */
const ForceGraphCanvas: React.FC<ForceGraphCanvasProps> = ({
  graphData,
  debugParams,
  onGraphReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph | null>(null);
  const hoveredNodeRef = useRef<GraphNode | null>(null);

  // 初始化 force-graph 实例
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new ForceGraph(containerRef.current)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight);

    // 应用初始配置
    applyForceGraphConfig(graph, debugParams);

    // 设置交互事件
    graph
      .onNodeHover((node: any | null) => {
        hoveredNodeRef.current = node;

        if (node) {
          // 高亮当前节点和邻居节点
          const neighbors = new Set<string>();
          const graphData = graphRef.current?.graphData();

          graphData?.links.forEach((link: any) => {
            // force-graph 会将 source 和 target 转换为对象引用
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;

            if (sourceId === node.id) neighbors.add(targetId);
            if (targetId === node.id) neighbors.add(sourceId);
          });

          // 使用 nodeCanvasObject 来控制节点透明度
          graph.nodeCanvasObject((n: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            // 绘制默认节点（圆形）
            const size = n.val || 4;
            const isHighlighted = n.id === node.id || neighbors.has(n.id);

            ctx.beginPath();
            ctx.arc(n.x, n.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = n.color || NODE_COLOR_NORMAL;
            ctx.globalAlpha = isHighlighted ? 1 : 0.2;
            ctx.fill();
            ctx.globalAlpha = 1;
          });
        } else {
          // 恢复默认渲染（移除自定义渲染）
          graph.nodeCanvasObject(null as any);
        }
      })
      .onNodeClick((node: any) => {
        if (node) {
          window.open(`https://space.bilibili.com/${node.id}`, "_blank");
        }
      });

    graphRef.current = graph;

    // 通知父组件图形已就绪
    if (onGraphReady) {
      onGraphReady(graph);
    }

    // 响应容器大小变化
    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // 清理 force-graph 实例
      if (graphRef.current) {
        graphRef.current._destructor();
      }
    };
  }, []);

  // 当数据变化时更新图形
  useEffect(() => {
    if (!graphRef.current || !graphData) return;

    console.log(
      `更新 force-graph: ${graphData.nodes.length} 个节点, ${graphData.links.length} 条边`,
    );

    // 处理链接方向交换
    const processedLinks = debugParams.swapLinkDirection
      ? graphData.links.map((link) => ({
        ...link,
        source: link.target,
        target: link.source,
      }))
      : graphData.links;

    graphRef.current.graphData({
      nodes: [...graphData.nodes],
      links: processedLinks.map((link) => ({ ...link })),
    });
  }, [graphData, debugParams.swapLinkDirection]);

  // 当调试参数变化时更新配置
  useEffect(() => {
    if (!graphRef.current) return;

    applyForceGraphConfig(graphRef.current, debugParams);

    // 如果数据已加载，重新应用数据以触发渲染更新
    if (graphData) {
      const processedLinks = debugParams.swapLinkDirection
        ? graphData.links.map((link) => ({
          ...link,
          source: link.target,
          target: link.source,
        }))
        : graphData.links;

      graphRef.current.graphData({
        nodes: [...graphData.nodes],
        links: processedLinks.map((link) => ({ ...link })),
      });
    }
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
          backgroundColor: "#1a1a1a",
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
            color: "#ccc",
            padding: "20px",
            borderRadius: "8px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
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
            <div>👆 悬停节点：高亮显示节点及其邻居</div>
          </div>
        </div>
      )}
    </>
  );
};

export default ForceGraphCanvas;
