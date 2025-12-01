import { GraphNode, GraphLink, DebugParams } from "./types";

/**
 * 图形渲染相关的配置常量
 */

// 节点颜色常量
export const NODE_COLOR_VIP = "#ff4080b2"; // 大会员节点颜色（亮粉色）
export const NODE_COLOR_NORMAL = "#00e1ffb0"; // 普通用户节点颜色（亮青色）

// 连线颜色常量
export const LINK_COLOR_BIDIRECTIONAL = "#FFD700"; // 双向关注连线颜色（金色）
export const LINK_COLOR_NORMAL = "#00D9FF"; // 单向关注连线颜色（亮青色）

// 默认调试参数
export const DEFAULT_DEBUG_PARAMS: DebugParams = {
  nodeSizeMultiplier: 0.1,
  nodeSizeScale: 0.5,
  nodeMaxSize: 2,
  linkWidth: 1.3,
  // 模拟参数 - 使用官方文档建议的默认值
  gravity: 0.67,
  repulsion: 2,
  repulsionTheta: 1.7,
  linkSpring: 0.37,
  linkDistance: 2,
  friction: 1,
  // UI 参数
  showDynamicLabels: true,
  curvedLinks: false,
  swapLinkDirection: true,
};

// Cosmograph 基础配置
export const getCosmographConfig = (params: DebugParams) => ({
  // 节点配置
  nodeColor: (node: GraphNode) => {
    return node.color === "#FB7299" ? NODE_COLOR_VIP : NODE_COLOR_NORMAL;
  },
  nodeSizeScale: params.nodeSizeScale,
  nodeGreyoutOpacity: 0.05,

  // 边配置
  linkWidth: params.linkWidth,
  linkColor: (link: GraphLink) => {
    return link.color || LINK_COLOR_NORMAL;
  },
  linkArrows: true,
  linkArrowsSizeScale: 1.5,
  linkGreyoutOpacity: 0.05,
  linkVisibilityDistanceRange: [100, 300] as [number, number],

  // 曲线链接
  curvedLinks: params.curvedLinks,
  curvedLinkWeight: 0.8,
  curvedLinkSegments: 19,
  curvedLinkControlPointDistance: 0.5,

  // 标签配置
  nodeLabelAccessor: (node: GraphNode) => node.label || node.id,
  nodeLabelColor: "#ffffff",
  showDynamicLabels: params.showDynamicLabels,
  showHoveredNodeLabel: true,

  // 布局配置
  simulation: {
    gravity: params.gravity,
    repulsion: params.repulsion,
    repulsionTheta: params.repulsionTheta,
    linkSpring: params.linkSpring,
    linkDistance: params.linkDistance,
    friction: params.friction,
    decay: 1000,
  },

  // 渲染配置
  pixelRatio: 2,
  backgroundColor: "#000000",
  spaceSize: 8192,
});
