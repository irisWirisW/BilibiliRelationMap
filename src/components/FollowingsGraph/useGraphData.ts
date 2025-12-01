import { useState } from "react";
import { FansItem } from "../../types/bilibili";
import {
  getFollowingsList,
  getCurrentUserMid,
  getCommonFollowings,
} from "../../services/biliApi";
import { MessageInstance } from "antd/es/message/interface";

/**
 * 数据加载 Hook
 * 负责加载关注列表和共同关注数据
 */
export const useGraphData = (message: MessageInstance) => {
  const [loading, setLoading] = useState(false);
  const [followingsList, setFollowingsList] = useState<FansItem[]>([]);
  const [commonFollowingsMap, setCommonFollowingsMap] = useState<
    Map<number, number[]>
  >(new Map());
  const [dataLoaded, setDataLoaded] = useState(false);

  // 批量加载共同关注
  const loadCommonFollowingsBatch = async (mids: number[]) => {
    const batchSize = 10;
    const delay = 300;
    const map = new Map<number, number[]>();

    for (let i = 0; i < mids.length; i += batchSize) {
      const batch = mids.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (mid) => {
          try {
            const response = await getCommonFollowings(mid);
            const commonMids = response.data.list.map((u) => u.mid);
            map.set(mid, commonMids);
          } catch (error) {
            console.error(`加载共同关注失败 (mid: ${mid})`, error);
            map.set(mid, []);
          }
        }),
      );

      // 更新进度
      if ((i + batchSize) % 50 === 0 || i + batchSize >= mids.length) {
        const progress = Math.min(i + batchSize, mids.length);
        message.info(`共同关注进度: ${progress}/${mids.length}`);
      }

      if (i + batchSize < mids.length) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    setCommonFollowingsMap(map);
  };

  // 加载所有关注数据
  const loadAllData = async () => {
    setLoading(true);
    setDataLoaded(false);

    try {
      const vmid = getCurrentUserMid();
      if (!vmid) {
        message.error("无法获取用户 ID，请在个人空间页面使用");
        return;
      }

      // 加载所有关注（分页获取）
      message.info("正在加载关注列表...");
      const allFollowings: FansItem[] = [];
      let page = 1;
      const pageSize = 50;

      // 获取第一页以知道总数
      const firstResponse = await getFollowingsList({
        vmid,
        ps: pageSize,
        pn: 1,
      });
      allFollowings.push(...firstResponse.data.list);
      const totalPages = Math.ceil(firstResponse.data.total / pageSize);

      // 获取剩余页
      for (page = 2; page <= totalPages; page++) {
        const response = await getFollowingsList({
          vmid,
          ps: pageSize,
          pn: page,
        });

        // 验证返回数据
        if (response.data?.list && Array.isArray(response.data.list)) {
          allFollowings.push(...response.data.list);
        } else {
          console.warn(`第 ${page} 页数据格式异常，跳过`);
        }

        // 给用户反馈
        if (page % 5 === 0) {
          message.info(
            `已加载 ${allFollowings.length}/${firstResponse.data.total} 个关注`,
          );
        }
      }

      setFollowingsList(allFollowings);
      message.success(`成功加载 ${allFollowings.length} 个关注`);

      // 批量加载共同关注
      message.info("正在加载共同关注数据...");
      await loadCommonFollowingsBatch(allFollowings.map((u) => u.mid));

      setDataLoaded(true);
      message.success("数据加载完成！正在生成网络图...");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    followingsList,
    commonFollowingsMap,
    dataLoaded,
    loadAllData,
  };
};
