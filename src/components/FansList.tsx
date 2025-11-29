import React, { useState, useEffect } from "react";
import { Table, Avatar, Tag, Space, Spin } from "antd";
import { UserOutlined, CrownOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { FansItem } from "../types/bilibili";
import { getFansList, getCurrentUserMid } from "../services/biliApi";
import { useAppContext } from "../contexts/AppContext";

const FansList: React.FC = () => {
  const { message } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [fansList, setFansList] = useState<FansItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [offset, setOffset] = useState<string>("");

  // 加载粉丝列表
  const loadFans = async (page: number) => {
    setLoading(true);
    try {
      const vmid = getCurrentUserMid();
      if (!vmid) {
        message.error("无法获取用户 ID，请在个人空间页面使用");
        return;
      }

      const response = await getFansList({
        vmid,
        ps: pageSize,
        pn: page,
        offset: page === 1 ? undefined : offset,
      });

      setFansList(response.data.list);
      setTotal(response.data.total);
      setOffset(response.data.offset);
      setCurrentPage(page);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFans(1);
  }, []);

  // 获取认证标签
  const getVerifyTag = (verify: FansItem["official_verify"]) => {
    if (verify.type === -1) return null;
    return (
      <Tag color={verify.type === 0 ? "blue" : "gold"} icon={<CrownOutlined />}>
        {verify.type === 0 ? "UP主认证" : "机构认证"}
      </Tag>
    );
  };

  // 获取会员标签
  const getVipTag = (vip: FansItem["vip"]) => {
    if (vip.vipStatus === 0) return null;
    return (
      <Tag color="magenta">
        {vip.vipType === 1 ? "月度大会员" : "年度大会员"}
      </Tag>
    );
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleDateString("zh-CN");
  };

  const columns: ColumnsType<FansItem> = [
    {
      title: "头像",
      dataIndex: "face",
      key: "face",
      width: 80,
      render: (face: string, record) => (
        <Avatar src={face} size={48} icon={<UserOutlined />} />
      ),
    },
    {
      title: "昵称",
      dataIndex: "uname",
      key: "uname",
      width: 150,
      render: (uname: string, record) => (
        <a
          href={`https://space.bilibili.com/${record.mid}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: record.vip.nickname_color || "inherit" }}
        >
          {uname}
        </a>
      ),
    },
    {
      title: "签名",
      dataIndex: "sign",
      key: "sign",
      ellipsis: true,
      render: (sign: string) => sign || "-",
    },
    {
      title: "认证/会员",
      key: "tags",
      width: 180,
      render: (_, record) => (
        <Space>
          {getVerifyTag(record.official_verify)}
          {getVipTag(record.vip)}
        </Space>
      ),
    },
    {
      title: "关注时间",
      dataIndex: "mtime",
      key: "mtime",
      width: 120,
      render: (mtime: number) => formatTime(mtime),
    },
    {
      title: "关系",
      dataIndex: "attribute",
      key: "attribute",
      width: 100,
      render: (attribute: number) => {
        const relationMap: Record<number, { text: string; color: string }> = {
          0: { text: "未关注", color: "default" },
          2: { text: "已关注", color: "blue" },
          6: { text: "互相关注", color: "green" },
          128: { text: "已拉黑", color: "red" },
        };
        const relation = relationMap[attribute] || relationMap[0];
        return <Tag color={relation.color}>{relation.text}</Tag>;
      },
    },
  ];

  return (
    <div>
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={fansList}
          rowKey="mid"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            onChange: (page) => loadFans(page),
            showTotal: (total) => `共 ${total} 个粉丝`,
            showSizeChanger: false,
          }}
        />
      </Spin>
    </div>
  );
};

export default FansList;
