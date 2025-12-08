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

/** 用户基础信息 */
interface UserInfo {
  uid: number;
  name: string;
  face: string;
}

/** 用户数据（我 + 我的关注） */
interface UserData {
  me: UserInfo;
  followings: UserInfo[];
}

/** 关系数据：用户ID → 该用户关注的人的ID列表 */
type RelationMap = Map<number, number[]>;

/** 图节点 */
interface GraphNode {
  id: number;
  name: string;
  face: string;
  neighbors?: GraphNode[]; // 邻居节点
  links?: GraphLink[]; // 连接的边
  x?: number; // 由 force-graph 设置
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

  // 数据状态
  const [userData, setUserData] = useState<UserData | null>(null);
  const [relationMap, setRelationMap] = useState<RelationMap>(new Map());

  // 加载状态
  const [loadingState, setLoadingState] = useState<LoadingState>({
    status: "idle",
    current: 0,
    total: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const [dagOrientation, setDagOrientation] = useState<DagOrientation>(null);

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
      //.nodeRelSize(NODE_R)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      // 节点 hover 处理
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
        // 更新容器样式
        if (containerRef.current) {
          containerRef.current.style.cursor = node ? "pointer" : "default";
        }
      })
      // 边 hover 处理
      .onLinkHover((link: any) => {
        highlightNodesRef.current.clear();
        highlightLinksRef.current.clear();

        if (link) {
          highlightLinksRef.current.add(link);
          if (link.source) highlightNodesRef.current.add(link.source);
          if (link.target) highlightNodesRef.current.add(link.target);
        }
      })
      // 节点点击
      .onNodeClick((node: any) => {
        window.open(`https://space.bilibili.com/${node.id}`, "_blank");
      })
      // 保持重绘（用于 hover 效果）
      .autoPauseRedraw(false)
      // 边宽度根据高亮状态变化
      .linkWidth((link: any) => (highlightLinksRef.current.has(link) ? 3 : 1))
      // 边方向粒子
      .linkDirectionalParticles(4)
      .linkDirectionalParticleWidth((link: any) =>
        highlightLinksRef.current.has(link) ? 4 : 0,
      )
      // 节点自定义渲染模式
      .nodeCanvasObjectMode((node: any) =>
        highlightNodesRef.current.has(node) ? "before" : undefined,
      )
      // 节点自定义渲染（绘制高亮光环）
      .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D) => {
        if (!node.x || !node.y) return;
        ctx.beginPath();
        ctx.arc(node.x, node.y, NODE_R * 0.56, 0, 2 * Math.PI, false);
        ctx.fillStyle = node === hoverNodeRef.current ? "#b535ffb0" : "#ffd93d";
        ctx.fill();
      })
      // 节点颜色
      .nodeColor(() => "#4ecdc4");

    graphRef.current = graph;

    // 添加 ResizeObserver
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

    // 设置 DAG 模式
    graphRef.current.dagMode(dagOrientation);

    // 如果启用了 DAG 模式，设置层级距离
    if (dagOrientation) {
      graphRef.current.dagLevelDistance(200);
    }

    // 重新加热模拟以应用布局更改
    graphRef.current.d3Force("charge")?.strength(-100); // 调整斥力
    graphRef.current.d3ReheatSimulation();
  }, [dagOrientation]);

  // 当数据更新时，重新渲染图形
  useEffect(() => {
    if (!graphRef.current || !userData) return;

    const graphData = transformToGraphData(userData, relationMap);
    graphRef.current.graphData(graphData);

    setStats({
      nodeCount: graphData.nodes.length,
      linkCount: graphData.links.length,
    });
  }, [userData, relationMap]);

  /** 将 UserData + RelationMap 转换为图数据 */
  const transformToGraphData = (
    userData: UserData,
    relationMap: RelationMap,
  ): { nodes: GraphNode[]; links: GraphLink[] } => {
    // 创建 uid → UserInfo 映射
    const userInfoMap = new Map<number, UserInfo>();
    userData.followings.forEach((user) => {
      userInfoMap.set(user.uid, user);
    });

    // 我的关注对象的 ID 集合
    const myFollowingIds = new Set(userData.followings.map((u) => u.uid));

    // 生成节点
    const nodes: GraphNode[] = userData.followings.map((u) => ({
      id: u.uid,
      name: u.name,
      face: u.face,
    }));

    // 生成边：只保留 source 和 target 都在我的关注列表中的边
    // 链接方向：target（共同关注的人）→ source（我的关注对象）
    // 表示 "共同关注的人" 被 "我的关注对象" 关注
    const links: GraphLink[] = [];
    const linkSet = new Set<string>();

    relationMap.forEach((targets, sourceId) => {
      if (!myFollowingIds.has(sourceId)) return;

      targets.forEach((targetId) => {
        if (myFollowingIds.has(targetId)) {
          // 交换方向：targetId → sourceId（即 sourceId 关注了 targetId）
          const linkKey = `${targetId}-${sourceId}`;
          if (!linkSet.has(linkKey)) {
            links.push({ source: targetId, target: sourceId });
            linkSet.add(linkKey);
          }
        }
      });
    });

    // 建立邻居关系（用于 hover 高亮）
    const nodeMap = new Map<number, GraphNode>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    links.forEach((link) => {
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

    return { nodes, links };
  };

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

      // Step 2: 获取我的关注列表
      setLoadingState({ status: "loading_followings", current: 0, total: 0 });
      message.info("正在加载关注列表...");

      const allFollowings: UserInfo[] = [];
      let page = 1;
      const pageSize = 50;

      const firstResponse = await getFollowingsList({
        vmid: myMid,
        ps: pageSize,
        pn: 1,
      });
      const total = firstResponse.data.total;
      const totalPages = Math.ceil(total / pageSize);

      // 添加第一页
      firstResponse.data.list.forEach((item) => {
        allFollowings.push({
          uid: item.mid,
          name: item.uname,
          face: item.face,
        });
      });

      // 加载剩余页面
      for (page = 2; page <= totalPages; page++) {
        if (isPausedRef.current) await waitForResume();

        const response = await getFollowingsList({
          vmid: myMid,
          ps: pageSize,
          pn: page,
        });
        response.data.list.forEach((item) => {
          allFollowings.push({
            uid: item.mid,
            name: item.uname,
            face: item.face,
          });
        });

        setLoadingState({
          status: "loading_followings",
          current: allFollowings.length,
          total,
        });

        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // 保存用户数据
      const newUserData: UserData = {
        me: { uid: myMid, name: "我", face: "" },
        followings: allFollowings,
      };
      setUserData(newUserData);
      message.success(`成功加载 ${allFollowings.length} 个关注`);

      // Step 3: 获取每个关注对象的共同关注
      setLoadingState({
        status: "loading_relations",
        current: 0,
        total: allFollowings.length,
      });
      message.info("正在加载共同关注数据...");

      const newRelationMap = new Map<number, number[]>();

      for (let i = 0; i < allFollowings.length; i++) {
        if (isPausedRef.current) await waitForResume();

        const user = allFollowings[i];
        setLoadingState({
          status: "loading_relations",
          current: i + 1,
          total: allFollowings.length,
          currentUser: user.name,
        });

        try {
          const result = await getCommonFollowings(user.uid);
          const commonMids = result.response.data.list.map((u) => u.mid);
          newRelationMap.set(user.uid, commonMids);

          // 实时更新 relationMap，让图形动态更新
          setRelationMap(new Map(newRelationMap));

          // 只有非缓存请求才需要延迟
          if (!result.fromCache) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (error) {
          logger.error(`获取 ${user.name} 的共同关注失败:`, error);
          newRelationMap.set(user.uid, []);
        }
      }

      setLoadingState({
        status: "done",
        current: allFollowings.length,
        total: allFollowings.length,
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
  }, [message]);

  /** 开始/暂停按钮 */
  const handleStartPause = () => {
    if (
      loadingState.status === "idle" ||
      loadingState.status === "done" ||
      loadingState.status === "error"
    ) {
      // 开始加载
      setIsPaused(false);
      isPausedRef.current = false;
      loadAllData();
    } else if (isPaused) {
      // 继续
      setIsPaused(false);
      isPausedRef.current = false;
    } else {
      // 暂停
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

    const data = graphRef.current.graphData();
    const nodes = data.nodes as GraphNode[];
    const links = data.links as GraphLink[];

    // 收集所有有连接的节点 ID
    const connectedNodeIds = new Set<number>();
    links.forEach((link: any) => {
      // link.source 和 link.target 可能是对象或 ID
      const sourceId =
        typeof link.source === "object" ? link.source.id : link.source;
      const targetId =
        typeof link.target === "object" ? link.target.id : link.target;
      connectedNodeIds.add(sourceId);
      connectedNodeIds.add(targetId);
    });

    // 过滤出有连接的节点
    const filteredNodes = nodes.filter((node) => connectedNodeIds.has(node.id));
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

      {/* 图形容器 */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          border: "1px solid #d9d9d9",
          borderRadius: 8,
          background: "#1a1a1a",
        }}
      />
    </div>
  );
};

export default DynamicFollowingsGraph;
