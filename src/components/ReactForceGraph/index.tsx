import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Button,
  Space,
  Card,
  Statistic,
  Row,
  Col,
  Progress,
  Select,
  Slider,
  ColorPicker,
  Input,
  Collapse,
} from "antd";
import type { CollapseProps } from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DisconnectOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import ForceGraph2D, {
  ForceGraphMethods,
  NodeObject,
  LinkObject,
} from "react-force-graph-2d";
import { useAppContext } from "../../contexts/AppContext";
import {
  getCurrentUserMid,
  getCurrentUserMidFromAPI,
  getFollowingsList,
  getCommonFollowings,
} from "../../services/biliApi";
import logger from "../../utils/logger";

// ================== 类型定义 ==================

/** 用户数据 */
interface UserData {
  uid: number;
  uname: string;
  face: string;
  following: number[];
  deepFollowing: number[];
  deepFollower: number[];
}

/** 应用状态 */
interface AppState {
  myUid: number;
  users: Map<number, UserData>;
}

/** 图节点 */
interface GraphNode {
  id: number;
  name: string;
  face: string;
  neighbors?: GraphNode[];
  links?: GraphLink[];
  x?: number;
  y?: number;
}

/** 图边 */
interface GraphLink {
  source: number | GraphNode;
  target: number | GraphNode;
}

/** 加载状态 */
interface LoadingState {
  status:
    | "idle"
    | "loading_followings"
    | "loading_relations"
    | "done"
    | "error";
  current: number;
  total: number;
  currentUser?: string;
  error?: string;
}

type DagMode = "td" | "bu" | "lr" | "rl" | "radialout" | "radialin" | undefined;

type GraphNodeObject = NodeObject<GraphNode>;
type GraphLinkObject = LinkObject<GraphNode, GraphLink>;

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ================== 组件 ==================

const ReactForceGraph: React.FC = () => {
  const { message } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<
    ForceGraphMethods<GraphNodeObject, GraphLinkObject> | undefined
  >(undefined);

  // 数据状态
  const appStateRef = useRef<AppState>({
    myUid: 0,
    users: new Map(),
  });

  // 图数据
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });

  // 加载状态
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: "idle",
    current: 0,
    total: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [dagMode, setDagMode] = useState<DagMode>(undefined);

  // 力引擎参数
  const [alphaDecay, setAlphaDecay] = useState(0.0228);
  const [velocityDecay, setVelocityDecay] = useState(0.4);
  const [particleSpeed, setParticleSpeed] = useState(0.01);
  const [nodeColor, setNodeColor] = useState("#4ecdc4");
  const [nodeRelSize, setNodeRelSize] = useState(4);
  const [linkColor, setLinkColor] = useState("#ffffff40");
  const [linkCurvature, setLinkCurvature] = useState(0);
  const [linkArrowLength, setLinkArrowLength] = useState(0);
  const [chargeStrength, setChargeStrength] = useState(-100);
  const [cooldownTime, setCooldownTime] = useState(15000);

  // 统计信息
  const [stats, setStats] = useState({ nodeCount: 0, linkCount: 0 });

  // 搜索状态
  const [searchValue, setSearchValue] = useState("");
  const searchedNodesRef = useRef<Set<GraphNode>>(new Set());

  // 高亮状态
  const highlightNodesRef = useRef<Set<GraphNode>>(new Set());
  const highlightLinksRef = useRef<Set<GraphLink>>(new Set());
  const hoverNodeRef = useRef<GraphNode | null>(null);

  // 容器尺寸
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 同步暂停状态到 ref
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // 监听容器尺寸变化
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 更新斥力强度
  useEffect(() => {
    if (!graphRef.current) return;
    const fg = graphRef.current;
    fg.d3Force("charge")?.strength(chargeStrength);
    fg.d3ReheatSimulation();
  }, [chargeStrength]);

  /** 向图形添加节点（增量方式） */
  const addNodesToGraph = useCallback((newNodes: GraphNode[]) => {
    setGraphData((prev) => {
      const existingIds = new Set(prev.nodes.map((n) => n.id));
      const uniqueNewNodes = newNodes.filter((n) => !existingIds.has(n.id));

      if (uniqueNewNodes.length === 0) return prev;

      const updatedNodes = [...prev.nodes, ...uniqueNewNodes];
      setStats({
        nodeCount: updatedNodes.length,
        linkCount: prev.links.length,
      });

      return {
        nodes: updatedNodes,
        links: prev.links,
      };
    });
  }, []);

  /** 向图形添加链接（增量方式） */
  const addLinksToGraph = useCallback((newLinks: GraphLink[]) => {
    setGraphData((prev) => {
      const existingLinkSet = new Set<string>();
      prev.links.forEach((l) => {
        const sourceId = typeof l.source === "object" ? l.source.id : l.source;
        const targetId = typeof l.target === "object" ? l.target.id : l.target;
        existingLinkSet.add(`${sourceId}-${targetId}`);
      });

      const uniqueNewLinks = newLinks.filter((link) => {
        const sourceId =
          typeof link.source === "number" ? link.source : link.source.id;
        const targetId =
          typeof link.target === "number" ? link.target : link.target.id;
        return !existingLinkSet.has(`${sourceId}-${targetId}`);
      });

      if (uniqueNewLinks.length === 0) return prev;

      // 建立邻居关系
      const nodeMap = new Map<number, GraphNode>();
      prev.nodes.forEach((node) => nodeMap.set(node.id, node));

      uniqueNewLinks.forEach((link) => {
        const sourceId =
          typeof link.source === "number" ? link.source : link.source.id;
        const targetId =
          typeof link.target === "number" ? link.target : link.target.id;
        const a = nodeMap.get(sourceId);
        const b = nodeMap.get(targetId);

        if (a && b) {
          !a.neighbors && (a.neighbors = []);
          !b.neighbors && (b.neighbors = []);
          a.neighbors.push(b);
          b.neighbors.push(a);

          !a.links && (a.links = []);
          !b.links && (b.links = []);
          a.links.push(link);
          b.links.push(link);
        }
      });

      const updatedLinks = [...prev.links, ...uniqueNewLinks];
      setStats({
        nodeCount: prev.nodes.length,
        linkCount: updatedLinks.length,
      });

      return {
        nodes: prev.nodes,
        links: updatedLinks,
      };
    });
  }, []);

  /** 等待恢复 */
  const waitForResume = (): Promise<void> => {
    return new Promise((resolve) => {
      const check = () => {
        if (!isPausedRef.current) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  };

  /** 加载所有数据 */
  const loadAllData = useCallback(async () => {
    try {
      let myMid = getCurrentUserMid();
      if (!myMid) {
        try {
          myMid = await getCurrentUserMidFromAPI();
        } catch {
          message.error("无法获取用户 ID，请确保已登录");
          setLoadingState({
            status: "error",
            current: 0,
            total: 0,
            error: "未登录",
          });
          return;
        }
      }

      // 重置图形数据
      setGraphData({ nodes: [], links: [] });
      setStats({ nodeCount: 0, linkCount: 0 });

      const users = new Map<number, UserData>();
      appStateRef.current = { myUid: myMid, users };

      users.set(myMid, {
        uid: myMid,
        uname: "我",
        face: "",
        following: [],
        deepFollowing: [],
        deepFollower: [],
      });

      setLoadingState({ status: "loading_followings", current: 0, total: 0 });
      message.info("正在加载关注列表...");

      const myFollowingUids: number[] = [];
      let page = 1;
      const pageSize = 50;

      const firstResponse = await getFollowingsList({
        vmid: myMid,
        ps: pageSize,
        pn: 1,
      });
      const total = firstResponse.data.total;
      const totalPages = Math.ceil(total / pageSize);

      const firstPageNodes: GraphNode[] = [];
      firstResponse.data.list.forEach((item) => {
        myFollowingUids.push(item.mid);
        users.set(item.mid, {
          uid: item.mid,
          uname: item.uname,
          face: item.face,
          following: [],
          deepFollowing: [],
          deepFollower: [],
        });
        firstPageNodes.push({
          id: item.mid,
          name: item.uname,
          face: item.face,
        });
      });

      users.get(myMid)!.following = [...myFollowingUids];
      addNodesToGraph(firstPageNodes);

      setLoadingState({
        status: "loading_followings",
        current: myFollowingUids.length,
        total,
      });

      for (page = 2; page <= totalPages; page++) {
        if (isPausedRef.current) await waitForResume();

        const response = await getFollowingsList({
          vmid: myMid,
          ps: pageSize,
          pn: page,
        });

        const pageNodes: GraphNode[] = [];
        response.data.list.forEach((item) => {
          myFollowingUids.push(item.mid);
          users.set(item.mid, {
            uid: item.mid,
            uname: item.uname,
            face: item.face,
            following: [],
            deepFollowing: [],
            deepFollower: [],
          });
          pageNodes.push({
            id: item.mid,
            name: item.uname,
            face: item.face,
          });
        });

        users.get(myMid)!.following = [...myFollowingUids];
        addNodesToGraph(pageNodes);

        setLoadingState({
          status: "loading_followings",
          current: myFollowingUids.length,
          total,
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      message.success(`成功加载 ${myFollowingUids.length} 个关注`);

      setLoadingState({
        status: "loading_relations",
        current: 0,
        total: myFollowingUids.length,
      });
      message.info("正在加载共同关注数据...");

      const myFollowingSet = new Set(myFollowingUids);

      for (let i = 0; i < myFollowingUids.length; i++) {
        if (isPausedRef.current) await waitForResume();

        const uid = myFollowingUids[i];
        const user = users.get(uid);
        if (!user) continue;

        setLoadingState({
          status: "loading_relations",
          current: i + 1,
          total: myFollowingUids.length,
          currentUser: user.uname,
        });

        try {
          const result = await getCommonFollowings(uid);
          const commonMids = result.response.data.list.map((u) => u.mid);

          user.following = commonMids;

          result.response.data.list.forEach((u) => {
            if (!users.has(u.mid)) {
              users.set(u.mid, {
                uid: u.mid,
                uname: u.uname,
                face: u.face,
                following: [],
                deepFollowing: [],
                deepFollower: [],
              });
            }
          });

          const newLinks: GraphLink[] = [];
          commonMids.forEach((targetId) => {
            if (myFollowingSet.has(targetId)) {
              newLinks.push({ source: targetId, target: uid });
            }
          });

          if (newLinks.length > 0) {
            addLinksToGraph(newLinks);
          }

          await new Promise((resolve) =>
            setTimeout(resolve, result.fromCache ? 10 : 300),
          );
        } catch (error) {
          logger.error(`获取 ${user.uname} 的共同关注失败:`, error);
          user.following = [];
        }
      }

      setLoadingState({
        status: "done",
        current: myFollowingUids.length,
        total: myFollowingUids.length,
      });
      message.success("数据加载完成！");
    } catch (error) {
      logger.error("加载失败:", error);
      message.error(error instanceof Error ? error.message : "加载失败");
      setLoadingState({
        status: "error",
        current: 0,
        total: 0,
        error: String(error),
      });
    }
  }, [message, addNodesToGraph, addLinksToGraph]);

  /** 开始/暂停按钮 */
  const handleStartPause = () => {
    if (
      loadingState.status === "idle" ||
      loadingState.status === "done" ||
      loadingState.status === "error"
    ) {
      setIsPaused(false);
      isPausedRef.current = false;
      loadAllData();
    } else if (isPaused) {
      setIsPaused(false);
      isPausedRef.current = false;
    } else {
      setIsPaused(true);
      isPausedRef.current = true;
    }
  };

  /** 重置视图 */
  const handleResetView = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  /** 移除孤立节点 */
  const handleRemoveIsolatedNodes = () => {
    const { nodes, links } = graphData;

    const connectedNodeIds = new Set<number>();
    links.forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });

    const filteredNodes = nodes.filter((node) => connectedNodeIds.has(node.id));
    const removedCount = nodes.length - filteredNodes.length;

    if (removedCount === 0) {
      message.info("没有孤立节点");
      return;
    }

    setGraphData({
      nodes: filteredNodes,
      links: links,
    });

    setStats({
      nodeCount: filteredNodes.length,
      linkCount: links.length,
    });

    message.success(`已移除 ${removedCount} 个孤立节点`);
  };

  /** 搜索节点 */
  const handleSearch = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      if (!trimmedValue) {
        searchedNodesRef.current.clear();
        return;
      }

      const allNodes = graphData.nodes;
      const searchId = parseInt(trimmedValue, 10);
      let matchedNodes: GraphNode[] = [];

      if (!isNaN(searchId)) {
        const exactMatch = allNodes.find((node) => node.id === searchId);
        if (exactMatch) {
          matchedNodes = [exactMatch];
        }
      }

      if (matchedNodes.length === 0) {
        const lowerValue = trimmedValue.toLowerCase();
        matchedNodes = allNodes.filter((node) =>
          node.name.toLowerCase().includes(lowerValue),
        );
      }

      if (matchedNodes.length > 0) {
        searchedNodesRef.current = new Set(matchedNodes);

        if (matchedNodes.length === 1 && graphRef.current) {
          const foundNode = matchedNodes[0];
          if (foundNode.x !== undefined && foundNode.y !== undefined) {
            graphRef.current.centerAt(foundNode.x, foundNode.y, 500);
            graphRef.current.zoom(2, 500);
          }
        }
        message.success(`找到 ${matchedNodes.length} 个匹配节点`);
      } else {
        searchedNodesRef.current.clear();
        message.warning(`未找到匹配: ${trimmedValue}`);
      }
    },
    [graphData.nodes, message],
  );

  /** 清除搜索高亮 */
  const handleClearSearch = useCallback(() => {
    setSearchValue("");
    searchedNodesRef.current.clear();
  }, []);

  /** 获取按钮文字 */
  const getButtonText = () => {
    if (loadingState.status === "idle") return "开始加载";
    if (loadingState.status === "done") return "重新加载";
    if (loadingState.status === "error") return "重试";
    if (isPaused) return "继续";
    return "暂停";
  };

  /** 获取状态文字 */
  const getStatusText = () => {
    switch (loadingState.status) {
      case "idle":
        return "准备就绪";
      case "loading_followings":
        return `加载关注列表 ${loadingState.current}/${loadingState.total}`;
      case "loading_relations":
        return `加载共同关注 ${loadingState.current}/${loadingState.total}`;
      case "done":
        return "加载完成";
      case "error":
        return `错误: ${loadingState.error}`;
      default:
        return "";
    }
  };

  const isLoading =
    loadingState.status === "loading_followings" ||
    loadingState.status === "loading_relations";
  const progress =
    loadingState.total > 0
      ? Math.round((loadingState.current / loadingState.total) * 100)
      : 0;

  // 节点 hover 处理
  const handleNodeHover = useCallback((node: GraphNode | null) => {
    highlightNodesRef.current.clear();
    highlightLinksRef.current.clear();

    if (node) {
      highlightNodesRef.current.add(node);
      node.neighbors?.forEach((neighbor) =>
        highlightNodesRef.current.add(neighbor),
      );
      node.links?.forEach((link) => highlightLinksRef.current.add(link));
    }

    hoverNodeRef.current = node;
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? "pointer" : "default";
    }
  }, []);

  // 链接 hover 处理
  const handleLinkHover = useCallback((link: GraphLink | null) => {
    highlightNodesRef.current.clear();
    highlightLinksRef.current.clear();

    if (link) {
      highlightLinksRef.current.add(link);
      if (typeof link.source === "object")
        highlightNodesRef.current.add(link.source);
      if (typeof link.target === "object")
        highlightNodesRef.current.add(link.target);
    }
  }, []);

  // 节点点击处理
  const handleNodeClick = useCallback((node: GraphNode) => {
    window.open(`https://space.bilibili.com/${node.id}`, "_blank");
  }, []);

  // 自定义节点绘制
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const NODE_R = 8;
      if (!node.x || !node.y) return;

      // 绘制高亮光环
      if (
        highlightNodesRef.current.has(node) ||
        searchedNodesRef.current.has(node)
      ) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_R * 0.56, 0, 2 * Math.PI, false);
        if (searchedNodesRef.current.has(node)) {
          ctx.fillStyle = "#00ff00";
        } else if (node === hoverNodeRef.current) {
          ctx.fillStyle = "#b535ffb0";
        } else {
          ctx.fillStyle = "#ffd93d";
        }
        ctx.fill();
      }

      // 绘制节点
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRelSize, 0, 2 * Math.PI, false);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // 绘制标签（当缩放足够大时）
      if (globalScale > 2) {
        const label = node.name;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, node.x, node.y + nodeRelSize + fontSize);
      }
    },
    [nodeColor, nodeRelSize],
  );

  // 折叠面板内容
  const collapseItems: CollapseProps["items"] = [
    {
      key: "info",
      label: (
        <Space size="middle">
          <span>
            节点: {stats.nodeCount} | 连线: {stats.linkCount} |{" "}
            {getStatusText()}
          </span>
          <Button
            type="primary"
            size="small"
            icon={
              isPaused || !isLoading ? (
                <PlayCircleOutlined />
              ) : (
                <PauseCircleOutlined />
              )
            }
            onClick={(e) => {
              e.stopPropagation();
              handleStartPause();
            }}
          >
            {getButtonText()}
          </Button>
          <Select
            value={dagMode}
            onChange={setDagMode}
            onClick={(e) => e.stopPropagation()}
            size="small"
            style={{ width: 100 }}
            options={[
              { label: "自由布局", value: undefined },
              { label: "上下 (TD)", value: "td" },
              { label: "下上 (BU)", value: "bu" },
              { label: "左右 (LR)", value: "lr" },
              { label: "右左 (RL)", value: "rl" },
              { label: "径向向外", value: "radialout" },
              { label: "径向向内", value: "radialin" },
            ]}
          />
          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleResetView();
            }}
          >
            重置视图
          </Button>
          <Button
            size="small"
            icon={<DisconnectOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveIsolatedNodes();
            }}
            disabled={isLoading || stats.nodeCount === 0}
          >
            移除孤立节点
          </Button>
        </Space>
      ),
      children: (
        <>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="节点数" value={stats.nodeCount} />
            </Col>
            <Col span={6}>
              <Statistic title="连线数" value={stats.linkCount} />
            </Col>
            <Col span={12}>
              <Statistic
                title="状态"
                value={getStatusText()}
                valueStyle={{ fontSize: 14 }}
              />
            </Col>
          </Row>

          {isLoading && (
            <div style={{ marginTop: 12 }}>
              <Progress percent={progress} size="small" />
              {loadingState.currentUser && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  正在处理: {loadingState.currentUser}
                </div>
              )}
            </div>
          )}
        </>
      ),
    },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* 控制面板 */}
      <Card size="small" style={{ marginBottom: 8, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Collapse items={collapseItems} size="small" style={{ flex: 1 }} />
          <Input.Search
            size="large"
            placeholder="搜索 UID 或用户名"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            allowClear
            onClear={handleClearSearch}
            style={{ width: 200, flexShrink: 0 }}
            enterButton={<SearchOutlined />}
          />
        </div>
      </Card>

      {/* 图形和参数调节面板并列 */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: 8,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* 图形容器 */}
        <div
          ref={containerRef}
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            border: "1px solid #d9d9d9",
            borderRadius: 8,
            background: "#1a1a1a",
            overflow: "hidden",
          }}
        >
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            nodeId="id"
            nodeLabel="name"
            nodeColor={() => nodeColor}
            nodeRelSize={nodeRelSize}
            linkColor={() => linkColor}
            linkWidth={(link) => (highlightLinksRef.current.has(link) ? 3 : 1)}
            linkCurvature={linkCurvature}
            linkDirectionalArrowLength={linkArrowLength}
            linkDirectionalParticles={4}
            linkDirectionalParticleSpeed={particleSpeed}
            linkDirectionalParticleWidth={(link) =>
              highlightLinksRef.current.has(link) ? 4 : 0
            }
            dagMode={dagMode}
            dagLevelDistance={dagMode ? 200 : undefined}
            d3AlphaDecay={alphaDecay}
            d3VelocityDecay={velocityDecay}
            cooldownTime={cooldownTime}
            onNodeHover={handleNodeHover}
            onLinkHover={handleLinkHover}
            onNodeClick={handleNodeClick}
            nodeCanvasObjectMode={(node) =>
              highlightNodesRef.current.has(node) ||
              searchedNodesRef.current.has(node)
                ? "before"
                : undefined
            }
            nodeCanvasObject={nodeCanvasObject}
            backgroundColor="#1a1a1a"
          />
        </div>

        {/* 参数调节面板 */}
        <Card
          size="small"
          title="参数调节"
          style={{ width: 220, flexShrink: 0, overflowY: "auto" }}
        >
          {/* 力引擎参数 */}
          <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 8 }}>
            力引擎
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              Alpha衰减: {alphaDecay.toFixed(4)}
            </div>
            <Slider
              min={0}
              max={0.1}
              step={0.001}
              value={alphaDecay}
              onChange={setAlphaDecay}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              速度衰减: {velocityDecay.toFixed(2)}
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={velocityDecay}
              onChange={setVelocityDecay}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              斥力强度: {chargeStrength}
            </div>
            <Slider
              min={-500}
              max={0}
              step={10}
              value={chargeStrength}
              onChange={setChargeStrength}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              冷却时间: {(cooldownTime / 1000).toFixed(0)}s
            </div>
            <Slider
              min={1000}
              max={60000}
              step={1000}
              value={cooldownTime}
              onChange={setCooldownTime}
            />
          </div>

          {/* 节点参数 */}
          <div
            style={{
              fontSize: 12,
              fontWeight: "bold",
              marginBottom: 8,
              marginTop: 16,
            }}
          >
            节点
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              节点大小: {nodeRelSize}
            </div>
            <Slider
              min={1}
              max={20}
              step={1}
              value={nodeRelSize}
              onChange={setNodeRelSize}
            />
          </div>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12 }}>节点颜色</span>
            <ColorPicker
              size="small"
              value={nodeColor}
              onChange={(color) => setNodeColor(color.toHexString())}
            />
          </div>

          {/* 连线参数 */}
          <div
            style={{
              fontSize: 12,
              fontWeight: "bold",
              marginBottom: 8,
              marginTop: 16,
            }}
          >
            连线
          </div>
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 12 }}>连线颜色</span>
            <ColorPicker
              size="small"
              value={linkColor}
              onChange={(color) => setLinkColor(color.toHexString())}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              曲线弧度: {linkCurvature.toFixed(2)}
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={linkCurvature}
              onChange={setLinkCurvature}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              箭头长度: {linkArrowLength}
            </div>
            <Slider
              min={0}
              max={15}
              step={1}
              value={linkArrowLength}
              onChange={setLinkArrowLength}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>
              粒子速度: {particleSpeed.toFixed(3)}
            </div>
            <Slider
              min={0.001}
              max={0.1}
              step={0.001}
              value={particleSpeed}
              onChange={setParticleSpeed}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReactForceGraph;
