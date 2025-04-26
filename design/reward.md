# Reward 功能设计文档

## 1. 概述

Reward (奖励) 功能是 Task Genius 插件的一个激励模块，旨在通过在用户完成任务时提供随机或有条件的奖励，提升用户的积极性和任务完成动力。用户可以自定义奖励列表、触发条件和概率，使得完成任务更具趣味性。

## 2. 核心功能

-   **奖励定义**: 用户可以在指定的 Markdown 文件中定义奖励列表，每行一个奖励。
-   **奖励属性**:
    -   **名称 (Name)**: 奖励的描述性文字 (例如, "喝杯好茶", "看一集喜欢的剧")。
    -   **稀有度/出现率 (Occurrence)**: 定义奖励出现的频率 (例如, `common`, `rare`, `legendary`)。允许自定义稀有度等级及其概率。默认为 `common`。
    -   **库存 (Inventory)**: 定义奖励可用的次数。每次获得奖励后，库存会自动减少。库存为 0 后该奖励不再出现。默认为无限。
    -   **图片 (Image)**: 可选，指定一个图片 URL (本地或网络)，在获得奖励时显示。
    -   **条件 (Condition)**: 可选，指定奖励触发的条件，例如要求任务包含特定标签 (`#difficult`, `#project`) 或满足特定优先级。支持简单的逻辑组合 (AND, OR, NOT)。
-   **触发机制**: 监听 Task View 或者 Task Genius 本身的任务完成事件。
-   **奖励抽取**:
    -   当任务完成时，根据任务属性 (标签、优先级、内容) 筛选符合条件的奖励。
    -   根据符合条件的奖励的稀有度进行加权随机抽取。
    -   考虑奖励库存。
-   **奖励通知**: 通过 Obsidian 的通知系统或者自定义模态框向用户显示获得的奖励信息（名称、图片）。
-   **跳过奖励**: 用户可以选择跳过当前获得的奖励，跳过后不消耗库存。
-   **库存管理**: 如果奖励被接受（未跳过）且有库存限制，自动更新奖励定义文件中的库存数量。
-   **配置管理**: 提供设置界面，用于配置奖励文件路径、稀有度等级、条件语法等。
-   **快速开始**: 跳转到设置中的奖励设置页面。

## 3. 数据结构

### 3.1 奖励定义 (Reward Item)

奖励定义存储在一个 JSON 文件中 (例如 `rewards.json`)。该文件包含一个 JSON 数组，每个数组元素是一个代表奖励的 JSON 对象。

*示例 (`rewards.json`):*

```json
[
  {
    "id": "reward-tea", // 用户定义的唯一 ID
    "name": "喝杯好茶",
    "occurrence": "common"
    // inventory 默认为无限
  },
  {
    "id": "reward-series-episode",
    "name": "看一集喜欢的剧",
    "occurrence": "rare",
    "inventory": 20
  },
  {
    "id": "reward-champagne-project",
    "name": "打开那瓶珍藏的香槟",
    "occurrence": "legendary",
    "inventory": 1,
    "condition": "#project AND #milestone" // 条件仍可定义
  },
  {
    "id": "reward-chocolate-quick",
    "name": "吃块巧克力",
    "occurrence": "common",
    "inventory": 10,
    "condition": "#quickwin",
    "imageUrl": "app://local/C:/images/chocolate.png" // 图片 URL
  }
]
```

### 3.2 内部奖励对象 (Parsed Reward Object)

```typescript
interface RewardCondition {
  raw: string; // e.g., "#project AND #milestone"
  // Parsed structure for evaluation, e.g.,:
  // { type: 'AND', conditions: [{ type: 'TAG', value: 'project' }, { type: 'TAG', value: 'milestone' }] }
  // Or a function: (task: Task) => boolean
}

interface Reward {
  id: string;          // Unique identifier (e.g., generated hash or line number)
  name: string;        // The reward text
  occurrence: string;  // Name of the occurrence level (e.g., "common", "rare"). Needs mapping to probability.
  probability?: number; // Calculated probability based on occurrence level
  inventory: number;   // Remaining count (Infinity for unlimited)
  imageUrl?: string;   // Optional image URL
  condition?: RewardCondition; // Optional condition for triggering
}
```

### 3.3 奖励设置 (Reward Settings)

```typescript
interface OccurrenceLevel {
  name: string;
  chance: number; // Probability percentage (e.g., 70 for 70%)
}

interface RewardSettings {
  rewardFilePath: string; // Path to the rewards JSON file (default: rewards.json)
  occurrenceLevels: OccurrenceLevel[]; // e.g., [{ name: 'common', chance: 70 }, { name: 'rare', chance: 25 }, { name: 'legendary', chance: 5 }]
  conditionSyntax: 'tags' | 'dataview' | 'simple_keywords'; // How conditions are defined and parsed
  enableRewards: boolean; // Master switch
  // Tag condition logic (default AND?) - Future enhancement
  // Formatting for reward attributes in file (default {}) - Future enhancement
}
```

### 3.4 奖励缓存 (Internal Cache)

```typescript
interface RewardCache {
  rewards: Reward[]; // Parsed list of all available rewards
  filePath: string; // Path of the file the cache is based on
  lastModified: number; // Timestamp of the reward file when last parsed
}
```

## 4. 实现方案

1.  **加载与解析**:
    *   使用 Task Genius 的设置中的 Reward 部分，读取为 RewardItem 列表。
2.  **任务完成挂钩 (Hook)**:
    *   监听 Task Genius 内部的任务完成事件 ( Task Genius 提供事件总线 `this.app.workspace.on('task-genius:task-completed', task => ...)` )。
    *   获取完成的任务对象 (`task`)，包含其文本、标签、优先级等信息。
3.  **奖励筛选**:
    *   遍历上述流程中的 RewardItem 列表。
    *   对于每个 `RewardItem`，检查其 `inventory` 是否大于 0 (或为无限)。
    *   如果 `RewardItem` 有 `condition`，则使用任务信息 (`task`) 对其进行评估。只保留条件满足的奖励。 (例如, `condition.evaluate(task)` 返回 `true`)。
4.  **奖励抽取**:
    *   从筛选后的奖励列表中，根据各自的 `occurrence` (对应的 `chance`) 进行加权随机抽取。
    *   例如，如果剩下 Common (70%), Rare (25%), Legendary (5%) 的奖励，按此概率分布随机选择一个。
5.  **通知与交互**:
    *   如果抽中奖励，显示 Obsidian 通知 (`new Notice(...)`) 或一个更丰富的模态框，包含奖励名称、图片（若有），以及 "领取" (隐式关闭) 和 "跳过" 按钮。
6.  **库存更新**:
    *   如果用户 **没有** 点击 "跳过"，并且抽中的奖励 `inventory` 不是无限 (`Infinity`)：
        *   将 `RewardItem` 中对应奖励的 `inventory` 减 1。
        *   **更新奖励文件**: 更新 Task Genius 的设置中的 Reward 部分对应的 `RewardItem` 的 `inventory` 字段。
		
## 5. UI 设计

-   **奖励通知**:
    -   使用 Obsidian 的 `Notice` API 显示简短通知，包含奖励名称和可选的 "跳过" 按钮。
    -   或者，使用 Obsidian 的 `Modal` API 创建一个更醒目的弹窗，可以展示图片和更清晰的按钮。
-   **设置界面**:
    -   在 Task Genius 的设置面板中增加 "Rewards" 标签页。
    -   包含字段：启用/禁用开关、奖励文件路径输入框、稀有度等级配置（允许增删改名称和概率）、条件解析方式选择等。

## 6. 设置

-   **Enable Rewards**: 总开关，启用或禁用奖励功能。
-   **Reward Items**: 可以新增条目来配置奖励项目。
-   **Occurrence Levels**: 点击每个 Reward Item 能配置稀有度等级及其对应的抽取概率（分成三档，默认是 common, rare, legendary）。
-   **Condition Settings**: 配置每个 Reward Item 的触发条件，置空则默认加入队列随机触发。

## 7. 开放问题与未来考虑

-   **复杂的条件逻辑**: 如何优雅地支持 AND, OR, NOT 组合，甚至 Dataview 查询作为奖励条件？
-   **奖励历史/统计**: 记录用户获得的奖励历史。
-   **与其他插件的集成**: 能否从其他插件（如 Habitica、游戏化插件）获取奖励定义或触发奖励？
-   **奖励分组/分类**: 允许用户将奖励分组（例如，按项目、按类型），并可能根据任务的上下文优先选择某个组的奖励。
-   **UI/UX**: 如何使奖励通知既有效又不打扰用户流程？是否需要更丰富的奖励展示界面？
-   **与 Habit 功能联动**: 能否在完成某个习惯打卡时也触发奖励？
