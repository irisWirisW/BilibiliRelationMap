import React from "react";
import { Modal, Typography, Descriptions, Tag, Space, Tabs } from "antd";
import {
  GithubOutlined,
  CodeOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  TeamOutlined,
  HeartOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import FansList from "./FansList";
import FollowingsList from "./FollowingsList";
import DynamicFollowingsGraph from "./DynamicFollowingsGraph/index";
import metadata from "../metadata.json";

const { Title, Paragraph } = Typography;

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ visible, onClose }) => {
  const scriptInfoTab = (
    <div>
      <Typography>
        <Title level={4}>
          <CodeOutlined /> Bilibili React Helper
        </Title>
        <Paragraph>
          这是一个基于 <Tag color="blue">React</Tag> +
          <Tag color="green">TypeScript</Tag> +
          <Tag color="cyan">Ant Design</Tag> 构建的油猴脚本示例。
        </Paragraph>

        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="版本">{metadata.version}</Descriptions.Item>
          <Descriptions.Item label="作者">{metadata.author}</Descriptions.Item>
          <Descriptions.Item label="描述">
            {metadata.description}
          </Descriptions.Item>
          <Descriptions.Item label="技术栈">
            <Space size={[0, 8]} wrap>
              <Tag icon={<ThunderboltOutlined />} color="processing">
                React 18
              </Tag>
              <Tag icon={<CodeOutlined />} color="success">
                TypeScript
              </Tag>
              <Tag color="cyan">Ant Design 5</Tag>
              <Tag color="orange">Webpack 5</Tag>
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Paragraph style={{ marginTop: 16 }}>
          <GithubOutlined /> 参考了 Bilibili-Evolved 的构建方案，使用 Webpack
          打包成单文件油猴脚本。
        </Paragraph>
      </Typography>
    </div>
  );

  const items = [
    {
      key: "info",
      label: (
        <span>
          <RocketOutlined />
          脚本信息
        </span>
      ),
      children: scriptInfoTab,
    },
    {
      key: "fans",
      label: (
        <span>
          <TeamOutlined />
          粉丝列表
        </span>
      ),
      children: <FansList />,
    },
    {
      key: "followings",
      label: (
        <span>
          <HeartOutlined />
          关注列表
        </span>
      ),
      children: <FollowingsList />,
    },
    {
      key: "dynamicgraph",
      label: (
        <span>
          <ApartmentOutlined />
          动态关注网络图
        </span>
      ),
      children: <DynamicFollowingsGraph />,
    },
  ];

  return (
    <Modal
      title="Bilibili React Helper"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1200}
      style={{ top: 20 }}
      zIndex={100000}
      destroyOnClose
    >
      <div style={{ height: "80vh", display: "flex", flexDirection: "column" }}>
        <Tabs
          items={items}
          defaultActiveKey="info"
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
          tabBarStyle={{ flexShrink: 0 }}
        />
      </div>
    </Modal>
  );
};

export default InfoModal;
