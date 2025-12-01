/**
 * 图形相关的类型定义
 */

export interface GraphNode {
  id: string; // Cosmograph requires string IDs
  label?: string;
  color?: string;
  size?: number;
}

export interface GraphLink {
  source: string; // Must match node ID type
  target: string;
  color?: string; // 添加颜色属性用于双向关注
}

export interface DebugParams {
  nodeSizeMultiplier: number;
  nodeSizeScale: number;
  nodeMaxSize: number;
  linkWidth: number;
  // 模拟参数
  gravity: number;
  repulsion: number;
  repulsionTheta: number;
  linkSpring: number;
  linkDistance: number;
  friction: number;
  // UI 参数
  showDynamicLabels: boolean;
  curvedLinks: boolean;
  swapLinkDirection: boolean;
}

export interface GraphStats {
  total: number;
  connected: number;
  links: number;
}
