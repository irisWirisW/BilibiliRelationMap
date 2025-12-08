import React, { useRef, useEffect, useState } from "react";
import ForceGraph from "force-graph";
import { csvParse } from "d3-dsv";
import { forceCollide } from "d3-force";
import { Select, Button, Space, Upload } from "antd";
import { UploadOutlined, ReloadOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd";

type DagOrientation =
  | "td"
  | "bu"
  | "lr"
  | "rl"
  | "radialout"
  | "radialin"
  | null;

interface DAGNode {
  id?: string; // force-graph 会使用 nodeId 配置的字段
  path: string;
  leaf: string;
  module: string | null;
  size: number;
  level: number;
  val?: number; // force-graph 用于节点大小
  color?: string; // force-graph 用于节点颜色
}

interface DAGLink {
  source: string;
  target: string;
  targetNode?: DAGNode;
}

/**
 * DAGGraphView 组件
 * 使用 DAG（有向无环图）模式展示 CSV 数据的层级结构
 */
const DAGGraphView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph | null>(null);
  const [orientation, setOrientation] = useState<DagOrientation>("td");
  const [csvData, setCsvData] = useState<string | null>(null);
  const [stats, setStats] = useState({ nodes: 0, links: 0 });

  // 初始化 force-graph 实例
  useEffect(() => {
    if (!containerRef.current) return;

    const NODE_REL_SIZE = 1;

    const graph = new ForceGraph(containerRef.current)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight)
      .dagMode("td")
      .dagLevelDistance(300)
      .backgroundColor("#101020")
      .linkColor(() => "rgba(255,255,255,0.2)")
      .nodeRelSize(NODE_REL_SIZE)
      .nodeId("path")
      .nodeVal((node: any) => 100 / (node.level + 1))
      .nodeLabel("path")
      .nodeAutoColorBy("module")
      .linkDirectionalParticles(2)
      .linkDirectionalParticleWidth(2)
      .d3Force(
        "collision",
        forceCollide(
          (node: any) => Math.sqrt(100 / (node.level + 1)) * NODE_REL_SIZE,
        ),
      )
      .d3VelocityDecay(0.3);

    graphRef.current = graph;

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
      if (graphRef.current) {
        graphRef.current._destructor();
      }
    };
  }, []);

  // 处理 CSV 数据并更新图形
  useEffect(() => {
    if (!graphRef.current || !csvData) return;

    try {
      const data = csvParse(csvData);
      const nodes: DAGNode[] = [];
      const links: DAGLink[] = [];

      data.forEach((row: any) => {
        const { size, path } = row;
        const levels = path.split("/");
        const level = levels.length - 1;
        const module = level > 0 ? levels[1] : null;
        const leaf = levels[levels.length - 1];
        const parent = levels.slice(0, -1).join("/");

        const node: DAGNode = {
          path,
          leaf,
          module,
          size: +size || 20,
          level,
          val: 100 / (level + 1), // 用于 nodeVal 计算节点大小
        };

        nodes.push(node);

        if (parent) {
          links.push({
            source: parent,
            target: path,
            targetNode: node,
          });
        }
      });

      graphRef.current.graphData({ nodes, links });
      setStats({ nodes: nodes.length, links: links.length });
    } catch (error) {
      console.error("Failed to parse CSV:", error);
    }
  }, [csvData]);

  // 更新 DAG 方向
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.dagMode(orientation);
  }, [orientation]);

  // 处理文件上传
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
    };
    reader.readAsText(file);
    return false; // 阻止自动上传
  };

  // 加载示例数据
  const loadSampleData = async () => {
    try {
      // 使用 GM_xmlhttpRequest 或 fetch 加载本地文件
      const response = await fetch(
        GM_getResourceURL?.("d3-dependencies") ||
          "../resources/d3-dependencies.csv",
      );
      const text = await response.text();
      setCsvData(text);
    } catch (error) {
      console.error("Failed to load sample data:", error);
      // 如果加载失败，使用内嵌的示例数据
      const sampleData = `size,path
,d3
,d3/d3-array
90,d3/d3-array/array.js
86,d3/d3-array/ascending.js
238,d3/d3-array/bisect.js
,d3/d3-force
654,d3/d3-force/center.js
2447,d3/d3-force/collide.js
3213,d3/d3-force/link.js
3181,d3/d3-force/manyBody.js
3444,d3/d3-force/simulation.js`;
      setCsvData(sampleData);
    }
  };

  // 重置视图
  const handleReset = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
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
      {/* 控制面板 */}
      <div
        style={{
          padding: "12px 16px",
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Space>
          <span style={{ fontWeight: 500 }}>DAG 方向:</span>
          <Select
            value={orientation}
            onChange={setOrientation}
            style={{ width: 150 }}
            options={[
              { label: "上下 (td)", value: "td" },
              { label: "下上 (bu)", value: "bu" },
              { label: "左右 (lr)", value: "lr" },
              { label: "右左 (rl)", value: "rl" },
              { label: "径向向外", value: "radialout" },
              { label: "径向向内", value: "radialin" },
              { label: "自由布局", value: null },
            ]}
          />

          <Upload
            accept=".csv"
            beforeUpload={handleFileUpload}
            showUploadList={false}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>上传 CSV</Button>
          </Upload>

          <Button onClick={loadSampleData}>加载示例数据</Button>

          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            重置视图
          </Button>

          {stats.nodes > 0 && (
            <span style={{ marginLeft: 16, color: "#666" }}>
              节点: {stats.nodes} | 边: {stats.links}
            </span>
          )}
        </Space>
      </div>

      {/* 图形容器 */}
      <div style={{ flex: 1, position: "relative" }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
          }}
        />

        {!csvData && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              color: "#ccc",
              padding: "32px",
              borderRadius: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              maxWidth: "500px",
            }}
          >
            <h3 style={{ color: "#fff", marginBottom: "16px" }}>
              DAG 层级图可视化
            </h3>
            <p style={{ fontSize: "14px", marginBottom: "20px" }}>
              上传 CSV 文件或加载示例数据以查看层级结构
            </p>
            <div
              style={{
                fontSize: "12px",
                lineHeight: "1.8",
                textAlign: "left",
                color: "#aaa",
              }}
            >
              <div>📊 支持层级结构数据可视化</div>
              <div>🎨 自动按模块着色</div>
              <div>🔄 多种 DAG 布局方向</div>
              <div>✨ 动态粒子效果</div>
              <div>📏 节点大小反映层级深度</div>
            </div>

            <div
              style={{
                marginTop: "24px",
                padding: "16px",
                background: "rgba(255, 255, 255, 0.05)",
                borderRadius: "4px",
                textAlign: "left",
                fontSize: "12px",
              }}
            >
              <strong style={{ color: "#fff" }}>CSV 格式要求:</strong>
              <pre style={{ marginTop: "8px", color: "#aaa" }}>
                {`size,path
100,root
50,root/module1
30,root/module1/file1`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DAGGraphView;
