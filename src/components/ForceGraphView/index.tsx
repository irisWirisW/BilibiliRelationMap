import React, { useState, useRef } from "react";
import { Spin } from "antd";
import ForceGraph from "force-graph";
import { useAppContext } from "../../contexts/AppContext";
import { GraphNode, GraphLink, DebugParams } from "../FollowingsGraph/types";
import { DEFAULT_DEBUG_PARAMS } from "../FollowingsGraph/graphConfig";
import { useGraphData } from "../FollowingsGraph/useGraphData";
import { useGraphTransform } from "../FollowingsGraph/useGraphTransform";
import GraphControls from "../FollowingsGraph/GraphControls";
import ForceGraphCanvas from "../FollowingsGraph/ForceGraphCanvas";
import DebugPanel from "../FollowingsGraph/DebugPanel";
import { csvParse } from 'd3-dsv';
import { GUI } from "dat.gui";

/**
 * ForceGraphView 主组件
 * 使用 force-graph 引擎的关注网络图
 */
const ForceGraphView: React.FC = () => {
  const { message } = useAppContext();
  const graphRef = useRef<ForceGraph | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [debugParams, setDebugParams] = useState<DebugParams>(DEFAULT_DEBUG_PARAMS);

  // 使用数据加载 hook
  const {
    loading,
    followingsList,
    commonFollowingsMap,
    dataLoaded,
    loadAllData,
  } = useGraphData(message);

  // 使用数据转换 hook
  const { graphData, stats } = useGraphTransform(
    followingsList,
    commonFollowingsMap,
    debugParams,
    dataLoaded,
  );

  // 重置视图
  const handleReset = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400);
    }
  };

  // 更新调试参数
  const updateDebugParam = <K extends keyof DebugParams>(
    key: K,
    value: DebugParams[K],
  ) => {
    setDebugParams((prev) => ({ ...prev, [key]: value }));
  };

  // 重启模拟 - 应用物理参数变化
  const applyDebugParams = () => {
    if (!graphRef.current || !dataLoaded) {
      message.warning("请先加载数据");
      return;
    }

    // Force-graph 的模拟通过 d3-force 运行
    // 调用 d3-force 的 alpha 来重启模拟
    const d3Force = (graphRef.current as any).d3Force;
    if (d3Force) {
      // 重新加热模拟（设置 alpha 为较高值）
      d3Force('alpha', 0.3).restart();
    }

    message.success("模拟已重启，物理参数生效中...");
  };

  // 重置调试参数
  const resetDebugParams = () => {
    setDebugParams(DEFAULT_DEBUG_PARAMS);
    message.info("参数已重置为默认值");
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
      link.download = `bilibili-forcegraph-config-${Date.now()}.json`;
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

  // 图形就绪回调
  const handleGraphReady = (graph: ForceGraph) => {
    graphRef.current = graph;
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
      <GraphControls
        loading={loading}
        dataLoaded={dataLoaded}
        stats={stats}
        debugMode={debugMode}
        onLoadData={loadAllData}
        onResetView={handleReset}
        onToggleDebug={() => setDebugMode(!debugMode)}
      />

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
        <DebugPanel
          visible={debugMode}
          params={debugParams}
          onClose={() => setDebugMode(false)}
          onParamChange={updateDebugParam}
          onApply={applyDebugParams}
          onReset={resetDebugParams}
          onExport={exportConfig}
          onImport={importConfig}
          message={message}
        />

        {/* 图形画布 */}
        <ForceGraphCanvas
          graphData={graphData}
          debugParams={debugParams}
          onGraphReady={handleGraphReady}
        />
      </div>
    </div>
  );
};

export default ForceGraphView;
