// Bilibili API 类型定义

export interface OfficialVerify {
  type: number // -1: 无, 0: UP主认证, 1: 机构认证
  desc: string
}

export interface VipLabel {
  path: string
  text: string
  label_theme: string
  text_color: string
  bg_style: number
  bg_color: string
  border_color: string
}

export interface VipInfo {
  vipType: number // 0: 无, 1: 月度大会员, 2: 年度以上大会员
  vipDueDate: number
  dueRemark: string
  accessStatus: number
  vipStatus: number // 0: 无, 1: 有
  vipStatusWarn: string
  themeType: number
  label: VipLabel
  avatar_subscript: number
  nickname_color: string
  avatar_subscript_url: string
}

export interface ContractInfo {
  is_contract?: boolean
  is_contractor?: boolean
  ts?: number
  user_attr?: number
}

export interface FansItem {
  mid: number
  attribute: number // 0: 未关注, 2: 已关注, 6: 已互粉, 128: 已拉黑
  mtime: number // 关注时间（秒级时间戳）
  tag: number[] | null
  special: number // 0: 否, 1: 是
  contract_info: ContractInfo
  uname: string
  face: string
  sign: string
  face_nft: number
  official_verify: OfficialVerify
  vip: VipInfo
  name_render: Record<string, any>
  nft_icon: string
  rec_reason: string
  track_id: string
  follow_time: string
}

export interface FansResponse {
  code: number
  message: string
  ttl: number
  data: {
    list: FansItem[]
    offset: string
    re_version: number
    total: number
  }
}

export interface CommonFollowingsResponse {
  code: number
  message: string
  ttl: number
  data: {
    desc: string
    list: FansItem[]
    total: number
  }
}
