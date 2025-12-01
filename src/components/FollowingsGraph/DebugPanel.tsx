import React, { useRef } from "react";
import {
  Card,
  Button,
  Space,
  Slider,
  Switch,
  Tooltip,
} from "antd";
import {
  CloseOutlined,
  QuestionCircleOutlined,
  DownloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { DebugParams } from "./types";
import { DEFAULT_DEBUG_PARAMS } from "./graphConfig";
import { MessageInstance } from "antd/es/message/interface";

interface DebugPanelProps {
  visible: boolean;
  params: DebugParams;
  onClose: () => void;
  onParamChange: <K extends keyof DebugParams>(
    key: K,
    value: DebugParams[K],
  ) => void;
  onApply: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  message: MessageInstance;
}

/**
 * DebugPanel 组件
 * 负责调试参数的配置界面
 */
const DebugPanel: React.FC<DebugPanelProps> = ({
  visible,
  params,
  onClose,
  onParamChange,
  onApply,
  onReset,
  onExport,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!visible) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
    // 重置input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card
      title="调试参数"
      extra={
        <Button
          size="small"
          type="text"
          icon={<CloseOutlined />}
          onClick={onClose}
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
              {params.gravity.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={params.gravity}
            onChange={(v) => onParamChange("gravity", v)}
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
              <span style={{ fontSize: 12, color: "#666" }}>repulsion</span>
              <Tooltip title="节点之间的排斥力。值越大节点越分散。范围: 0.0 - 2.0">
                <QuestionCircleOutlined
                  style={{ fontSize: 12, color: "#999", cursor: "help" }}
                />
              </Tooltip>
            </Space>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {params.repulsion.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.01}
            value={params.repulsion}
            onChange={(v) => onParamChange("repulsion", v)}
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
              {params.repulsionTheta.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0.3}
            max={2}
            step={0.01}
            value={params.repulsionTheta}
            onChange={(v) => onParamChange("repulsionTheta", v)}
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
              {params.linkSpring.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.01}
            value={params.linkSpring}
            onChange={(v) => onParamChange("linkSpring", v)}
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
              {params.linkDistance}
            </span>
          </div>
          <Slider
            min={1}
            max={20}
            step={1}
            value={params.linkDistance}
            onChange={(v) => onParamChange("linkDistance", v)}
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
              <span style={{ fontSize: 12, color: "#666" }}>friction</span>
              <Tooltip title="运动摩擦力。值越大运动越快停止，越小则移动更持久。范围: 0.8 - 1.0">
                <QuestionCircleOutlined
                  style={{ fontSize: 12, color: "#999", cursor: "help" }}
                />
              </Tooltip>
            </Space>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              {params.friction.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0.8}
            max={1}
            step={0.01}
            value={params.friction}
            onChange={(v) => onParamChange("friction", v)}
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
            节点大小倍数: {params.nodeSizeMultiplier.toFixed(1)}
          </div>
          <Slider
            min={0.1}
            max={2}
            step={0.1}
            value={params.nodeSizeMultiplier}
            onChange={(v) => onParamChange("nodeSizeMultiplier", v)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
            节点缩放系数: {params.nodeSizeScale.toFixed(1)}
          </div>
          <Slider
            min={0.5}
            max={3}
            step={0.1}
            value={params.nodeSizeScale}
            onChange={(v) => onParamChange("nodeSizeScale", v)}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
            节点最大值: {params.nodeMaxSize}
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={params.nodeMaxSize}
            onChange={(v) => onParamChange("nodeMaxSize", v)}
          />
        </div>

        <div style={{ marginBottom: 0 }}>
          <div style={{ marginBottom: 8, fontSize: 12, color: "#666" }}>
            链接宽度: {params.linkWidth.toFixed(1)}
          </div>
          <Slider
            min={1}
            max={5}
            step={0.1}
            value={params.linkWidth}
            onChange={(v) => onParamChange("linkWidth", v)}
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
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#666" }}>显示动态标签</span>
            <Switch
              checked={params.showDynamicLabels}
              onChange={(v) => onParamChange("showDynamicLabels", v)}
            />
          </Space>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#666" }}>曲线连接</span>
            <Switch
              checked={params.curvedLinks}
              onChange={(v) => onParamChange("curvedLinks", v)}
            />
          </Space>
        </div>
        <div>
          <Space style={{ width: "100%", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "#666" }}>反转连线方向</span>
            <Switch
              checked={params.swapLinkDirection}
              onChange={(v) => onParamChange("swapLinkDirection", v)}
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
          onClick={onExport}
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
        <Button size="small" onClick={onReset}>
          重置
        </Button>
        <Button type="primary" size="small" onClick={onApply}>
          应用
        </Button>
      </Space>
    </Card>
  );
};

export default DebugPanel;
