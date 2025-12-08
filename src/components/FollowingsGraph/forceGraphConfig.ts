/**
 * Force-Graph 配置文件
 * 包含 force-graph 的默认参数和配置函数
 * 参考官方示例优化：https://github.com/vasturiano/force-graph
 */

import ForceGraph from "force-graph";
import * as d3 from "d3-force";
import { DebugParams } from "./types";

// 节点颜色常量（与 Cosmograph 保持一致）
export const NODE_COLOR_NORMAL = "#00d5e9"; // 亮青色 - 普通用户
export const NODE_COLOR_VIP = "#fb7299"; // 粉色 - 大会员
export const LINK_COLOR = "#00d5e9"; // 连接颜色
export const LINK_COLOR_MUTUAL = "#fb7299"; // 双向关注连接颜色

/**
 * 根据 DebugParams 生成 force-graph 配置
 * 借鉴官方示例的最佳实践
 */
export const applyForceGraphConfig = (
  graph: ForceGraph,
  params: DebugParams,
): void => {
  // === 节点样式配置 ===
  graph
    .nodeRelSize(params.nodeSizeMultiplier)
    .nodeVal((node: any) => {
      // 参考官方示例：节点大小可以基于关系层级动态调整
      // nodeVal(node => 100 / (node.level + 1))
      const size = Math.pow(node.size || 1, params.nodeSizeScale);
      return Math.min(size, params.nodeMaxSize);
    })
    .nodeColor((node: any) => node.color || NODE_COLOR_NORMAL)
    .nodeLabel((node: any) => node.label || "");

  // === 连接样式配置 ===
  graph
    .linkWidth(params.linkWidth)
    .linkColor((link: any) => link.color || LINK_COLOR)
    .linkDirectionalArrowLength(6)
    .linkDirectionalArrowRelPos(1)
    .linkCurvature(params.curvedLinks ? 0.2 : 0)
    // 粒子动画：显示关注流向（官方示例特性）
    .linkDirectionalParticles(params.showParticles ? 2 : 0)
    .linkDirectionalParticleWidth(2)
    .linkDirectionalParticleSpeed(0.005);

  // === D3 力导向模拟参数 ===

  // 1. Link Force - 控制连接的弹簧效果
  const d3ForceLink = graph.d3Force("link");
  if (d3ForceLink) {
    d3ForceLink.distance(params.linkDistance * 30).strength(params.linkSpring);
  }

  // 2. Charge Force - 节点间的斥力
  const d3ForceCharge = graph.d3Force("charge");
  if (d3ForceCharge) {
    d3ForceCharge.strength(-params.repulsion * 100);
  }

  // 3. Center Force - 吸引节点到中心
  const d3ForceCenter = graph.d3Force("center");
  if (d3ForceCenter) {
    d3ForceCenter.strength(params.gravity);
  }

  // 4. 碰撞检测力（官方示例特性 - 防止节点重叠）
  if (params.enableCollision) {
    graph.d3Force(
      "collision",
      d3.forceCollide((node: any) => {
        // 基于节点实际大小计算碰撞半径
        const nodeVal = node.val || params.nodeMaxSize;
        return Math.sqrt(nodeVal) * params.nodeSizeMultiplier + 2; // +2 为间隙
      }),
    );
  } else {
    graph.d3Force("collision", null);
  }

  // 5. 速度衰减 - 控制动画阻尼
  graph.d3VelocityDecay(params.friction);

  // === 渲染配置 ===
  graph
    .backgroundColor("#1a1a1a")
    .enableZoomInteraction(true)
    .enablePanInteraction(true)
    // 缩放范围限制
    .minZoom(0.1)
    .maxZoom(10);

  // === DAG 模式（官方示例特性 - 可选）===
  // 如果数据有层级结构，可以启用 DAG 模式
  // graph.dagMode(params.dagMode || null)
  //      .dagLevelDistance(300);
};
