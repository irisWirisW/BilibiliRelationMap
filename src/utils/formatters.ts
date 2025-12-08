/**
 * 通用格式化工具函数
 */

/**
 * 格式化时间戳为本地日期字符串
 * @param timestamp 秒级时间戳
 * @returns 格式化后的日期字符串，如 "2024/1/15"
 */
export const formatTime = (timestamp: number): string => {
    if (!timestamp) return "-";
    return new Date(timestamp * 1000).toLocaleDateString("zh-CN");
};

/**
 * 关系类型映射
 */
export const relationMap: Record<number, { text: string; color: string }> = {
    0: { text: "未关注", color: "default" },
    2: { text: "已关注", color: "blue" },
    6: { text: "互相关注", color: "green" },
    128: { text: "已拉黑", color: "red" },
};

/**
 * 获取关系信息
 * @param attribute 关系类型数字
 * @returns 关系文本和颜色
 */
export const getRelationInfo = (
    attribute: number
): { text: string; color: string } => {
    return relationMap[attribute] || relationMap[0];
};
