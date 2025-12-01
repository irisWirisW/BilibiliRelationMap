import { useMemo, useState, useEffect } from "react";
import { FansItem } from "../../types/bilibili";
import { GraphNode, GraphLink, GraphStats, DebugParams } from "./types";
import {
  NODE_COLOR_VIP,
  NODE_COLOR_NORMAL,
  LINK_COLOR_BIDIRECTIONAL,
} from "./graphConfig";

/**
 * 数据转换 Hook
 * 负责将 B站 API 数据转换为图形数据结构
 */
export const useGraphTransform = (
  followingsList: FansItem[],
  commonFollowingsMap: Map<number, number[]>,
  debugParams: DebugParams,
  dataLoaded: boolean,
) => {
  const [nodeDegreeMap, setNodeDegreeMap] = useState<Map<string, number>>(
    new Map(),
  );
  const [stats, setStats] = useState<GraphStats>({
    total: 0,
    connected: 0,
    links: 0,
  });

  // 使用 useMemo 缓存转换后的数据
  const graphData = useMemo(() => {
    if (!dataLoaded || followingsList.length === 0) {
      return null;
    }

    // 1. 生成所有节点（将 mid 转为 string），并去重
    const uniqueNodesMap = new Map<string, GraphNode>();

    followingsList.forEach((user) => {
      const id = user.mid.toString();
      if (!uniqueNodesMap.has(id)) {
        uniqueNodesMap.set(id, {
          id: id,
          label: user.uname,
          color: user.vip.vipStatus ? NODE_COLOR_VIP : NODE_COLOR_NORMAL,
          size: 1,
        });
      }
    });

    const allNodes = Array.from(uniqueNodesMap.values());

    // 2. 生成边，并检测双向关注
    const links: GraphLink[] = [];
    const linkSet = new Set<string>(); // "source-target"
    const followingMidSet = new Set(allNodes.map((n) => parseInt(n.id)));

    // 第一步：收集所有边关系（用于检测双向）
    const edgeMap = new Map<string, { source: string; target: string }>();

    allNodes.forEach((node) => {
      const mid = parseInt(node.id);
      const commonMids = commonFollowingsMap.get(mid);
      if (!commonMids) return;

      commonMids.forEach((commonMid) => {
        // 如果这个共同关注也在我的关注列表中
        if (followingMidSet.has(commonMid)) {
          const source = node.id;
          const target = commonMid.toString();
          const linkKey = `${source}-${target}`;

          if (!linkSet.has(linkKey)) {
            edgeMap.set(linkKey, { source, target });
            linkSet.add(linkKey);
          }
        }
      });
    });

    // 第二步：检测双向关注并设置颜色
    const bidirectionalSet = new Set<string>(); // 存储双向关注的边

    edgeMap.forEach((edge, key) => {
      const reverseKey = `${edge.target}-${edge.source}`;
      // 如果反向边也存在，说明是双向关注
      if (edgeMap.has(reverseKey)) {
        bidirectionalSet.add(key);
        bidirectionalSet.add(reverseKey);
      }
    });

    // 第三步：生成最终的边列表，并根据是否双向设置颜色
    edgeMap.forEach((edge, key) => {
      const isBidirectional = bidirectionalSet.has(key);

      if (debugParams.swapLinkDirection) {
        links.push({
          source: edge.target,
          target: edge.source,
          color: isBidirectional ? LINK_COLOR_BIDIRECTIONAL : undefined,
        });
      } else {
        links.push({
          source: edge.source,
          target: edge.target,
          color: isBidirectional ? LINK_COLOR_BIDIRECTIONAL : undefined,
        });
      }
    });

    // 3. 过滤孤立节点（没有任何连接的节点）
    const connectedNodeIds = new Set<string>();
    links.forEach((link) => {
      connectedNodeIds.add(link.source);
      connectedNodeIds.add(link.target);
    });

    const filteredNodes = allNodes.filter((node) =>
      connectedNodeIds.has(node.id),
    );

    // 4. 计算节点度数（连接数）并设置动态大小
    const nodeDegree = new Map<string, number>();
    links.forEach((link) => {
      nodeDegree.set(link.source, (nodeDegree.get(link.source) || 0) + 1);
      nodeDegree.set(link.target, (nodeDegree.get(link.target) || 0) + 1);
    });

    // 设置节点大小：使用对数增长 + 最大值限制
    filteredNodes.forEach((node) => {
      const degree = nodeDegree.get(node.id) || 1;
      const baseSize = Math.log(degree + 1) * debugParams.nodeSizeMultiplier;
      node.size = Math.min(baseSize, debugParams.nodeMaxSize);
    });

    // 5. 更新统计信息和节点度数
    setNodeDegreeMap(nodeDegree);
    setStats({
      total: allNodes.length,
      connected: filteredNodes.length,
      links: links.length,
    });

    console.log(`过滤前: ${allNodes.length} 个节点`);
    console.log(`过滤后: ${filteredNodes.length} 个节点（有关系）`);
    console.log(`孤立节点: ${allNodes.length - filteredNodes.length} 个`);
    console.log(`共 ${links.length} 条边`);

    return { nodes: filteredNodes, links };
  }, [followingsList, commonFollowingsMap, debugParams.swapLinkDirection, debugParams.nodeSizeMultiplier, debugParams.nodeMaxSize, dataLoaded]);

  return {
    graphData,
    nodeDegreeMap,
    stats,
  };
};
