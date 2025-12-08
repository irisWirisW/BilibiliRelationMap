import React, { useState, useEffect } from "react";
import { Table, Avatar, Tag, Space, Spin, List, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { FansItem } from "../types/bilibili";
import {
  getFollowingsList,
  getCurrentUserMid,
  getCommonFollowings,
} from "../services/biliApi";
import { useAppContext } from "../contexts/AppContext";
import { getBaseUserColumns } from "./shared/UserTableColumns";
import logger from "../utils/logger";

const { Text } = Typography;

interface CommonFollowingData {
  count: number;
  mids: number[];
  users: FansItem[];
  loading: boolean;
}

const FollowingsList: React.FC = () => {
  const { message } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [followingsList, setFollowingsList] = useState<FansItem[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [commonFollowingsMap, setCommonFollowingsMap] = useState<
    Map<number, CommonFollowingData>
  >(new Map());
  const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);

  // 加载关注列表
  const loadFollowings = async (page: number) => {
    setLoading(true);
    try {
      const vmid = getCurrentUserMid();
      if (!vmid) {
        message.error("无法获取用户 ID，请在个人空间页面使用");
        return;
      }

      const response = await getFollowingsList({
        vmid,
        ps: pageSize,
        pn: page,
      });

      setFollowingsList(response.data.list);
      setTotal(response.data.total);
      setCurrentPage(page);

      // 开始批量加载共同关注
      loadCommonFollowingsBatch(response.data.list.map((item) => item.mid));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 批量加载共同关注（5个一批）
  const loadCommonFollowingsBatch = async (mids: number[]) => {
    const batchSize = 5;
    const delay = 500; // 每批之间延迟 500ms

    for (let i = 0; i < mids.length; i += batchSize) {
      const batch = mids.slice(i, i + batchSize);

      // 并行加载这一批
      await Promise.all(batch.map((mid) => loadCommonFollowing(mid)));

      // 延迟，避免请求过快
      if (i + batchSize < mids.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  // 加载单个用户的共同关注
  const loadCommonFollowing = async (mid: number) => {
    // 设置加载状态
    setCommonFollowingsMap((prev) =>
      new Map(prev).set(mid, {
        count: 0,
        mids: [],
        users: [],
        loading: true,
      }),
    );

    try {
      const result = await getCommonFollowings(mid);
      const users = result.response.data.list;
      const mids = users.map((u) => u.mid);

      setCommonFollowingsMap((prev) =>
        new Map(prev).set(mid, {
          count: result.response.data.total,
          mids: mids,
          users: users,
          loading: false,
        }),
      );
    } catch (error) {
      logger.error(`加载共同关注失败 (mid: ${mid})`, error);
      setCommonFollowingsMap((prev) =>
        new Map(prev).set(mid, {
          count: 0,
          mids: [],
          users: [],
          loading: false,
        }),
      );
    }
  };

  useEffect(() => {
    loadFollowings(1);
  }, []);

  // 展开行渲染
  const expandedRowRender = (record: FansItem) => {
    const commonData = commonFollowingsMap.get(record.mid);

    if (!commonData) {
      return <div style={{ padding: "12px" }}>正在加载...</div>;
    }

    if (commonData.loading) {
      return (
        <div style={{ padding: "12px", textAlign: "center" }}>
          <Spin tip="正在加载共同关注..." />
        </div>
      );
    }

    if (commonData.count === 0) {
      return <div style={{ padding: "12px", color: "#999" }}>暂无共同关注</div>;
    }

    return (
      <div style={{ padding: "12px" }}>
        <Text strong style={{ marginBottom: 12, display: "block" }}>
          共同关注 ({commonData.count} 人)
        </Text>
        <List
          grid={{ gutter: 16, column: 4 }}
          dataSource={commonData.users}
          renderItem={(user) => (
            <List.Item>
              <Space>
                <Avatar src={user.face} size={32} icon={<UserOutlined />} />
                <a
                  href={`https://space.bilibili.com/${user.mid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: user.vip.nickname_color || "inherit" }}
                >
                  {user.uname}
                </a>
              </Space>
            </List.Item>
          )}
        />
      </div>
    );
  };

  // 共同关注列（FollowingsList 特有）
  const commonFollowingsColumn: ColumnsType<FansItem>[number] = {
    title: "共同关注",
    key: "common",
    width: 100,
    render: (_, record) => {
      const common = commonFollowingsMap.get(record.mid);
      if (!common) {
        return <Tag color="default">加载中...</Tag>;
      }
      if (common.loading) {
        return <Spin size="small" />;
      }
      if (common.count === 0) {
        return <Tag color="default">无</Tag>;
      }
      return <Tag color="blue">{common.count} 个</Tag>;
    },
  };

  // 使用共享基础列 + 共同关注列
  const columns: ColumnsType<FansItem> = [
    ...getBaseUserColumns(),
    commonFollowingsColumn,
  ];

  return (
    <div>
      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={followingsList}
          rowKey="mid"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            onChange: (page) => loadFollowings(page),
            showTotal: (total) => `共 ${total} 个关注`,
            showSizeChanger: false,
          }}
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            onExpand: (expanded, record) => {
              if (expanded) {
                setExpandedRowKeys([...expandedRowKeys, record.mid]);
              } else {
                setExpandedRowKeys(
                  expandedRowKeys.filter((key) => key !== record.mid),
                );
              }
            },
            rowExpandable: (record) => {
              const common = commonFollowingsMap.get(record.mid);
              return common ? common.count > 0 : true;
            },
          }}
        />
      </Spin>
    </div>
  );
};

export default FollowingsList;
