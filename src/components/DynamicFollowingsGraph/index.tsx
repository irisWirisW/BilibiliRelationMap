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
} from "antd";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  DisconnectOutlined,
} from "@ant-design/icons";
import ForceGraph from "force-graph";
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
  /**
   * 来源: 共同关注 API（对于他人）/ 关注列表 API（对于自己）
   * 对于「我」: 我关注的所有人的 uid
   * 对于「他人」: 该用户关注的人中，与我有共同关注的部分
   */
  following: number[];
  /**
   * 来源: 关注列表 API
   * 含义: 该用户关注的人（深度探索时获取）
   * 对于「我」: 不需要获取，与 following 相同
   */
  deepFollowing: number[];
  /**
   * 来源: 追随者列表 API
   * 含义: 关注了该用户的人（深度探索时获取）
   */
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

type DagOrientation =
  | "td"
  | "bu"
  | "lr"
  | "rl"
  | "radialout"
  | "radialin"
  | null;

// ================== 组件 ==================

const DynamicFollowingsGraph: React.FC = () => {
  const { message } = useAppContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph | null>(null);

  // 数据状态 - 使用 ref 避免触发重渲染
  const appStateRef = useRef<AppState>({
    myUid: 0,
    users: new Map(),
  });

  // 加载状态
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: "idle",
    current: 0,
    total: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [dagOrientation, setDagOrientation] = useState<DagOrientation>(null);

  // 力引擎参数
  const [alphaDecay, setAlphaDecay] = useState(0.05);
  const [velocityDecay, setVelocityDecay] = useState(0.6);
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

  // 高亮状态（使用 ref 避免重新渲染）
  const highlightNodesRef = useRef<Set<GraphNode>>(new Set());
  const highlightLinksRef = useRef<Set<GraphLink>>(new Set());
  const hoverNodeRef = useRef<GraphNode | null>(null);

  // 同步暂停状态到 ref
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // 初始化图形
  useEffect(() => {
    if (!containerRef.current) return;

    const NODE_R = 8;

    const graph = new ForceGraph(containerRef.current)
      .nodeId("id")
      .nodeLabel("name")
      .d3AlphaDecay(0.05)
      .d3VelocityDecay(0.6)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      .graphData({ nodes: [], links: [] }) // 初始化空数据
      .onNodeHover((node: any) => {
        highlightNodesRef.current.clear();
        highlightLinksRef.current.clear();

        if (node) {
          highlightNodesRef.current.add(node);
          node.neighbors?.forEach((neighbor: any) =>
            highlightNodesRef.current.add(neighbor),
          );
          node.links?.forEach((link: any) =>
            highlightLinksRef.current.add(link),
          );
        }

        hoverNodeRef.current = node;
        if (containerRef.current) {
          containerRef.current.style.cursor = node ? "pointer" : "default";
        }
      })
      .onLinkHover((link: any) => {
        highlightNodesRef.current.clear();
        highlightLinksRef.current.clear();

        if (link) {
          highlightLinksRef.current.add(link);
          if (link.source) highlightNodesRef.current.add(link.source);
          if (link.target) highlightNodesRef.current.add(link.target);
        }
      })
      .onNodeClick((node: any) => {
        window.open(`https://space.bilibili.com/${node.id}`, "_blank");
      })
      .autoPauseRedraw(false)
      .linkWidth((link: any) => (highlightLinksRef.current.has(link) ? 3 : 1))
      .linkDirectionalParticles(4)
      .linkDirectionalParticleSpeed(0.01)
      .linkDirectionalParticleWidth((link: any) =>
        highlightLinksRef.current.has(link) ? 4 : 0,
      )
      .nodeCanvasObjectMode((node: any) =>
        highlightNodesRef.current.has(node) ? "before" : undefined,
      )
      .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D) => {
        if (!node.x || !node.y) return;
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_R * 0.56, 0, 2 * Math.PI, false);
        ctx.fillStyle = node === hoverNodeRef.current ? "#b535ffb0" : "#ffd93d";
        ctx.fill();
      })
      .nodeColor(() => "#4ecdc4");

    graphRef.current = graph;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        graph.width(width);
        graph.height(height);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (graphRef.current) {
        graphRef.current._destructor();
      }
    };
  }, []);

  // 更新 DAG 方向
  useEffect(() => {
    if (!graphRef.current) return;

    graphRef.current.dagMode(dagOrientation);

    if (dagOrientation) {
      graphRef.current.dagLevelDistance(200);
    }

    graphRef.current.d3Force("charge")?.strength(chargeStrength);
    graphRef.current.d3ReheatSimulation();
  }, [dagOrientation]);

  // 更新节点颜色
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.nodeColor(() => nodeColor);
  }, [nodeColor]);

  // 更新节点大小
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.nodeRelSize(nodeRelSize);
  }, [nodeRelSize]);

  // 更新连线颜色
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.linkColor(() => linkColor);
  }, [linkColor]);

  // 更新连线曲率
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.linkCurvature(linkCurvature);
  }, [linkCurvature]);

  // 更新箭头长度
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.linkDirectionalArrowLength(linkArrowLength);
  }, [linkArrowLength]);

  // 更新斥力强度
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.d3Force("charge")?.strength(chargeStrength);
    graphRef.current.d3ReheatSimulation();
  }, [chargeStrength]);

  // 更新冷却时间
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.cooldownTime(cooldownTime);
  }, [cooldownTime]);

  /** 向图形添加节点（增量方式） */
  const addNodesToGraph = useCallback((newNodes: GraphNode[]) => {
    if (!graphRef.current) return;

    const { nodes, links } = graphRef.current.graphData();

    // 过滤掉已存在的节点
    const existingIds = new Set((nodes as GraphNode[]).map((n) => n.id));
    const uniqueNewNodes = newNodes.filter((n) => !existingIds.has(n.id));

    if (uniqueNewNodes.length === 0) return;

    graphRef.current.graphData({
      nodes: [...nodes, ...uniqueNewNodes],
      links: [...links],
    });

    setStats({
      nodeCount: nodes.length + uniqueNewNodes.length,
      linkCount: links.length,
    });
  }, []);

  /** 向图形添加链接（增量方式） */
  const addLinksToGraph = useCallback((newLinks: GraphLink[]) => {
    if (!graphRef.current) return;

    const { nodes, links } = graphRef.current.graphData();

    // 构建已有链接的 Set
    const existingLinkSet = new Set<string>();
    (links as GraphLink[]).forEach((l) => {
      const sourceId = typeof l.source === "object" ? l.source.id : l.source;
      const targetId = typeof l.target === "object" ? l.target.id : l.target;
      existingLinkSet.add(`${sourceId}-${targetId}`);
    });

    // 过滤掉已存在的链接
    const uniqueNewLinks = newLinks.filter((link) => {
      const sourceId =
        typeof link.source === "number" ? link.source : link.source.id;
      const targetId =
        typeof link.target === "number" ? link.target : link.target.id;
      return !existingLinkSet.has(`${sourceId}-${targetId}`);
    });

    if (uniqueNewLinks.length === 0) return;

    // 建立邻居关系（用于 hover 高亮）
    const nodeMap = new Map<number, GraphNode>();
    (nodes as GraphNode[]).forEach((node) => nodeMap.set(node.id, node));

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

    graphRef.current.graphData({
      nodes: [...nodes],
      links: [...links, ...uniqueNewLinks],
    });

    setStats({
      nodeCount: nodes.length,
      linkCount: links.length + uniqueNewLinks.length,
    });
  }, []);

  /** 等待恢复（暂停时使用） */
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
      // Step 1: 获取我的 ID
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
      if (graphRef.current) {
        graphRef.current.graphData({ nodes: [], links: [] });
      }
      setStats({ nodeCount: 0, linkCount: 0 });

      // 初始化 users Map
      const users = new Map<number, UserData>();
      appStateRef.current = { myUid: myMid, users };

      // 创建「我」的 UserData
      users.set(myMid, {
        uid: myMid,
        uname: "我",
        face: "",
        following: [],
        deepFollowing: [],
        deepFollower: [],
      });

      // Step 2: 获取我的关注列表
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

      // 添加第一页的用户
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

      // 更新「我」的 following
      users.get(myMid)!.following = [...myFollowingUids];

      // 直接添加节点到图形
      addNodesToGraph(firstPageNodes);

      setLoadingState({
        status: "loading_followings",
        current: myFollowingUids.length,
        total,
      });

      // 加载剩余页面
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

        // 更新「我」的 following
        users.get(myMid)!.following = [...myFollowingUids];

        // 直接添加节点到图形
        addNodesToGraph(pageNodes);

        setLoadingState({
          status: "loading_followings",
          current: myFollowingUids.length,
          total,
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      message.success(`成功加载 ${myFollowingUids.length} 个关注`);

      // Step 3: 获取每个关注对象的共同关注
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

          // 更新该用户的 following 字段
          user.following = commonMids;

          // 同时将共同关注返回的用户信息存入 users（如果不存在）
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

          // 生成新的链接并添加到图形
          const newLinks: GraphLink[] = [];
          commonMids.forEach((targetId) => {
            if (myFollowingSet.has(targetId)) {
              // 边方向：targetId → uid（即 uid 关注了 targetId）
              newLinks.push({ source: targetId, target: uid });
            }
          });

          if (newLinks.length > 0) {
            addLinksToGraph(newLinks);
          }

          if (!result.fromCache) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
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
    if (!graphRef.current) return;

    const { nodes, links } = graphRef.current.graphData();

    const connectedNodeIds = new Set<number>();
    (links as GraphLink[]).forEach((link) => {
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });

    const filteredNodes = (nodes as GraphNode[]).filter((node) =>
      connectedNodeIds.has(node.id),
    );
    const removedCount = nodes.length - filteredNodes.length;

    if (removedCount === 0) {
      message.info("没有孤立节点");
      return;
    }

    graphRef.current.graphData({
      nodes: filteredNodes,
      links: links,
    });

    setStats({
      nodeCount: filteredNodes.length,
      linkCount: links.length,
    });

    message.success(`已移除 ${removedCount} 个孤立节点`);
  };

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

        <Space style={{ marginTop: 16 }}>
          <Button
            type="primary"
            icon={
              isPaused || !isLoading ? (
                <PlayCircleOutlined />
              ) : (
                <PauseCircleOutlined />
              )
            }
            onClick={handleStartPause}
          >
            {getButtonText()}
          </Button>

          <Select
            value={dagOrientation}
            onChange={setDagOrientation}
            style={{ width: 120 }}
            options={[
              { label: "自由布局", value: null },
              { label: "上下 (TD)", value: "td" },
              { label: "下上 (BU)", value: "bu" },
              { label: "左右 (LR)", value: "lr" },
              { label: "右左 (RL)", value: "rl" },
              { label: "径向向外", value: "radialout" },
              { label: "径向向内", value: "radialin" },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={handleResetView}>
            重置视图
          </Button>
          <Button
            icon={<DisconnectOutlined />}
            onClick={handleRemoveIsolatedNodes}
            disabled={isLoading || stats.nodeCount === 0}
          >
            移除孤立节点
          </Button>
        </Space>
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
          }}
        />

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
              冷却速度: {alphaDecay.toFixed(3)}
            </div>
            <Slider
              min={0}
              max={0.1}
              step={0.001}
              value={alphaDecay}
              onChange={(value) => {
                setAlphaDecay(value);
                graphRef.current?.d3AlphaDecay(value);
              }}
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
              onChange={(value) => {
                setVelocityDecay(value);
                graphRef.current?.d3VelocityDecay(value);
              }}
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
              onChange={(value) => {
                setParticleSpeed(value);
                graphRef.current?.linkDirectionalParticleSpeed(value);
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DynamicFollowingsGraph;
