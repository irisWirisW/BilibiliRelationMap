/**
 * 缓存管理工具
 * 使用 localStorage 存储数据，支持过期时间
 */

interface CacheItem<T> {
  data: T
  expiry: number // 过期时间戳
}

interface CacheConfig {
  expiryDays: number // 过期天数，默认 1 天
}

const DEFAULT_CONFIG: CacheConfig = {
  expiryDays: 1
}

class CacheManager {
  private prefix = 'bilibili_helper_'
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T): void {
    const expiry = Date.now() + this.config.expiryDays * 24 * 60 * 60 * 1000
    const cacheItem: CacheItem<T> = { data, expiry }

    try {
      localStorage.setItem(
        this.prefix + key,
        JSON.stringify(cacheItem)
      )
    } catch (error) {
      console.error('缓存写入失败:', error)
    }
  }

  /**
   * 获取缓存
   * 如果缓存不存在或已过期，返回 null
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (!item) return null

      const cacheItem: CacheItem<T> = JSON.parse(item)

      // 检查是否过期
      if (Date.now() > cacheItem.expiry) {
        this.remove(key)
        return null
      }

      return cacheItem.data
    } catch (error) {
      console.error('缓存读取失败:', error)
      return null
    }
  }

  /**
   * 删除缓存
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (error) {
      console.error('缓存删除失败:', error)
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// 导出单例
export const cacheManager = new CacheManager()
