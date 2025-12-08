# DAGGraphView 组件

基于 force-graph 的 DAG（有向无环图）可视化组件，用于展示层级结构数据。

## 功能特性

- ✅ 支持 CSV 数据导入
- ✅ 多种 DAG 布局方向（上下、左右、径向等）
- ✅ 自动按模块着色
- ✅ 动态粒子效果
- ✅ 节点大小反映层级深度
- ✅ 自适应碰撞检测

## 使用方式

### 在你的应用中引入

```tsx
import DAGGraphView from "@/components/DAGGraphView";

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <DAGGraphView />
    </div>
  );
}
```

### CSV 数据格式

组件接受以下格式的 CSV 数据：

```csv
size,path
100,root
50,root/module1
30,root/module1/file1
25,root/module1/file2
50,root/module2
30,root/module2/file3
```

**字段说明：**
- `size`: 节点大小（数值）
- `path`: 节点路径（用 `/` 分隔的层级结构）

### DAG 布局方向

| 值 | 说明 |
|---|---|
| `td` | 上下（Top-Down） |
| `bu` | 下上（Bottom-Up） |
| `lr` | 左右（Left-Right） |
| `rl` | 右左（Right-Left） |
| `radialout` | 径向向外 |
| `radialin` | 径向向内 |
| `null` | 自由布局 |

## 配置参数

组件内置了以下配置：

```typescript
const NODE_REL_SIZE = 1;           // 节点相对大小
const DAG_LEVEL_DISTANCE = 300;    // DAG 层级间距
const VELOCITY_DECAY = 0.3;        // 速度衰减系数
```

## 交互功能

- **拖拽**: 拖动画布查看不同区域
- **缩放**: 鼠标滚轮缩放
- **悬停**: 显示节点完整路径
- **粒子动画**: 沿边的方向展示数据流动

## 示例数据

组件提供了"加载示例数据"按钮，会尝试从 `/resources/d3-dependencies.csv` 加载示例数据。

你可以使用项目中的 `resources/d3-dependencies.csv` 文件作为示例。

## 对比原始 HTML 版本

原始版本使用：
- CDN 引入 force-graph
- ESM.sh 动态导入 d3-dsv 和 dat.gui
- 全局脚本

React 版本改进：
- ✅ npm 包管理依赖
- ✅ TypeScript 类型安全
- ✅ Ant Design UI 组件
- ✅ React 状态管理
- ✅ 更好的错误处理
- ✅ 响应式布局
