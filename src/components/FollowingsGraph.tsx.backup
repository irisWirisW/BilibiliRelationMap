import React, { useRef, useEffect, useState } from "react";
import {
  Spin,
  Button,
  Space,
  Slider,
  InputNumber,
  Card,
  Switch,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  ZoomInOutlined,
  SettingOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Cosmograph } from "@cosmograph/cosmograph";
import { FansItem } from "../types/bilibili";
import {
  getFollowingsList,
  getCurrentUserMid,
  getCommonFollowings,
} from "../services/biliApi";
import { useAppContext } from "../contexts/AppContext";

interface GraphNode {
  id: string; // Cosmograph requires string IDs
  label?: string;
  color?: string;
  size?: number;
}

interface GraphLink {
  source: string; // Must match node ID type
  target: string;
  color?: string; // 添加颜色属性用于双向关注
}

interface DebugParams {
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

// 节点颜色常量
const NODE_COLOR_VIP = "#ff4080b2"; // 大会员节点颜色（亮粉色）
const NODE_COLOR_NORMAL = "#00e1ffb0"; // 普通用户节点颜色（亮青色）

// 连线颜色常量
const LINK_COLOR_BIDIRECTIONAL = "#FFD700"; // 双向关注连线颜色（金色）
const LINK_COLOR_NORMAL = "#00D9FF"; // 单向关注连线颜色（亮青色）

const FollowingsGraph: React.FC = () => {
  const { message } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Cosmograph<GraphNode, GraphLink> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [followingsList, setFollowingsList] = useState<FansItem[]>([]);
  const [commonFollowingsMap, setCommonFollowingsMap] = useState<
    Map<number, number[]>
  >(new Map());
  const [dataLoaded, setDataLoaded] = useState(false);
  const [stats, setStats] = useState({ total: 0, connected: 0, links: 0 });
  const [debugMode, setDebugMode] = useState(false);
  const [debugParams, setDebugParams] = useState<DebugParams>({
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
  });
  const [nodeDegreeMap, setNodeDegreeMap] = useState<Map<string, number>>(
    new Map(),
  );

  // 初始化 Cosmograph 实例
  useEffect(() => {
    if (!containerRef.current) return;

    const config = {
      // 节点配置 - 动态大小将在 setData 时设置
      nodeColor: (node: GraphNode) => {
        // 亮青色（普通用户）和亮粉色（大会员）
        return node.color === "#FB7299" ? NODE_COLOR_VIP : NODE_COLOR_NORMAL;
      },
      nodeSizeScale: debugParams.nodeSizeScale,
      nodeGreyoutOpacity: 0.05, // 强高亮：未选中节点几乎隐藏 (0.15 → 0.05)

      // 边配置 - 完整优化
      linkWidth: debugParams.linkWidth,
      linkColor: (link: GraphLink) => {
        // 双向关注显示金色，单向关注显示亮青色
        return link.color || LINK_COLOR_NORMAL;
      },
      linkArrows: true,
      linkArrowsSizeScale: 1.5,
      linkGreyoutOpacity: 0.05, // 未选中链接几乎隐藏 (0.1 → 0.05)
      linkVisibilityDistanceRange: [100, 300],

      // 曲线链接 - 默认禁用
      curvedLinks: false,
      curvedLinkWeight: 0.8,
      curvedLinkSegments: 19,
      curvedLinkControlPointDistance: 0.5,

      // 标签配置 - 确保显示用户名
      nodeLabelAccessor: (node: GraphNode) => node.label || node.id,
      nodeLabelColor: "#ffffff",
      showDynamicLabels: true,
      showHoveredNodeLabel: true,

      // 布局配置 - 使用官方默认值
      simulation: {
        gravity: 0.67,
        repulsion: 2,
        repulsionTheta: 1.7,
        linkSpring: 0.37,
        linkDistance: 19,
        friction: 1,
        decay: 1000,
      },

      // Hover 高亮 - 鼠标悬停时选中节点及邻居
      onNodeMouseOver: (node: GraphNode | undefined) => {
        if (node && graphRef.current) {
          // 选中悬停节点及其所有相邻节点
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
          // 点击节点跳转用户空间
          window.open(`https://space.bilibili.com/${node.id}`, "_blank");
        }
      },

      // 渲染配置 - 黑色背景
      pixelRatio: 2,
      backgroundColor: "#000000",
      spaceSize: 8192,
    };

    const graph = new Cosmograph(containerRef.current, config);

    graphRef.current = graph;

    return () => {
      // Cosmograph 使用 remove 方法而不是 destroy
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  // 加载所有关注数据
  const loadAllData = async () => {
    setLoading(true);
    setDataLoaded(false);

    try {
      const vmid = getCurrentUserMid();
      if (!vmid) {
        message.error("无法获取用户 ID，请在个人空间页面使用");
        return;
      }

      // 加载所有关注（分页获取）
      message.info("正在加载关注列表...");
      const allFollowings: FansItem[] = [];
      let page = 1;
      const pageSize = 50;

      // 获取第一页以知道总数
      const firstResponse = await getFollowingsList({
        vmid,
        ps: pageSize,
        pn: 1,
      });
      allFollowings.push(...firstResponse.data.list);
      const totalPages = Math.ceil(firstResponse.data.total / pageSize);

      // 获取剩余页
      for (page = 2; page <= totalPages; page++) {
        const response = await getFollowingsList({
          vmid,
          ps: pageSize,
          pn: page,
        });

        // 验证返回数据
        if (response.data?.list && Array.isArray(response.data.list)) {
          allFollowings.push(...response.data.list);
        } else {
          console.warn(`第 ${page} 页数据格式异常，跳过`);
        }

        // 给用户反馈
        if (page % 5 === 0) {
          message.info(
            `已加载 ${allFollowings.length}/${firstResponse.data.total} 个关注`,
          );
        }
      }

      setFollowingsList(allFollowings);
      message.success(`成功加载 ${allFollowings.length} 个关注`);

      // 批量加载共同关注
      message.info("正在加载共同关注数据...");
      await loadCommonFollowingsBatch(allFollowings.map((u) => u.mid));

      setDataLoaded(true);
      message.success("数据加载完成！正在生成网络图...");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 批量加载共同关注
  const loadCommonFollowingsBatch = async (mids: number[]) => {
    const batchSize = 10;
    const delay = 300;
    const map = new Map<number, number[]>();

    for (let i = 0; i < mids.length; i += batchSize) {
      const batch = mids.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (mid) => {
          try {
            const response = await getCommonFollowings(mid);
            const commonMids = response.data.list.map((u) => u.mid);
            map.set(mid, commonMids);
          } catch (error) {
            console.error(`加载共同关注失败 (mid: ${mid})`, error);
            map.set(mid, []);
          }
        }),
      );

      // 更新进度
      if ((i + batchSize) % 50 === 0 || i + batchSize >= mids.length) {
        const progress = Math.min(i + batchSize, mids.length);
        message.info(`共同关注进度: ${progress}/${mids.length}`);
      }

      if (i + batchSize < mids.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    setCommonFollowingsMap(map);
  };

  // 转换数据并更新图形
  useEffect(() => {
    if (!graphRef.current || !dataLoaded || followingsList.length === 0) return;

    const { nodes, links } = transformData();

    console.log(`生成网络图: ${nodes.length} 个节点, ${links.length} 条边`);
    message.info(`生成网络图: ${nodes.length} 个节点, ${links.length} 条边`);

    graphRef.current.setData(nodes, links);
  }, [dataLoaded, followingsList, commonFollowingsMap]);

  // 数据转换
  const transformData = (): { nodes: GraphNode[]; links: GraphLink[] } => {
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
          color: isBidirectional ? LINK_COLOR_BIDIRECTIONAL : undefined, // 金色表示双向关注
        });
      } else {
        links.push({
          source: edge.source,
          target: edge.target,
          color: isBidirectional ? LINK_COLOR_BIDIRECTIONAL : undefined, // 金色表示双向关注
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

    // 保存节点度数供调试面板使用
    setNodeDegreeMap(nodeDegree);

    // 5. 更新统计信息
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
  };

  // 重置视图
  const handleReset = () => {
    if (graphRef.current) {
      graphRef.current.fitView();
    }
  };

  // 更新调试参数
  const updateDebugParam = <K extends keyof DebugParams>(
    key: K,
    value: DebugParams[K],
  ) => {
    setDebugParams((prev) => ({ ...prev, [key]: value }));
  };

  // 应用调试参数
  const applyDebugParams = () => {
    if (!graphRef.current || !dataLoaded) {
      message.warning("请先加载数据");
      return;
    }

    try {
      // 更新配置
      graphRef.current.setConfig({
        // 动态参数 - 节点和连接样式
        nodeSizeScale: debugParams.nodeSizeScale,
        linkWidth: debugParams.linkWidth,

        // 模拟参数 - 使用调试面板的值
        simulationGravity: debugParams.gravity,
        simulationRepulsion: debugParams.repulsion,
        simulationRepulsionTheta: debugParams.repulsionTheta,
        simulationLinkSpring: debugParams.linkSpring,
        simulationLinkDistance: debugParams.linkDistance,
        simulationFriction: debugParams.friction,
        simulationDecay: 1000,

        // 标签和曲线配置
        showDynamicLabels: debugParams.showDynamicLabels,
        curvedLinks: debugParams.curvedLinks,

        // 保持静态配置不被覆盖
        nodeColor: (node: GraphNode) =>
          node.color === "#FB7299" ? NODE_COLOR_VIP : NODE_COLOR_NORMAL,
        nodeGreyoutOpacity: 0.05,
        linkColor: (link: GraphLink) => {
          // 双向关注显示金色，单向关注显示亮青色
          return link.color || LINK_COLOR_NORMAL;
        },
        linkArrows: true,
        linkArrowsSizeScale: 1.5,
        linkGreyoutOpacity: 0.05,
        linkVisibilityDistanceRange: [100, 300],
        curvedLinkWeight: 0.8,
        curvedLinkSegments: 19,
        curvedLinkControlPointDistance: 0.5,
        nodeLabelAccessor: (node: GraphNode) => node.label || node.id,
        nodeLabelColor: "#ffffff",
        showHoveredNodeLabel: true,
        pixelRatio: 2,
        backgroundColor: "#000000",
        spaceSize: 8192,

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

      // 重新计算节点大小
      const { nodes, links } = transformData();
      graphRef.current.setData(nodes, links);

      message.success("参数已应用");
    } catch (error) {
      message.error("应用参数失败");
    }
  };

  // 重置调试参数
  const resetDebugParams = () => {
    setDebugParams({
      nodeSizeMultiplier: 0.3,
      nodeSizeScale: 0.8,
      nodeMaxSize: 2,
      linkWidth: 2.5,
      // 模拟参数 - 官方默认值
      gravity: 0.0,
      repulsion: 0.1,
      repulsionTheta: 1.7,
      linkSpring: 1.0,
      linkDistance: 2,
      friction: 0.85,
      // UI 参数
      showDynamicLabels: true,
      curvedLinks: false,
      swapLinkDirection: true,
    });
    message.info("参数已重置为官方默认值");
  };

  // 导出配置
  const exportConfig = () => {
    try {
      const config = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        params: debugParams,
      };

      const dataStr = JSON.stringify(config, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bilibili-graph-config-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success("配置已导出");
    } catch (error) {
      message.error("导出配置失败");
      console.error("Export error:", error);
    }
  };

  // 导入配置
  const importConfig = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);

        // 验证配置格式
        if (!config.params) {
          throw new Error("无效的配置文件格式");
        }

        const params = config.params;

        // 验证必需的参数
        const requiredParams: (keyof DebugParams)[] = [
          "nodeSizeMultiplier",
          "nodeSizeScale",
          "nodeMaxSize",
          "linkWidth",
          "gravity",
          "repulsion",
          "repulsionTheta",
          "linkSpring",
          "linkDistance",
          "friction",
          "showDynamicLabels",
          "curvedLinks",
          "swapLinkDirection",
        ];

        for (const key of requiredParams) {
          if (params[key] === undefined) {
            throw new Error(`配置文件缺少参数: ${key}`);
          }
        }

        // 验证参数类型
        if (
          typeof params.nodeSizeMultiplier !== "number" ||
          typeof params.nodeSizeScale !== "number" ||
          typeof params.nodeMaxSize !== "number" ||
          typeof params.linkWidth !== "number" ||
          typeof params.gravity !== "number" ||
          typeof params.repulsion !== "number" ||
          typeof params.repulsionTheta !== "number" ||
          typeof params.linkSpring !== "number" ||
          typeof params.linkDistance !== "number" ||
          typeof params.friction !== "number" ||
          typeof params.showDynamicLabels !== "boolean" ||
          typeof params.curvedLinks !== "boolean" ||
          typeof params.swapLinkDirection !== "boolean"
        ) {
          throw new Error("配置文件包含无效的参数类型");
        }

        // 验证参数范围
        if (
          params.nodeSizeMultiplier < 0.1 ||
          params.nodeSizeMultiplier > 2 ||
          params.nodeSizeScale < 0.5 ||
          params.nodeSizeScale > 3 ||
          params.nodeMaxSize < 1 ||
          params.nodeMaxSize > 10 ||
          params.linkWidth < 1 ||
          params.linkWidth > 5 ||
          params.gravity < 0 ||
          params.gravity > 1 ||
          params.repulsion < 0 ||
          params.repulsion > 2 ||
          params.repulsionTheta < 0.3 ||
          params.repulsionTheta > 2 ||
          params.linkSpring < 0 ||
          params.linkSpring > 2 ||
          params.linkDistance < 1 ||
          params.linkDistance > 20 ||
          params.friction < 0.8 ||
          params.friction > 1
        ) {
          throw new Error("配置文件包含超出范围的参数值");
        }

        // 应用配置
        setDebugParams(params);
        message.success("配置已导入");

        // 自动应用参数
        setTimeout(() => {
          applyDebugParams();
        }, 100);
      } catch (error) {
        if (error instanceof SyntaxError) {
          message.error("无效的 JSON 文件");
        } else if (error instanceof Error) {
          message.error(error.message);
        } else {
          message.error("导入配置失败");
        }
        console.error("Import error:", error);
      }
    };

    reader.onerror = () => {
      message.error("读取文件失败");
    };

    reader.readAsText(file);
  };

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importConfig(file);
    }
    // 重置input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 控制按钮 */}
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
            onClick={loadAllData}
            loading={loading}
            disabled={loading}
          >
            {dataLoaded ? "重新加载数据" : "加载关注网络"}
          </Button>
          <Button
            icon={<ZoomInOutlined />}
            onClick={handleReset}
            disabled={!dataLoaded || loading}
          >
            重置视图
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={() => setDebugMode(!debugMode)}
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

      {/* 图形容器 */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.9)",
              zIndex: 10,
            }}
          >
            <Spin size="large" tip="正在加载数据..." />
          </div>
        )}

        {/* 调试面板 */}
        {debugMode && (
          <Card
            title="调试参数"
            extra={
              <Button
                size="small"
                type="text"
                icon={<CloseOutlined />}
                onClick={() => setDebugMode(false)}
              />
            }
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 360,
              maxHeight: "80%",
              overflow: "auto",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {/* Simulation 分组 */}
            <div
              style={{
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 16,
                  color: "#333",
                }}
              >
                Simulation
              </div>

              {/* Gravity */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Space size={4}>
                    <span style={{ fontSize: 12, color: "#666" }}>gravity</span>
                    <Tooltip title="将节点拉向中心的力。值越大节点越聚集在中心。范围: 0.0 - 1.0">
                      <QuestionCircleOutlined
                        style={{ fontSize: 12, color: "#999", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {debugParams.gravity.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={debugParams.gravity}
                  onChange={(v) => updateDebugParam("gravity", v)}
                />
              </div>

              {/* Repulsion */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Space size={4}>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      repulsion
                    </span>
                    <Tooltip title="节点之间的排斥力。值越大节点越分散。范围: 0.0 - 2.0">
                      <QuestionCircleOutlined
                        style={{ fontSize: 12, color: "#999", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {debugParams.repulsion.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={0.01}
                  value={debugParams.repulsion}
                  onChange={(v) => updateDebugParam("repulsion", v)}
                />
              </div>

              {/* Repulsion Theta */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Space size={4}>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      repulsion theta
                    </span>
                    <Tooltip title="斥力计算的精度参数。值越小精度越高但性能越低。范围: 0.3 - 2.0">
                      <QuestionCircleOutlined
                        style={{ fontSize: 12, color: "#999", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {debugParams.repulsionTheta.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0.3}
                  max={2}
                  step={0.01}
                  value={debugParams.repulsionTheta}
                  onChange={(v) => updateDebugParam("repulsionTheta", v)}
                />
              </div>

              {/* Link Strength */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Space size={4}>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      link strength
                    </span>
                    <Tooltip title="连接的弹簧强度。值越大连接越紧密。范围: 0.0 - 2.0">
                      <QuestionCircleOutlined
                        style={{ fontSize: 12, color: "#999", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {debugParams.linkSpring.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={2}
                  step={0.01}
                  value={debugParams.linkSpring}
                  onChange={(v) => updateDebugParam("linkSpring", v)}
                />
              </div>

              {/* Minimum Link Distance */}
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Space size={4}>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      minimum link distance
                    </span>
                    <Tooltip title="连接的理想距离，影响节点之间的间距。范围: 1 - 20">
                      <QuestionCircleOutlined
                        style={{ fontSize: 12, color: "#999", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {debugParams.linkDistance}
                  </span>
                </div>
                <Slider
                  min={1}
                  max={20}
                  step={1}
                  value={debugParams.linkDistance}
                  onChange={(v) => updateDebugParam("linkDistance", v)}
                />
              </div>

              {/* Friction */}
              <div style={{ marginBottom: 0 }}>
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Space size={4}>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      friction
                    </span>
                    <Tooltip title="运动摩擦力。值越大运动越快停止，越小则移动更持久。范围: 0.8 - 1.0">
                      <QuestionCircleOutlined
                        style={{ fontSize: 12, color: "#999", cursor: "help" }}
                      />
                    </Tooltip>
                  </Space>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {debugParams.friction.toFixed(2)}
                  </span>
                </div>
                <Slider
                  min={0.8}
                  max={1}
                  step={0.01}
                  value={debugParams.friction}
                  onChange={(v) => updateDebugParam("friction", v)}
                />
              </div>
            </div>

            {/* 其他参数分组 */}
            <div
              style={{
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 16,
                  color: "#333",
                }}
              >
                节点与连接
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
                  节点大小倍数: {debugParams.nodeSizeMultiplier.toFixed(1)}
                </div>
                <Slider
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={debugParams.nodeSizeMultiplier}
                  onChange={(v) => updateDebugParam("nodeSizeMultiplier", v)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
                  节点缩放系数: {debugParams.nodeSizeScale.toFixed(1)}
                </div>
                <Slider
                  min={0.5}
                  max={3}
                  step={0.1}
                  value={debugParams.nodeSizeScale}
                  onChange={(v) => updateDebugParam("nodeSizeScale", v)}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
                  节点最大值: {debugParams.nodeMaxSize}
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={debugParams.nodeMaxSize}
                  onChange={(v) => updateDebugParam("nodeMaxSize", v)}
                />
              </div>

              <div style={{ marginBottom: 0 }}>
                <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
                  链接宽度: {debugParams.linkWidth.toFixed(1)}
                </div>
                <Slider
                  min={1}
                  max={5}
                  step={0.1}
                  value={debugParams.linkWidth}
                  onChange={(v) => updateDebugParam("linkWidth", v)}
                />
              </div>
            </div>

            {/* 显示选项 */}
            <div
              style={{
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 16,
                  color: "#333",
                }}
              >
                显示选项
              </div>

              <div style={{ marginBottom: 12 }}>
                <Space
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 12, color: "#666" }}>
                    显示动态标签
                  </span>
                  <Switch
                    checked={debugParams.showDynamicLabels}
                    onChange={(v) => updateDebugParam("showDynamicLabels", v)}
                  />
                </Space>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Space
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 12, color: "#666" }}>曲线连接</span>
                  <Switch
                    checked={debugParams.curvedLinks}
                    onChange={(v) => updateDebugParam("curvedLinks", v)}
                  />
                </Space>
              </div>
              <div>
                <Space
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <span style={{ fontSize: 12, color: "#666" }}>
                    反转连线方向
                  </span>
                  <Switch
                    checked={debugParams.swapLinkDirection}
                    onChange={(v) => updateDebugParam("swapLinkDirection", v)}
                  />
                </Space>
              </div>
            </div>

            {/* 隐藏的文件输入 */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />

            {/* 控制按钮 */}
            <Space style={{ width: "100%", marginBottom: 12 }}>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={exportConfig}
                style={{ flex: 1 }}
              >
                导出
              </Button>
              <Button
                size="small"
                icon={<UploadOutlined />}
                onClick={() => fileInputRef.current?.click()}
                style={{ flex: 1 }}
              >
                导入
              </Button>
            </Space>

            <Space style={{ width: "100%", justifyContent: "space-between" }}>
              <Button size="small" onClick={resetDebugParams}>
                重置
              </Button>
              <Button type="primary" size="small" onClick={applyDebugParams}>
                应用
              </Button>
            </Space>
          </Card>
        )}

        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            border: "1px solid #f0f0f0",
            borderRadius: "4px",
          }}
        />

        {!dataLoaded && !loading && (
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
      </div>
    </div>
  );
};

export default FollowingsGraph;
