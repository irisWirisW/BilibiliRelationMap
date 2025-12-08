/**
 * 共享的用户表格列配置和渲染组件
 */
import React from "react";
import { Avatar, Tag, Space } from "antd";
import { UserOutlined, CrownOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { FansItem } from "../../types/bilibili";
import { formatTime, getRelationInfo } from "../../utils/formatters";

/**
 * 获取认证标签
 */
export const getVerifyTag = (
    verify: FansItem["official_verify"]
): React.ReactNode => {
    if (verify.type === -1) return null;
    return (
        <Tag color={verify.type === 0 ? "blue" : "gold"} icon={<CrownOutlined />}>
            {verify.type === 0 ? "UP主认证" : "机构认证"}
        </Tag>
    );
};

/**
 * 获取会员标签
 */
export const getVipTag = (vip: FansItem["vip"]): React.ReactNode => {
    if (vip.vipStatus === 0) return null;
    return (
        <Tag color="magenta">
            {vip.vipType === 1 ? "月度大会员" : "年度大会员"}
        </Tag>
    );
};

/**
 * 用户头像列配置
 */
export const avatarColumn: ColumnsType<FansItem>[number] = {
    title: "头像",
    dataIndex: "face",
    key: "face",
    width: 80,
    render: (face: string) => (
        <Avatar src={face} size={48} icon={<UserOutlined />} />
    ),
};

/**
 * 用户昵称列配置
 */
export const usernameColumn: ColumnsType<FansItem>[number] = {
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
};

/**
 * 签名列配置
 */
export const signColumn: ColumnsType<FansItem>[number] = {
    title: "签名",
    dataIndex: "sign",
    key: "sign",
    ellipsis: true,
    render: (sign: string) => sign || "-",
};

/**
 * 认证/会员标签列配置
 */
export const tagsColumn: ColumnsType<FansItem>[number] = {
    title: "认证/会员",
    key: "tags",
    width: 180,
    render: (_, record) => (
        <Space>
            {getVerifyTag(record.official_verify)}
            {getVipTag(record.vip)}
        </Space>
    ),
};

/**
 * 关注时间列配置
 */
export const followTimeColumn: ColumnsType<FansItem>[number] = {
    title: "关注时间",
    dataIndex: "mtime",
    key: "mtime",
    width: 120,
    render: (mtime: number) => formatTime(mtime),
};

/**
 * 关系状态列配置
 */
export const relationColumn: ColumnsType<FansItem>[number] = {
    title: "关系",
    dataIndex: "attribute",
    key: "attribute",
    width: 100,
    render: (attribute: number) => {
        const relation = getRelationInfo(attribute);
        return <Tag color={relation.color}>{relation.text}</Tag>;
    },
};

/**
 * 获取基础用户列配置
 * 包含: 头像、昵称、签名、认证/会员、关注时间
 */
export const getBaseUserColumns = (): ColumnsType<FansItem> => [
    avatarColumn,
    usernameColumn,
    signColumn,
    tagsColumn,
    followTimeColumn,
];
