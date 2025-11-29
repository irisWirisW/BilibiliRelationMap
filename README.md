# Bilibili React Helper

<p align="center">
  <strong>基于 React + TypeScript + Ant Design 构建的哔哩哔哩增强脚本</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2.0-61dafb?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.3.3-3178c6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Ant%20Design-5.12.5-0170fe?logo=antdesign" alt="Ant Design">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/Version-0.0.7-blue" alt="Version">
</p>

## 📖 项目简介

这是一个现代化的油猴脚本（Userscript）项目，使用 React 18 框架和 Ant Design 5 组件库构建。脚本为哔哩哔哩网站提供了增强功能，帮助用户更好地管理和可视化社交关系。

### ✨ 核心特性

- 🎯 **粉丝列表查看** - 分页浏览粉丝，查看详细信息和关注关系
- 👥 **关注列表管理** - 查看关注用户，支持展开共同关注
- 🕸️ **关注网络图** - 交互式可视化关注关系网络
- 🎨 **现代化 UI** - 基于 Ant Design 5 的专业界面
- 📱 **响应式设计** - 适配不同屏幕尺寸
- 💾 **智能缓存** - LocalStorage 缓存，减少 API 调用
- ⚡ **性能优化** - 批量加载，分页处理，流畅体验

## ⚠️ 重要声明

**本项目仅供学习和研究使用，请勿用于任何商业用途或违反相关服务条款的行为。**

### 数据获取说明

- **所有数据均为公开数据**：本脚本获取的所有数据（粉丝列表、关注列表等）都是可以通过手动点击用户主页的"关注者"、"粉丝"等标签页获取的公开信息。
- **无特殊权限请求**：脚本不会获取任何需要特殊权限才能访问的私密数据。
- **合规性**：脚本仅使用 Bilibili 官方公开的 API 接口，不涉及任何越权操作或数据爬取。

### 使用限制

- 本项目代码仅供个人学习、研究和技术交流使用
- 请遵守 Bilibili 的用户协议和服务条款
- 请勿用于任何可能侵犯他人隐私或违反法律法规的行为
- 使用本脚本所产生的任何后果由使用者自行承担

---

## 📸 功能预览

![关注网络图可视化](resources/run.png)

<p align="center"><em>关注网络图功能：交互式可视化展示关注关系网络，支持节点悬停、点击交互和参数调试</em></p>

## 🚀 主要功能

### 1️⃣ 粉丝列表
- 📊 分页加载粉丝列表（每页 20 条）
- 👤 显示用户头像、昵称、签名
- 🏷️ 认证状态、大会员标识
- 💫 关注关系标签（未关注/已关注/互相关注/已拉黑）
- 🔗 点击跳转用户空间
- ⏰ 关注时间显示

### 2️⃣ 关注列表
- 📋 分页浏览关注用户
- 🤝 **共同关注展开** - 点击展开查看与该用户的共同关注
- 📈 共同关注数量统计
- 🎯 批量加载优化（5个/批，500ms延迟）
- 🖼️ 网格布局展示共同关注

### 3️⃣ 关注网络图
- 🌐 **交互式网络可视化** - 基于 Cosmograph WebGL 渲染
- 🎨 **节点着色** - 普通用户（青色）/ 大会员（粉色）
- 📏 **动态节点大小** - 根据关注关系数量自动调整
- 🖱️ **鼠标交互**
  - 悬停：显示用户名 + 高亮邻接节点
  - 点击：跳转用户空间
- 🧪 **调试面板** - 实时调整物理参数（重力、斥力、摩擦力等）
- 📊 **统计信息** - 总关注数、有关系节点、孤立节点、边数
- 🔍 **智能过滤** - 自动隐藏孤立节点

## 技术栈

- **React 18** - 现代化的 UI 框架
- **TypeScript** - 类型安全的 JavaScript 超集
- **Ant Design 5** - 企业级 UI 组件库
- **Webpack 5** - 模块打包工具
- **Cosmograph** - 图形可视化库
- **Less** - CSS 预处理器

## 开发环境要求

- Node.js 16+
- pnpm (推荐) / npm / yarn

## 📦 安装与使用

### 方式一：直接安装（推荐用户）

1. **安装油猴扩展**
   - Chrome/Edge: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Greasemonkey](https://addons.mozilla.org/firefox/addon/greasemonkey/)

2. **安装脚本**
   - [安装](https://raw.githubusercontent.com/irisWirisW/BilibiliRelationMap/master/script.user.js)

3. **使用脚本**
   - 访问任意哔哩哔哩用户空间页面（`space.bilibili.com/:uid`）
   - 点击页面右下角的 🚀 浮动按钮
   - 在弹出的窗口中选择功能标签页

### 方式二：开发调试

#### 1. 克隆项目

```bash
git clone https://github.com/irisWirisW/BilibiliRelationMap.git
cd BilibiliRelationMap
```

#### 2. 安装依赖

```bash
# 使用 pnpm (推荐)
pnpm install

# 或使用 npm
npm install

# 或使用 yarn
yarn install
```

#### 3. 开发模式

```bash
pnpm dev
```

开发模式下会监听文件变化并自动重新构建。构建产物在 `dist/script.user.js`。

#### 4. 构建生产版本

```bash
# 普通构建（不更新版本号）
pnpm build

# 构建并递增 patch 版本号（0.0.x）
pnpm build:patch

# 构建并递增 minor 版本号（0.x.0）
pnpm build:minor
```

**版本号说明：**
- `build:patch` - 递增修订版本号，例如 1.0.0 → 1.0.1（用于 bug 修复）
- `build:minor` - 递增次版本号并重置修订号，例如 1.0.5 → 1.1.0（用于新功能）
- 版本号会同步更新到 `package.json` 和 `src/metadata.json`

#### 5. 类型检查

```bash
pnpm type-check
```

## 📁 项目结构

```
BilibiliRelationMap/
├── src/
│   ├── components/              # React 组件
│   │   ├── FloatingButton.tsx   # 🚀 浮动按钮组件（脚本入口）
│   │   ├── InfoModal.tsx        # 📋 信息弹窗组件（主容器）
│   │   ├── FansList.tsx         # 👥 粉丝列表组件
│   │   ├── FollowingsList.tsx   # 💫 关注列表组件（支持共同关注展开）
│   │   └── FollowingsGraph.tsx  # 🕸️ 关注网络图组件（~1000 行）
│   ├── services/                # 业务逻辑层
│   │   └── biliApi.ts           # 📡 Bilibili API 调用封装
│   ├── contexts/                # React Context
│   │   └── AppContext.tsx       # 🌐 应用全局上下文
│   ├── types/                   # TypeScript 类型定义
│   │   └── bilibili.ts          # 📝 Bilibili API 响应类型
│   ├── utils/                   # 工具函数
│   │   └── cacheManager.ts      # 💾 LocalStorage 缓存管理
│   ├── styles/                  # 样式文件
│   │   └── index.css            # 🎨 全局样式
│   ├── App.tsx                  # ⚛️ React 应用主组件
│   ├── index.tsx                # 🚪 入口文件（DOM 挂载）
│   └── metadata.json            # 📄 油猴脚本元数据
├── scripts/                     # 构建脚本
│   └── bump-version.cjs         # 🔢 版本号递增脚本
├── resources/                   # 资源文件
│   └── run.png                  # 📸 运行截图
├── dist/                        # 构建输出目录
│   └── script.user.js           # 🎯 最终打包的油猴脚本
├── webpack.config.cjs           # ⚙️ Webpack 配置（生产）
├── webpack.config.ts            # ⚙️ Webpack 配置（TypeScript）
├── tsconfig.json                # 📘 TypeScript 配置
├── package.json                 # 📦 项目依赖和脚本
├── .gitignore                   # 🚫 Git 忽略文件
├── LICENSE                      # 📜 MIT 许可证
└── README.md                    # 📖 项目文档
```

## 🛠️ 开发说明

### 构建流程

项目使用 **Webpack 5** 打包，配置文件为 `webpack.config.cjs`。构建过程：

1. **编译 TypeScript** - 使用 ts-loader 编译 TS/TSX 代码
2. **处理样式** - 处理 Less/CSS 文件并内联到 JS
3. **单文件打包** - 将所有依赖（React、Ant Design等）打包到单个文件
4. **添加元数据** - 自动添加油猴脚本头部信息（来自 `src/metadata.json`）
5. **代码压缩** - 使用 Terser 最小化代码，保留脚本注释

### 脚本元数据

脚本的元数据配置在 `src/metadata.json` 中：

```json
{
  "name": "Bilibili React Helper",
  "version": "0.0.7",
  "description": "基于 React + TypeScript + Ant Design 的哔哩哔哩增强脚本",
  "author": "1ris_W",
  "match": "*://*.bilibili.com/*",
  "grant": ["GM_xmlhttpRequest", "GM_cookie"],
  "run-at": "document-end"
}
```

**关键配置说明：**
- `match` - 脚本在哔哩哔哩所有页面运行
- `grant` - 申请跨域请求和 Cookie 访问权限
- `run-at: document-end` - 在页面加载完成后运行

### 核心技术实现

#### 1. 跨域 API 调用

使用 Tampermonkey 提供的 `GM_xmlhttpRequest` API 突破浏览器同源限制：

```typescript
// src/services/biliApi.ts
export const getFansList = (params) => {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      url: `https://api.bilibili.com/x/relation/fans?${queryString}`,
      method: 'GET',
      onload: (response) => resolve(JSON.parse(response.responseText)),
      onerror: (error) => reject(error)
    })
  })
}
```

#### 2. 智能缓存机制

使用 LocalStorage 缓存共同关注数据，避免重复请求：

```typescript
// src/utils/cacheManager.ts
class CacheManager {
  set<T>(key: string, data: T) {
    const item = { data, expiry: Date.now() + 24 * 60 * 60 * 1000 } // 1天过期
    localStorage.setItem(key, JSON.stringify(item))
  }

  get<T>(key: string): T | null {
    const item = localStorage.getItem(key)
    if (!item) return null
    const { data, expiry } = JSON.parse(item)
    if (Date.now() > expiry) {
      this.remove(key)
      return null
    }
    return data
  }
}
```

#### 3. 批量加载优化

避免 API 频率限制，分批加载共同关注：

```typescript
// 每批5个请求，间隔500ms
const loadCommonFollowingsBatch = async (mids: number[]) => {
  const batchSize = 5
  const delay = 500

  for (let i = 0; i < mids.length; i += batchSize) {
    const batch = mids.slice(i, i + batchSize)
    await Promise.all(batch.map(mid => loadCommonFollowing(mid)))
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}
```

#### 4. 图形可视化

使用 Cosmograph 库实现高性能网络图：

```typescript
// 节点配置
const graph = new Cosmograph({
  nodeColor: (node) => node.vip ? '#fb7299' : '#00d5e9', // 会员/普通
  nodeSize: (node) => Math.log(node.connections + 1) * 2, // 对数增长
  linkColor: '#00d5e9',
  // ... 物理模拟参数
})
```

## 📚 主要依赖

### 运行时依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `react` | 18.2.0 | UI 框架 |
| `react-dom` | 18.2.0 | React DOM 渲染 |
| `antd` | 5.12.5 | UI 组件库 |
| `@ant-design/icons` | 6.1.0 | 图标库 |
| `@cosmograph/cosmograph` | 1.4.2 | 图形可视化（WebGL） |

### 开发依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| `typescript` | 5.3.3 | TypeScript 编译器 |
| `webpack` | 5.89.0 | 模块打包工具 |
| `webpack-cli` | 5.1.4 | Webpack 命令行工具 |
| `ts-loader` | 9.5.1 | TypeScript 加载器 |
| `less` | 4.2.0 | CSS 预处理器 |
| `less-loader` | 11.1.3 | Less 加载器 |
| `css-loader` | 6.8.1 | CSS 加载器 |
| `style-loader` | 3.3.3 | 样式注入器 |

## ❓ 常见问题

<details>
<summary><strong>Q: 脚本为什么无法加载？</strong></summary>

A: 请检查：
1. 是否已安装 Tampermonkey/Greasemonkey 扩展
2. 是否在哔哩哔哩用户空间页面（`space.bilibili.com/:uid`）
3. 扩展是否启用该脚本
4. 浏览器控制台是否有报错信息
</details>

<details>
<summary><strong>Q: 关注网络图加载很慢？</strong></summary>

A:
- 关注数量较多时需要加载时间，属于正常现象
- 脚本会显示加载进度
- 已加载的共同关注数据会缓存 1 天
- 建议使用调试面板调整参数优化显示效果
</details>

<details>
<summary><strong>Q: 如何贡献代码？</strong></summary>

A:
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request
</details>

<details>
<summary><strong>Q: 构建失败怎么办？</strong></summary>

A:
1. 确保 Node.js 版本 >= 16
2. 删除 `node_modules` 和 `dist` 文件夹
3. 重新安装依赖：`pnpm install`
4. 运行类型检查：`pnpm type-check`
5. 重新构建：`pnpm build`
</details>

## 🗺️ Roadmap

- [ ] 支持更多数据维度（关注时长、互动频率等）
- [ ] 添加关系分析功能（关注圈分析、影响力评估）
- [ ] 支持导出数据（JSON、CSV 格式）
- [ ] 优化大数据量加载性能
- [ ] 添加暗黑模式支持
- [ ] 多语言支持（英文）
- [ ] 移动端适配优化

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

**贡献步骤：**
1. Fork 项目
2. 创建特性分支
3. 提交代码并编写清晰的 commit message
4. 确保通过类型检查 (`pnpm type-check`)
5. 提交 Pull Request

**代码规范：**
- 使用 TypeScript 严格模式
- 遵循 React Hooks 最佳实践
- 组件使用函数式写法
- 添加必要的类型注解和注释

## 🙏 致谢

- [Bilibili-Evolved](https://github.com/the1812/Bilibili-Evolved) - 构建方案参考
- [Cosmograph](https://cosmograph.app/) - 图形可视化库
- [Ant Design](https://ant.design/) - UI 组件库
- [React](https://react.dev/) - UI 框架

## Star History

如果这个项目对你有帮助，欢迎给个 Star ⭐️

[![Star History Chart](https://api.star-history.com/svg?repos=irisWirisW/BilibiliRelationMap&type=date&legend=top-left)](https://www.star-history.com/#irisWirisW/BilibiliRelationMap&type=date&legend=top-left)
