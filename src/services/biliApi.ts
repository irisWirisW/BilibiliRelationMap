import { FansResponse, CommonFollowingsResponse } from '../types/bilibili'
import { cacheManager } from '../utils/cacheManager'

/**
 * 获取当前用户的 mid
 * 从页面中提取或使用默认值
 */
export const getCurrentUserMid = (): number => {
  // 尝试从页面 URL 获取
  const match = window.location.href.match(/space\.bilibili\.com\/(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }

  // 尝试从页面元素获取
  const midElement = document.querySelector('[data-usercard-mid]')
  if (midElement) {
    const mid = midElement.getAttribute('data-usercard-mid')
    if (mid) return parseInt(mid, 10)
  }

  // 返回 0 表示需要用户提供
  return 0
}

interface GetFansListParams {
  vmid: number
  ps?: number // 每页项数，默认 50
  pn?: number // 页码，默认 1
  offset?: string // 偏移量
}

/**
 * 获取粉丝列表
 * 使用 GM_xmlhttpRequest 发起跨域请求
 */
export const getFansList = (params: GetFansListParams): Promise<FansResponse> => {
  return new Promise((resolve, reject) => {
    const { vmid, ps = 20, pn = 1, offset } = params

    const url = new URL('https://api.bilibili.com/x/relation/fans')
    url.searchParams.append('vmid', vmid.toString())
    url.searchParams.append('ps', ps.toString())
    url.searchParams.append('pn', pn.toString())
    if (offset) {
      url.searchParams.append('offset', offset)
    }

    GM_xmlhttpRequest({
      method: 'GET',
      url: url.toString(),
      onload: (response) => {
        try {
          const data: FansResponse = JSON.parse(response.responseText)
          if (data.code === 0) {
            resolve(data)
          } else {
            reject(new Error(data.message || '请求失败'))
          }
        } catch (error) {
          reject(new Error('解析响应失败'))
        }
      },
      onerror: (error) => {
        reject(new Error('网络请求失败'))
      }
    })
  })
}

/**
 * 获取关注列表
 * 使用 GM_xmlhttpRequest 发起跨域请求
 */
export const getFollowingsList = (params: GetFansListParams): Promise<FansResponse> => {
  return new Promise((resolve, reject) => {
    const { vmid, ps = 20, pn = 1 } = params

    const url = new URL('https://api.bilibili.com/x/relation/followings')
    url.searchParams.append('vmid', vmid.toString())
    url.searchParams.append('ps', ps.toString())
    url.searchParams.append('pn', pn.toString())

    GM_xmlhttpRequest({
      method: 'GET',
      url: url.toString(),
      onload: (response) => {
        try {
          const data: FansResponse = JSON.parse(response.responseText)
          if (data.code === 0) {
            resolve(data)
          } else {
            reject(new Error(data.message || '请求失败'))
          }
        } catch (error) {
          reject(new Error('解析响应失败'))
        }
      },
      onerror: (error) => {
        reject(new Error('网络请求失败'))
      }
    })
  })
}

/**
 * 获取共同关注列表
 * 使用缓存机制，避免重复请求
 */
export const getCommonFollowings = async (
  vmid: number,
  useCache: boolean = true
): Promise<CommonFollowingsResponse> => {
  const cacheKey = `common_followings_${vmid}`

  // 先查询缓存
  if (useCache) {
    const cached = cacheManager.get<CommonFollowingsResponse>(cacheKey)
    if (cached) {
      console.log(`从缓存加载共同关注 (mid: ${vmid})`)
      return cached
    }
  }

  // 缓存未命中，发起请求
  return new Promise((resolve, reject) => {
    const url = new URL('https://api.bilibili.com/x/relation/followings/followed_upper')
    url.searchParams.append('vmid', vmid.toString())

    GM_xmlhttpRequest({
      method: 'GET',
      url: url.toString(),
      onload: (response) => {
        try {
          const data: CommonFollowingsResponse = JSON.parse(response.responseText)
          if (data.code === 0) {
            // 存入缓存
            cacheManager.set(cacheKey, data)
            console.log(`API 请求共同关注 (mid: ${vmid}), 已缓存`)
            resolve(data)
          } else {
            reject(new Error(data.message || '请求失败'))
          }
        } catch (error) {
          reject(new Error('解析响应失败'))
        }
      },
      onerror: (error) => {
        reject(new Error('网络请求失败'))
      }
    })
  })
}
