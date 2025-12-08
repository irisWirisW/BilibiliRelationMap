import React, { useState, useEffect } from "react";
import { Table, Tag, Spin } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FansItem } from "../types/bilibili";
import { getFansList, getCurrentUserMid } from "../services/biliApi";
import { useAppContext } from "../contexts/AppContext";
import {
  getBaseUserColumns,
  relationColumn,
} from "./shared/UserTableColumns";

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

  // 使用共享基础列 + 关系列
  const columns: ColumnsType<FansItem> = [
    ...getBaseUserColumns(),
    relationColumn,
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
