import React from "react";
import {
  Modal,
  Typography,
  Tag,
  Space,
  Tabs,
  Card,
  Row,
  Col,
  Divider,
} from "antd";
import {
  GithubOutlined,
  CodeOutlined,
  RocketOutlined,
  TeamOutlined,
  HeartOutlined,
  ApartmentOutlined,
  UserOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import FansList from "./FansList";
import FollowingsList from "./FollowingsList";
import DynamicFollowingsGraph from "./DynamicFollowingsGraph/index";
import ReactForceGraph from "./ReactForceGraph/index";
import metadata from "../metadata.json";

const { Title, Text, Paragraph } = Typography;

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose }) => {
  const scriptInfoTab = (
    <div style={{ padding: "16px 0" }}>
      {/* 头部卡片 */}
      <Card
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "none",
          marginBottom: 24,
        }}
      >
        <div style={{ textAlign: "center", color: "#fff" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgba(255,255,255,0.2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <RocketOutlined style={{ fontSize: 32 }} />
          </div>
          <Title level={3} style={{ color: "#fff", margin: 0 }}>
            {metadata.name}
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14 }}>
            {metadata.description}
          </Text>
          <div style={{ marginTop: 16 }}>
            <Tag color="#fff" style={{ color: "#764ba2", fontWeight: 600 }}>
              v{metadata.version}
            </Tag>
          </div>
        </div>
      </Card>

      <Row gutter={16}>
        {/* 基本信息 */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <UserOutlined />
                <span>基本信息</span>
              </Space>
            }
            size="small"
            style={{ height: "100%" }}
          >
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">作者</Text>
              <div>
                <Text strong>{metadata.author}</Text>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text type="secondary">版本</Text>
              <div>
                <Text strong>{metadata.version}</Text>
              </div>
            </div>
            <div>
              <Text type="secondary">运行环境</Text>
              <div>
                <Text strong>Tampermonkey / Violentmonkey</Text>
              </div>
            </div>
          </Card>
        </Col>

        {/* 技术栈 */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <CodeOutlined />
                <span>技术栈</span>
              </Space>
            }
            size="small"
            style={{ height: "100%" }}
          >
            <Space size={[8, 8]} wrap>
              <Tag color="blue">React 18</Tag>
              <Tag color="green">TypeScript</Tag>
              <Tag color="cyan">Ant Design 5</Tag>
              <Tag color="orange">Webpack 5</Tag>
              <Tag color="purple">Force-Graph</Tag>
              <Tag color="magenta">IndexedDB</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* 功能特性 */}
      <Card
        title={
          <Space>
            <RocketOutlined />
            <span>功能特性</span>
          </Space>
        }
        size="small"
        style={{ marginTop: 16 }}
      >
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Space>
              <TeamOutlined style={{ color: "#1890ff" }} />
              <Text>粉丝列表查看</Text>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <HeartOutlined style={{ color: "#eb2f96" }} />
              <Text>关注列表查看</Text>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <ApartmentOutlined style={{ color: "#52c41a" }} />
              <Text>关注关系网络图</Text>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <LinkOutlined style={{ color: "#722ed1" }} />
              <Text>共同关注分析</Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 底部链接 */}
      <Divider />
      <div style={{ textAlign: "center" }}>
        <Space split={<Divider type="vertical" />}>
          <a
            href="https://github.com/irisWirisW/BilibiliRelationMap"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#666" }}
          >
            <GithubOutlined /> GitHub
          </a>
          <Text type="secondary">参考 Bilibili-Evolved 构建方案</Text>
        </Space>
      </div>
    </div>
  );

  const items = [
    {
      key: "info",
      label: (
        <Space>
          <RocketOutlined />
          脚本信息
        </Space>
      ),
      children: scriptInfoTab,
    },
    {
      key: "fans",
      label: (
        <Space>
          <TeamOutlined />
          粉丝列表
        </Space>
      ),
      children: <FansList />,
    },
    {
      key: "followings",
      label: (
        <Space>
          <HeartOutlined />
          关注列表
        </Space>
      ),
      children: <FollowingsList />,
    },
    {
      key: "dynamicgraph",
      label: (
        <Space>
          <ApartmentOutlined />
          动态关注网络图
        </Space>
      ),
      children: <DynamicFollowingsGraph />,
    },
    {
      key: "reactforcegraph",
      label: (
        <Space>
          <ApartmentOutlined />
          React Force Graph
        </Space>
      ),
      children: <ReactForceGraph />,
    },
  ];

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      zIndex={100000}
      destroyOnHidden
    >
      <div style={{ height: "90vh", display: "flex", flexDirection: "column" }}>
        <Tabs
          items={items}
          defaultActiveKey="info"
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
          tabBarStyle={{ flexShrink: 0, marginBottom: 0 }}
        />
      </div>
    </Modal>
  );
};

export default InfoModal;
