# 视图配置弹窗 (View Configuration Dialog) - 功能设计文档

## 1. 概览 (Overview)

### 1.1. 功能名称 (Feature Name)
视图配置弹窗 (View Configuration Dialog)

### 1.2. 目标 (Goal)
提供一个集中式的、用户友好的界面，允许用户定义和管理任务的筛选和排序规则。这些规则将应用于插件内的所有相关任务视图，从而统一和简化用户查看和组织任务的方式。

### 1.3. 核心价值 (Core Value)
- **易用性**: 通过图形界面简化复杂的筛选和排序逻辑配置。
- **一致性**: 应用统一的视图配置，确保在不同地方查看任务时行为一致。
- **灵活性**: 支持多种筛选条件、条件组和排序规则的组合。
- **效率**: 通过预设功能，快速切换不同的视图配置，适应不同工作场景。

## 2. 用户界面 (UI) 设计

### 2.1. 入口 (Access Point)
- 在任务视图的主界面（例如，某个全局视图控制区域或特定视图的设置入口），提供一个按钮或菜单项，如"配置视图"、"筛选与排序"或一个设置图标。
- 点击该入口将打开一个模态弹窗。

### 2.2. 弹窗布局 (Pop-up Layout)
弹窗从上到下主要分为以下区域：

```
+------------------------------------------------------+
| 视图配置 [ X ] 关闭 |
+------------------------------------------------------+
| 预设 (Presets) |
| [选择一个预设 v] [保存] [另存为...] [删除] |
+------------------------------------------------------+
| 筛选 (Filters) |
| [ 所有/任一 v ] 条件满足 |
| +------------------------------------------------+ |
| | [属性 v] [操作符 v] [值输入欄] [ </> ] [🗑️] |
| | [ AND/OR ] |
| | +-- Group -----------------------------------+ |
| | | [属性 v] [操作符 v] [值输入欄] [ </> ] [🗑️] |
| | +--------------------------------------------+ |
| +------------------------------------------------+ |
| [+ 添加条件] [+ 添加条件组] |
+------------------------------------------------------+
| 排序 (Sorting) |
| +------------------------------------------------+ |
| | 排序依据: [属性 v] 顺序: [升序/降序 v] [⬆️][⬇️][🗑️] |
| +------------------------------------------------+ |
| [+ 添加排序规则] |
+------------------------------------------------------+
| [ 应用/保存配置 ] [ 取消 ] |
+------------------------------------------------------+
```

**图例说明:**
- `[ 关闭 ]`: 关闭弹窗按钮。
- `[选择一个预设 v]`: 下拉菜单选择已保存的预设。
- `[保存]`: 保存对当前选中预设的修改。
- `[另存为...]`: 将当前配置保存为一个新的预设。
- `[删除]`: 删除当前选中的预设。
- `[ 所有/任一 v ]`: 筛选条件组的逻辑操作符（AND/OR）。
- `[属性 v]`: 选择任务的属性（如：内容、状态、优先级、截止日期、标签等）。
- `[操作符 v]`: 选择筛选操作符（如：包含、不包含、等于、不等于、大于、小于、为空、不为空等）。
- `[值输入欄]`: 输入筛选条件的值。
- `[ </> ]`: (可选) 切换到高级/表达式模式编辑该条件。
- `[🗑️]`: 删除该条件或排序规则。
- `[+ 添加条件]`: 添加一个新的筛选条件行。
- `[+ 添加条件组]`: 添加一个嵌套的筛选条件组。
- `[升序/降序 v]`: 选择排序方向。
- `[⬆️][⬇️]`: 调整排序规则的优先级。
- `[+ 添加排序规则]`: 添加一个新的排序规则行。
- `[ 应用/保存配置 ]`: 保存当前弹窗中的筛选和排序设置，并应用到所有视图。
- `[ 取消 ]`: 关闭弹窗，不保存任何更改。

### 2.3. UI 元素详解 (Detailed UI Elements)

#### 2.3.1. 预设 (Presets)
- **下拉菜单**: 列出所有已保存的预设名称。选择一项会加载其对应的筛选和排序配置到下方区域。包含一个"创建新预设"或"无预设"（即自定义配置）的选项。
- **保存按钮**: 如果当前选中的是一个已存在的预设，则此按钮启用，点击后用当前界面中的配置覆盖该预设。
- **另存为按钮**: 弹出一个输入框，要求用户输入新预设的名称，然后将当前界面中的配置保存为新的预设。
- **删除按钮**: 如果当前选中的是一个已存在的预设，则此按钮启用，点击后会提示用户确认删除该预设。

#### 2.3.2. 筛选区域 (Filtering Area)
- **顶层逻辑操作符**: 一个下拉菜单，允许用户选择顶层筛选条件是"所有条件都满足 (AND)"还是"任一条件满足 (OR)"。
- **筛选条件行 (Filter Condition Row)**:
    - **属性下拉框**: 列出可供筛选的任务属性，例如：
        - `内容 (Content)` (文本)
        - `状态 (Status)` (特定值列表或文本)
        - `优先级 (Priority)` (特定值列表或文本，如 高,中,低 或 🔺, 🔼, 🔽)
        - `截止日期 (Due Date)` (日期)
        - `开始日期 (Start Date)` (日期)
        - `计划日期 (Scheduled Date)` (日期)
        - `标签 (Tags)` (文本，特殊处理包含逻辑)
        - `路径 (File Path)` (文本)
        - `已完成 (Completed)` (布尔值)
    - **操作符下拉框**: 根据所选"属性"的类型动态更新可用的操作符。
        - 文本: `包含 (contains)`, `不包含 (does not contain)`, `等于 (is)`, `不等于 (is not)`, `开头是 (starts with)`, `结尾是 (ends with)`, `为空 (is empty)`, `不为空 (is not empty)`
        - 数字/日期: `等于 (=)`, `不等于 (!=)`, `大于 (>)`, `小于 (<)`, `大于等于 (>=)`, `小于等于 (<=)`, `为空 (is empty)`, `不为空 (is not empty)`
        - 标签: `包含 (contains / has tag)`, `不包含 (does not contain / does not have tag)`
        - 布尔: `是 (is true)`, `否 (is false)`
    - **值输入区**:
        - 文本输入框 (用于文本、部分数字属性)。
        - 日期选择器 (用于日期属性)。
        - 特定值下拉框 (例如用于状态、优先级等预定义值的属性)。
    - **高级编辑按钮 `[ </> ]` (可选)**: 对于复杂条件，允许用户切换到文本模式，直接编写类似 `filterUtils.ts` 中的表达式片段。
    - **删除按钮 `[🗑️]`**: 删除此筛选条件行。
- **筛选条件组 (Filter Condition Group)**:
    - 用户可以通过点击 `[+ 添加条件组]` 来创建一个嵌套的条件组。
    - 每个组内部也拥有自己的逻辑操作符（AND/OR）和一系列条件/子组。
    - 视觉上通过缩进和边框与父级条件区分。
- **添加按钮**:
    - `[+ 添加条件]`: 在当前层级（或选定的组内）添加一个新的筛选条件行。
    - `[+ 添加条件组]`: 在当前层级（或选定的组内）添加一个新的筛选条件组。

#### 2.3.3. 排序区域 (Sorting Area)
- **排序规则行 (Sort Criterion Row)**:
    - **排序依据下拉框**: 列出可供排序的任务属性，与筛选属性类似，但通常是具有可比较性的属性（如：`截止日期`, `优先级`, `内容`, `创建日期`等）。
    - **顺序下拉框**: `升序 (Ascending)` 或 `降序 (Descending)`。
    - **调整优先级按钮 `[⬆️][⬇️]`**: 允许用户上下移动排序规则，决定排序的优先顺序（首要排序依据、次要排序依据等）。
    - **删除按钮 `[🗑️]`**: 删除此排序规则。
- **添加按钮 `[+ 添加排序规则]`**: 添加一个新的排序规则行。

## 3. 交互模型 (Interaction Model)

### 3.1. 打开弹窗 (Opening the Pop-up)
- 点击入口后，弹窗显示。
- 默认情况下，弹窗可能加载当前全局应用的筛选和排序配置，或者上一次在弹窗中编辑但未保存的临时配置，或者一个默认的空配置。

### 3.2. 预设管理 (Preset Management)
- **选择预设**: 从下拉菜单选择一个预设。界面下方的筛选和排序区域将更新以反映所选预设的配置。
- **保存/更新预设**:
    - 如果当前选择的是一个已存在的预设，并且用户修改了筛选或排序配置，"保存"按钮将变为可用。
    - 点击"保存"，当前配置将覆盖所选预设。
- **另存为新预设**:
    - 用户点击"另存为..."按钮。
    - 弹出对话框要求输入新预设的名称。
    - 确认后，当前的筛选和排序配置将保存为一个新的预设条目，并自动选中这个新预设。
- **删除预设**:
    - 用户选择一个预设，然后点击"删除"按钮。
    - 弹出确认对话框。
    - 确认后，该预设从列表中移除。如果被删除的是当前加载的预设，则界面可能清空或加载一个默认状态。

### 3.3. 筛选配置 (Filter Configuration)
- **添加条件/条件组**: 点击相应按钮，在当前焦点所在的层级（顶层或某个组内）添加新的条件行或条件组。
- **删除条件/条件组**: 点击条件行或条件组旁边的 `[🗑️]` 图标。如果删除组，则其内部所有条件一并删除。
- **修改条件**: 用户直接在条件行的属性、操作符、值输入区进行修改。操作符列表会根据属性类型动态变化。
- **修改组逻辑**: 更改条件组头部的"所有/任一 (AND/OR)"选择。

### 3.4. 排序配置 (Sort Configuration)
- **添加排序规则**: 点击 `[+ 添加排序规则]` 按钮，在列表末尾添加一个新的排序规则行。
- **删除排序规则**: 点击规则行旁边的 `[🗑️]` 图标。
- **修改排序规则**: 用户直接在规则行的"排序依据"和"顺序"下拉框中进行选择。
- **调整排序优先级**: 点击 `[⬆️]` 或 `[⬇️]` 按钮，改变规则在列表中的位置。列表顶部的规则具有最高排序优先级。

### 3.5. 保存与应用 (Saving and Applying)
- 用户完成配置后，点击 `[ 应用/保存配置 ]` 按钮。
- 当前弹窗内的筛选和排序配置（无论是否属于某个预设）将被保存为全局/默认的视图配置。
- 触发一个事件或机制，通知所有相关的任务视图更新其显示，根据新的配置重新筛选和排序任务。
- 弹窗关闭。
- 如果用户点击 `[ 取消 ]`，则所有未通过预设"保存"或未点击 `[ 应用/保存配置 ]` 的更改都将丢失，弹窗关闭。

## 4. 数据结构与配置 (Data Structures and Configuration)

### 4.1. 预设对象结构 (Preset Object Structure)
```typescript
interface ViewPreset {
  id: string; // Unique identifier for the preset
  name: string; // User-defined name for the preset
  filterConfig: FilterConfig; // Structure defined below
  sortConfig: SortConfigItem[]; // Array of sort criteria
}
```

### 4.2. 筛选配置结构 (Filter Configuration Structure)
此结构需要能够映射到 `filterUtils.ts` 中的 `FilterNode`。UI上的配置将转换为 `FilterNode` 树。

```typescript
// Represents a single filter condition UI row
interface FilterConditionItem {
  property: string; // e.g., 'content', 'dueDate', 'priority', 'tags.myTag'
  operator: string; // e.g., 'contains', 'is', '>=', 'isEmpty'
  value?: any;     // Value for the condition, type depends on property and operator
  // For advanced mode, could store a raw expression string
  // rawExpression?: string; 
}

// Represents a group of filter conditions in the UI
interface FilterGroupItem {
  logicalOperator: 'AND' | 'OR'; // How conditions/groups within this group are combined
  items: (FilterConditionItem | FilterGroupItem)[]; // Can contain conditions or nested groups
}

// Top-level filter configuration from the UI
type FilterConfig = FilterGroupItem; 
```
**转换逻辑**:
- `FilterGroupItem` 将递归地转换为 `FilterNode` 的 `AND` 或 `OR` 类型。
- `FilterConditionItem` 将转换为 `FilterNode` 的 `TEXT`, `TAG`, `PRIORITY`, `DATE` 等类型，具体取决于 `property` 和 `operator`。
    - 例如: `{ property: 'content', operator: 'contains', value: 'test' }` -> `{ type: 'TEXT', value: 'test' }` (简化示例，实际转换会更复杂，例如处理大小写，或根据操作符调整节点类型或值)
    - `{ property: 'priority', operator: '=', value: 'High' }` -> `{ type: 'PRIORITY', op: '=', value: 'High' }`
    - `{ property: 'dueDate', operator: '<', value: '2024-12-31' }` -> `{ type: 'DATE', op: '<', value: '2024-12-31' }`

### 4.3. 排序配置结构 (Sort Configuration Structure)
此结构直接对应 `sortTaskCommands.ts` 中的 `SortCriterion`。

```typescript
interface SortConfigItem {
  field: string;       // Property to sort by (e.g., 'dueDate', 'priority', 'content')
  order: 'asc' | 'desc'; // Sort order
}

// The overall sort configuration will be an array of these items:
// type SortConfiguration = SortConfigItem[];
```

### 4.4. 存储 (Storage)
- **预设列表 (`ViewPreset[]`)**: 存储在插件的设置 (`settings.json`) 中。
- **当前全局配置**: 当前应用的筛选 (`FilterConfig`) 和排序 (`SortConfigItem[]`) 配置也应存储在插件设置中，作为所有视图的默认配置。预设仅仅是快速加载这些配置的一种方式。

## 5. 与现有系统集成 (Integration with Existing Systems)

### 5.1. `filterUtils.ts`
- **UI 到 `FilterNode` 转换**: 需要编写逻辑将用户在筛选区域创建的 `FilterConfig` (嵌套的 `FilterGroupItem` 和 `FilterConditionItem`) 转换为 `filterUtils.ts` 可以理解的 `FilterNode` 树结构。
- **应用筛选**: 一旦 `FilterNode` 树生成，视图将使用 `evaluateFilterNode` 函数来判断每个任务是否满足筛选条件。
- **属性和操作符**: 需要确保UI中提供的属性和操作符能够有效地映射到 `filterUtils.ts` 中各种 `FilterNode` 类型的判断逻辑。例如，`PRIORITY` 节点需要 `op` 和 `value`，`DATE` 节点也类似。

### 5.2. `sortTaskCommands.ts`
- **UI 到 `SortCriterion[]` 转换**: UI 排序区域的配置 (`SortConfigItem[]`) 可以直接用作 `sortTaskCommands.ts` 中 `sortTasks` 函数所需的 `criteria` 参数。
- **应用排序**: 视图将使用 `sortTasks` 函数（或其核心比较逻辑 `compareTasks`），传入从UI配置生成的 `SortConfigItem[]` 数组和插件设置，对筛选后的任务列表进行排序。
- **可用排序字段**: UI 中"排序依据"下拉框应列出 `compareTasks` 函数支持的排序字段。

### 5.3. 视图更新机制 (View Update Mechanism)
- 当用户点击 `[ 应用/保存配置 ]` 按钮并成功保存新的全局筛选/排序配置后：
    - 插件需要将新的配置（转换后的 `FilterNode` 和 `SortCriterion[]`）存储到其全局设置中。
    - 插件需要触发一个全局事件或调用一个方法，通知所有当前打开的、依赖此配置的任务视图进行刷新。
    - 各视图在收到通知后，会重新获取任务数据，应用新的全局筛选条件和排序规则，然后重新渲染其内容。

## 6. 未来展望 (Future Enhancements)

- **共享预设**: 允许用户导入/导出预设配置。
- **更高级的筛选操作符**: 在UI中直接支持更复杂的筛选逻辑，如正则表达式匹配。
- **实时预览**: 在弹窗中配置时，下方或侧边有一个小区域实时显示符合当前筛选/排序条件的部分任务预览。
- **视图特定配置**: 除了全局配置外，允许用户为单个特定视图覆盖全局配置，并拥有独立的预设（这会增加复杂性，需要权衡）。
- **自然语言输入筛选**: 允许用户通过类似 "tasks due this week with high priority" 的自然语言短语创建筛选。

## 7. 待定问题 (Open Questions)

- **属性列表的来源**: "属性"下拉列表是硬编码的，还是动态生成的（例如，基于用户在 frontmatter 中定义的属性）？初期可以硬编码核心属性，未来可考虑扩展。
- **"无值"的具体实现**: 筛选操作符 "为空 (is empty)" / "不为空 (is not empty)" 如何准确对应到任务数据的实际空值情况 (e.g., `undefined`, `null`, 空字符串)。
- **性能**: 对于非常大的任务列表，频繁更改筛选和排序配置并实时更新所有视图可能会有性能影响，需要关注和优化。
- **错误处理和用户反馈**: 当用户输入无效的筛选值或配置冲突时，如何提供清晰的错误提示。

示例代码：

```HTML
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>可堆叠筛选器 UI - 紧凑型</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
        .filter-group-separator {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0.5rem 0; /* Reduced margin */
            color: #9ca3af; /* gray-400 */
            font-size: 0.75rem; /* Smaller text for separator */
        }
        .filter-group-separator::before,
        .filter-group-separator::after {
            content: '';
            flex-grow: 1;
            height: 1px;
            background-color: #e5e7eb; /* gray-200 */
            margin: 0 0.25rem; /* Reduced margin */
        }
        .drag-handle {
            cursor: grab;
        }
        select {
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 0.3rem center; /* Adjusted position */
            background-repeat: no-repeat;
            background-size: 1.2em 1.2em; /* Adjusted size */
            padding-right: 2rem; /* Reduced padding */
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
        }
        /* Smaller text and padding for buttons and inputs */
        .compact-btn {
            padding: 0.25rem 0.5rem; /* Reduced padding */
            font-size: 0.875rem; /* Smaller font */
        }
        .compact-input, .compact-select {
            padding: 0.35rem 0.5rem; /* Reduced padding */
            font-size: 0.875rem; /* Smaller font */
            height: 2rem; /* Fixed height for better alignment */
        }
        .compact-icon-btn {
            padding: 0.2rem; /* Reduced padding for icon buttons */
        }
        .compact-icon-btn svg {
            width: 14px; /* Smaller icons */
            height: 14px; /* Smaller icons */
        }
        .compact-text {
            font-size: 0.875rem; /* Smaller text for labels */
        }

    </style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.0/Sortable.min.js"></script>
</head>
<body class="bg-slate-50 p-2 md:p-4 min-h-screen flex items-center justify-center">
    <div class="container mx-auto max-w-2xl bg-white p-4 rounded-md shadow-lg"> 
        <div id="root-filter-container" class="space-y-3"> 
            <div class="flex items-center space-x-2 p-2 bg-slate-100 rounded-md border border-slate-200"> 
                <label for="root-condition" class="text-xs font-medium text-slate-600 compact-text">匹配</label>
                <select id="root-condition" class="block w-auto border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-700 compact-select">
                    <option value="any">任意一个</option>
                    <option value="all">所有</option>
                    <option value="none">没有一个</option>
                </select>
                <span class="text-xs text-slate-600 compact-text">筛选器组满足条件</span>
            </div>

            <div id="filter-groups-container" class="space-y-3">
                <div id="filter-group-template" class="filter-group p-3 border border-slate-300 rounded-md bg-white space-y-2 shadow-sm" style="display: none;"> 
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-1.5"> 
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-grip-vertical drag-handle text-slate-400 hover:text-slate-500" viewBox="0 0 16 16">
                                <path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
                            </svg>
                            <label class="text-xs font-medium text-slate-600 compact-text">匹配</label>
                            <select class="group-condition-select block w-auto border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-700 compact-select">
                                <option value="all">所有</option>
                                <option value="any">任意一个</option>
                                <option value="none">没有一个</option>
                            </select>
                            <span class="text-xs text-slate-600 compact-text">此组中的筛选器</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <button type="button" class="duplicate-group-btn text-slate-500 hover:text-indigo-600 rounded-md hover:bg-indigo-50 compact-icon-btn" title="复制筛选器组">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H6zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V5H2z"/>
                                </svg>
                            </button>
                            <button type="button" class="remove-group-btn text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 compact-icon-btn" title="移除筛选器组">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="filters-list space-y-1.5 pl-4 border-l-2 border-slate-200 ml-1.5"> 
                        </div>
                    <div class="pl-4 mt-1.5">
                        <button type="button" class="add-filter-btn text-xs text-indigo-600 hover:text-indigo-800 font-medium rounded-md hover:bg-indigo-50 compact-btn">
                            + 添加筛选器
                        </button>
                    </div>
                </div>

                <div id="filter-item-template" class="filter-item flex items-center space-x-1.5 p-1.5 bg-slate-50 rounded-md" style="display: none;">
                    <span class="filter-conjunction text-2xs font-semibold text-slate-400 self-center">&</span>
                    <select class="filter-property-select block w-1/3 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-700 compact-select">
                        <option value="propertyA">属性 A</option>
                        <option value="propertyB">属性 B</option>
                        <option value="propertyC">属性 C</option>
                        <option value="propertyD">属性 D</option>
                    </select>
                    <select class="filter-condition-select block w-auto border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-700 compact-select">
                        <option value="isSet">已设定</option>
                        <option value="isNotSet">未设定</option>
                        <option value="equals">等于</option>
                        <option value="contains">包含</option>
                    </select>
                    <input type="text" class="filter-value-input block flex-grow p-1 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-700 compact-input" placeholder="值" style="display:none;">
                    <button type="button" class="remove-filter-btn text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 compact-icon-btn" title="移除筛选器">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                            <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="mt-4">
                <button id="add-filter-group-btn" type="button" class="w-full flex items-center justify-center px-3 py-2 border border-dashed border-slate-300 text-xs font-medium rounded-md text-indigo-600 hover:text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 compact-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-plus-lg mr-1.5" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
                    </svg>
                    添加筛选器组
                </button>
            </div>
        </div>
         <div class="mt-6 p-3 bg-slate-50 rounded-md border border-slate-200"> 
            <h3 class="text-sm font-medium text-slate-700 mb-1.5 compact-text">当前筛选器状态 (JSON):</h3> 
            <pre id="filter-state-json" class="text-2xs bg-white p-2 rounded-md overflow-x-auto"></pre> 
        </div>
    </div>

    <script type="module">
        // --- Interfaces (for clarity, actual JS code follows) ---
        // interface Filter {
        //     id: string;
        //     property: string;
        //     condition: string;
        //     value?: string;
        // }
        // interface FilterGroup {
        //     id: string;
        //     groupCondition: 'all' | 'any' | 'none';
        //     filters: Filter[];
        // }
        // interface RootFilterState {
        //     rootCondition: 'all' | 'any' | 'none';
        //     filterGroups: FilterGroup[];
        // }

        // --- Global State ---
        let rootFilterState = {
            rootCondition: 'any', // Default root condition
            filterGroups: []
        };

        // --- DOM Elements ---
        const rootConditionSelect = document.getElementById('root-condition');
        const filterGroupsContainer = document.getElementById('filter-groups-container');
        const filterGroupTemplate = document.getElementById('filter-group-template');
        const filterItemTemplate = document.getElementById('filter-item-template');
        const addFilterGroupBtn = document.getElementById('add-filter-group-btn');
        const filterStateJsonOutput = document.getElementById('filter-state-json');

        // --- Utility Functions ---
        function generateId() {
            return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        function updateJsonOutput() {
            filterStateJsonOutput.textContent = JSON.stringify(rootFilterState, null, 2);
        }

        // --- Event Handlers & DOM Manipulation ---

        // Update root condition in state
        rootConditionSelect.addEventListener('change', (event) => {
            rootFilterState.rootCondition = event.target.value;
            updateJsonOutput();
            updateGroupSeparators();
        });

        // Add a new filter group
        addFilterGroupBtn.addEventListener('click', () => {
            addFilterGroup();
        });
        
        function createFilterGroupElement(groupData) {
            const newGroup = filterGroupTemplate.cloneNode(true);
            newGroup.id = groupData.id;
            newGroup.style.display = 'block'; // Make it visible

            const groupConditionSelect = newGroup.querySelector('.group-condition-select');
            groupConditionSelect.value = groupData.groupCondition;
            groupConditionSelect.addEventListener('change', (event) => {
                const selectedValue = event.target.value;
                groupData.groupCondition = selectedValue;
                updateJsonOutput();
                // Update conjunctions within this specific group when its condition changes
                updateFilterConjunctions(newGroup.querySelector('.filters-list'), selectedValue);
            });

            const filtersList = newGroup.querySelector('.filters-list');
            
            // Add existing filters if any (e.g., when duplicating)
            groupData.filters.forEach(filterData => {
                const filterElement = createFilterItemElement(filterData, groupData);
                filtersList.appendChild(filterElement);
            });
            updateFilterConjunctions(filtersList, groupData.groupCondition);


            const addFilterBtn = newGroup.querySelector('.add-filter-btn');
            addFilterBtn.addEventListener('click', () => {
                addFilterToGroup(groupData, filtersList);
            });

            const removeGroupBtn = newGroup.querySelector('.remove-group-btn');
            removeGroupBtn.addEventListener('click', () => {
                rootFilterState.filterGroups = rootFilterState.filterGroups.filter(g => g.id !== groupData.id);
                newGroup.remove(); // Remove the group element from DOM
                // Also remove its separator if it exists
                const nextSibling = newGroup.nextElementSibling;
                if (nextSibling && nextSibling.classList.contains('filter-group-separator-container')) {
                    nextSibling.remove();
                } else {
                     // If it was the last group, the separator might be before it
                    const prevSibling = newGroup.previousElementSibling;
                    if (prevSibling && prevSibling.classList.contains('filter-group-separator-container')) {
                         prevSibling.remove();
                    }
                }
                updateJsonOutput();
                updateGroupSeparators(); // Re-evaluate all separators
            });

            const duplicateGroupBtn = newGroup.querySelector('.duplicate-group-btn');
            duplicateGroupBtn.addEventListener('click', () => {
                const newGroupId = generateId();
                // Deep clone filters to avoid shared references
                const duplicatedFilters = groupData.filters.map(f => ({ ...f, id: generateId() }));
                const duplicatedGroupData = {
                    ...groupData, // copy condition
                    id: newGroupId,
                    filters: duplicatedFilters
                };
                addFilterGroup(duplicatedGroupData, newGroup); // Pass original group to insert after
            });
            
            return newGroup;
        }

        function addFilterGroup(groupDataToClone = null, insertAfterElement = null) {
            const newGroupId = groupDataToClone ? groupDataToClone.id : generateId(); // Use cloned ID or generate new
            
            let newGroupData;
            if (groupDataToClone && insertAfterElement) { // This means it's a duplication
                 newGroupData = { // Ensure it's a deep copy for the state
                    id: newGroupId, // This is the new ID for the duplicated group
                    groupCondition: groupDataToClone.groupCondition,
                    filters: groupDataToClone.filters.map(f => ({...f, id: generateId()})) // New IDs for filters too
                };
            } else { // This is a brand new group
                newGroupData = {
                    id: newGroupId,
                    groupCondition: 'all',
                    filters: []
                };
            }

            // Add to state
            if (insertAfterElement) { // Duplicating: insert after the original in the state array
                const originalIndex = rootFilterState.filterGroups.findIndex(g => g.id === insertAfterElement.id);
                if (originalIndex !== -1) {
                    rootFilterState.filterGroups.splice(originalIndex + 1, 0, newGroupData);
                } else { // Fallback if original not found (should not happen)
                    rootFilterState.filterGroups.push(newGroupData);
                }
            } else { // Adding a new group: push to the end
                 rootFilterState.filterGroups.push(newGroupData);
            }


            const newGroupElement = createFilterGroupElement(newGroupData); // Create DOM element with the new data
            
            if (insertAfterElement) {
                // Insert the new group element and its separator
                filterGroupsContainer.insertBefore(newGroupElement, insertAfterElement.nextSibling);
            } else {
                filterGroupsContainer.appendChild(newGroupElement);
            }
            
            // If it's a brand new group (not a clone) or a clone of an empty group, add one default filter.
            if ((!groupDataToClone && !insertAfterElement) || (groupDataToClone && groupDataToClone.filters.length === 0) ) {
                 addFilterToGroup(newGroupData, newGroupElement.querySelector('.filters-list'));
            }


            updateJsonOutput();
            updateGroupSeparators();
            makeSortable(); // Ensure new group (and its filter list) is sortable
        }


        // Add a new filter to a group
        function addFilterToGroup(groupData, filtersListElement) {
            const newFilterId = generateId();
            const newFilterData = {
                id: newFilterId,
                property: 'propertyA',
                condition: 'isSet',
                value: ''
            };
            groupData.filters.push(newFilterData);

            const newFilterElement = createFilterItemElement(newFilterData, groupData);
            filtersListElement.appendChild(newFilterElement);
            
            updateFilterConjunctions(filtersListElement, groupData.groupCondition);
            updateJsonOutput();
        }

        function createFilterItemElement(filterData, groupData) {
            const newFilter = filterItemTemplate.cloneNode(true);
            newFilter.id = filterData.id;
            newFilter.style.display = 'flex'; // Make it visible

            const propertySelect = newFilter.querySelector('.filter-property-select');
            propertySelect.value = filterData.property;
            propertySelect.addEventListener('change', (event) => {
                filterData.property = event.target.value;
                updateJsonOutput();
            });

            const conditionSelect = newFilter.querySelector('.filter-condition-select');
            conditionSelect.value = filterData.condition;
            const valueInput = newFilter.querySelector('.filter-value-input');
            
            const toggleValueInput = () => {
                if (conditionSelect.value === 'equals' || conditionSelect.value === 'contains') {
                    valueInput.style.display = 'block';
                } else {
                    valueInput.style.display = 'none';
                    if (filterData.value) { // Only clear if it had a value
                        filterData.value = ''; 
                        valueInput.value = '';
                        updateJsonOutput(); // Update JSON if value is cleared
                    }
                }
            };
            toggleValueInput(); 

            conditionSelect.addEventListener('change', (event) => {
                filterData.condition = event.target.value;
                toggleValueInput();
                updateJsonOutput();
            });

            valueInput.value = filterData.value || '';
            valueInput.addEventListener('input', (event) => {
                filterData.value = event.target.value;
                updateJsonOutput();
            });
            
            const removeFilterBtn = newFilter.querySelector('.remove-filter-btn');
            removeFilterBtn.addEventListener('click', () => {
                groupData.filters = groupData.filters.filter(f => f.id !== filterData.id);
                newFilter.remove();
                updateFilterConjunctions(newFilter.parentElement, groupData.groupCondition);
                updateJsonOutput();
            });
            return newFilter;
        }
        
        function updateFilterConjunctions(filtersListElement, groupCondition = 'all') {
            if (!filtersListElement) return;
            const filters = filtersListElement.querySelectorAll('.filter-item');
            filters.forEach((filter, index) => {
                const conjunctionElement = filter.querySelector('.filter-conjunction');
                if (conjunctionElement) {
                    if (index === 0) {
                        conjunctionElement.style.visibility = 'hidden'; 
                    } else {
                        conjunctionElement.style.visibility = 'visible';
                        if (groupCondition === 'any') {
                            conjunctionElement.textContent = '或';
                        } else if (groupCondition === 'none') {
                             conjunctionElement.textContent = '且非'; // Example, adjust as needed
                        }
                        else { // 'all'
                            conjunctionElement.textContent = '且';
                        }
                    }
                }
            });
        }

        function updateGroupSeparators() {
            document.querySelectorAll('.filter-group-separator-container').forEach(sep => sep.remove());
            const groups = Array.from(filterGroupsContainer.children).filter(child => child.classList.contains('filter-group'));

            if (groups.length > 1) {
                groups.forEach((group, index) => {
                    if (index < groups.length - 1) {
                        const separatorContainer = document.createElement('div');
                        separatorContainer.className = 'filter-group-separator-container'; // For easy removal
                        const separator = document.createElement('div');
                        separator.className = 'filter-group-separator';
                        const rootCond = rootFilterState.rootCondition;
                        let separatorText = '或者'; 
                        if (rootCond === 'all') separatorText = '并且';
                        else if (rootCond === 'none') separatorText = '并且不'; 

                        separator.textContent = separatorText.toUpperCase();
                        separatorContainer.appendChild(separator);
                        // Insert separator after the current group
                        group.parentNode.insertBefore(separatorContainer, group.nextSibling);
                    }
                });
            }
        }
        
        function makeSortable() {
            if (filterGroupsContainer && typeof Sortable !== 'undefined') {
                // Destroy existing sortable instance for filter groups if it exists
                if (filterGroupsContainer.sortableInstance) {
                    filterGroupsContainer.sortableInstance.destroy();
                }
                filterGroupsContainer.sortableInstance = new Sortable(filterGroupsContainer, {
                    animation: 150,
                    handle: '.drag-handle', 
                    filter: '.filter-group-separator-container', // Ignore separators for dragging
                    preventOnFilter: true, // Required for filter option
                    ghostClass: 'bg-slate-200 dragging-placeholder', 
                    onEnd: function (evt) {
                        const itemEl = evt.item; 
                        const oldIndex = evt.oldDraggableIndex;
                        const newIndex = evt.newDraggableIndex;

                        const movedGroup = rootFilterState.filterGroups.splice(oldIndex, 1)[0];
                        rootFilterState.filterGroups.splice(newIndex, 0, movedGroup);
                        
                        updateJsonOutput();
                        // The separators are rebuilt based on the new order of groups in the DOM
                        // We need to ensure the DOM order matches the state order before rebuilding separators
                        // The SortableJS library already reorders the DOM elements.
                        updateGroupSeparators(); 
                    }
                });

                document.querySelectorAll('.filters-list').forEach(list => {
                    if (list.sortableInstance) { // Destroy existing instance
                        list.sortableInstance.destroy();
                    }
                    if (!list.classList.contains('sortable-initialized-inner')) {
                        list.sortableInstance = new Sortable(list, {
                            animation: 150,
                            ghostClass: 'bg-blue-100 dragging-placeholder',
                            onEnd: function(evt) {
                                const itemEl = evt.item; 
                                const parentGroupElement = itemEl.closest('.filter-group');
                                if (!parentGroupElement) return;
                                const groupId = parentGroupElement.id;
                                const groupData = rootFilterState.filterGroups.find(g => g.id === groupId);

                                if (groupData) {
                                    const movedFilter = groupData.filters.splice(evt.oldDraggableIndex, 1)[0];
                                    groupData.filters.splice(evt.newDraggableIndex, 0, movedFilter);
                                    updateFilterConjunctions(list, groupData.groupCondition);
                                    updateJsonOutput();
                                }
                            }
                        });
                        list.classList.add('sortable-initialized-inner');
                    }
                });
            }
        }

        // --- Initialization ---
        function initializeApp() {
            addFilterGroup(); // Add one default filter group
            updateJsonOutput();
            makeSortable();
        }

        initializeApp();

    </script>
</body>
</html>
```