# Side Handler 功能设计文档

## 1. 概述

Side Handler (侧边栏处理器或行号栏交互器) 是 Task Genius 插件中的一个增强交互功能。它利用编辑器 (CodeMirror) 的行号栏 (gutter) 区域，在用户点击特定任务相关的标记时，提供一个包含该任务详细信息的弹出层 (Popover 或 Modal)。用户可以直接在此弹出层中查看和快速修改任务的某些属性，旨在提升任务管理的便捷性和效率。

## 2. 核心功能

-   **Gutter 标记**: 在编辑器的行号栏为识别出的任务行显示一个可交互的标记。
-   **任务信息展示**: 点击 Gutter 标记后，根据平台类型（桌面或移动端）弹出相应的界面（Popover 或 Modal）。
    -   **桌面端**: 默认显示一个紧凑的 Popover 菜单。
    -   **移动端**: 默认显示一个功能更全面的 Modal 弹窗。
-   **快速信息概览**: 弹出层清晰展示任务的核心信息，例如：内容、状态、截止日期、优先级、标签等。
-   **便捷信息编辑**: 允许用户在弹出层内直接修改任务的多个属性，如状态、优先级、日期等。编辑功能参考 `TaskDetailsComponent` (`details.ts`) 的实现。
-   **动态界面切换**: 根据 `Platform.isDesktop` 自动判断并切换 Popover 与 Modal 的显示。
-   **上下文操作**:
    -   提供 "在文件中编辑" 的快捷入口，跳转到任务所在行。
    -   提供 "标记完成/未完成" 的快捷操作。

## 3. 交互设计

### 3.1 Gutter 交互

-   当鼠标悬停在 Gutter 中的任务标记上时，标记高亮，并可显示 Tooltip 提示 (例如 "查看/编辑任务")。
-   单击 Gutter 中的任务标记，触发弹出层（Popover 或 Modal）。

### 3.2 桌面端: Popover 菜单

-   在桌面环境下 (`Platform.isDesktop === true`)，点击 Gutter 标记后，在标记附近弹出一个非模态的 Popover。
-   Popover 内容区域将集成 `TaskDetailsComponent` 的核心展示和编辑能力。
-   Popover 应包含以下元素：
    -   任务内容预览 (只读或截断显示)。
    -   任务状态切换器 (使用 `StatusComponent`)。
    -   关键元数据展示与编辑 (例如：优先级、截止日期)。可参考 `details.ts` 中的 `showEditForm` 方法提供的字段。
    -   操作按钮：
        -   "编辑详细信息" (可选，如果 Popover 只提供部分编辑，此按钮可打开一个更全面的 Modal 或跳转至任务详情视图)。
        -   "在文件中编辑"。
        -   "切换完成状态"。
    -   点击 Popover 外部区域或按下 `Esc` 键可关闭 Popover。

### 3.3 移动端: Modal 弹窗

-   在非桌面环境（如移动端，`Platform.isDesktop === false`）下，点击 Gutter 标记后，屏幕中央弹出一个模态对话框 (Modal)。
-   Modal 的设计和实现可以参考 `QuickCaptureModal.ts` 的结构和交互模式，但内容主要用于展示和编辑现有任务，而非创建新任务。
-   Modal 内容将更全面地集成 `TaskDetailsComponent` 的功能，提供比 Popover 更丰富的编辑选项。
-   Modal 应包含：
    -   清晰的标题，如 "编辑任务"。
    -   完整的任务内容展示 (可编辑，参考 `details.ts` 的 `contentInput`)。
    -   任务状态选择 (参考 `StatusComponent`)。
    -   各项可编辑的任务元数据字段（如项目、标签、上下文、优先级、各项日期、重复规则等），布局和控件参考 `details.ts` 的 `showEditForm`。
    -   底部操作按钮：
        -   "保存" 或 "应用更改"。
        -   "取消"。
        -   "在文件中编辑" (打开对应文件并定位)。
        -   "切换完成状态"。

## 4. 数据展示与编辑

弹出层 (Popover/Modal) 中展示和允许编辑的任务信息主要基于 `Task`对象的属性，其实现逻辑参考 `src/components/task-view/details.ts` 中的 `TaskDetailsComponent`。

### 4.1 展示信息

-   任务原始内容 ( `task.content` )
-   任务状态 ( `task.status`, 通过 `getStatus` 或 `StatusComponent` 展示)
-   项目 ( `task.project` )
-   截止日期 ( `task.dueDate` )
-   开始日期 ( `task.startDate` )
-   计划日期 ( `task.scheduledDate` )
-   完成日期 ( `task.completedDate` )
-   优先级 ( `task.priority` )
-   标签 ( `task.tags` )
-   上下文 ( `task.context` )
-   重复规则 ( `task.recurrence` )
-   文件路径 ( `task.filePath` )

### 4.2 可编辑信息

以下字段应允许用户在 Popover 或 Modal 中直接修改，修改逻辑和UI组件参考 `TaskDetailsComponent` 的 `showEditForm` 方法：

-   任务内容 (`contentInput`)
-   项目 (`projectInput` 与 `ProjectSuggest`)
-   标签 (`tagsInput` 与 `TagSuggest`)
-   上下文 (`contextInput` 与 `ContextSuggest`)
-   优先级 (`priorityDropdown`)
-   截止日期 (`dueDateInput`)
-   开始日期 (`startDateInput`)
-   计划日期 (`scheduledDateInput`)
-   重复规则 (`recurrenceInput`)
-   状态 (通过 `StatusComponent` 或类似的机制)

保存更新后的任务数据将调用 `onTaskUpdate` 回调，与 `TaskDetailsComponent` 中的保存逻辑类似，可能包含防抖处理。

## 5. UI 设计

### 5.1 Gutter Marker (行号栏标记)

-   在任务行的行号栏显示一个简洁、直观的图标 (例如：一个小圆点、任务勾选框图标的变体、或者插件特有的图标)。
-   标记的颜色或形态可以根据任务状态（例如，未完成、已完成）有细微变化。
-   鼠标悬停时标记有视觉反馈（如放大、改变颜色）。

### 5.2 Popover (桌面端)

-   设计应紧凑，避免遮挡过多编辑器内容。
-   风格与 Obsidian 主题保持一致。
-   包含任务核心信息和常用编辑字段。
-   字段布局参考 `TaskDetailsComponent` 中非编辑状态下的信息排布，但控件为编辑形态。

### 5.3 Modal (移动端 / 详细编辑)

-   Modal 弹窗的设计参考 `QuickCaptureModal.ts` 的全功能模式 (`createFullFeaturedModal`)，但侧重于编辑而非捕获。
-   移除或调整文件目标选择器等不适用于编辑现有任务的元素。
-   表单布局清晰，易于在小屏幕上操作。
-   包含 `TaskDetailsComponent` `showEditForm` 中几乎所有的可编辑字段。
-   提供明确的 "保存" 和 "取消" 按钮。

## 6. 实现要点

1.  **CodeMirror Gutter API**:
    *   使用 CodeMirror 6 的 Gutter API (`gutter`, `lineMarker` 等) 来添加和管理行号栏标记。
    *   需要监听 Gutter 标记的点击事件。
2.  **任务识别**:
    *   需要一种机制来确定哪些行是任务行，以便在这些行旁边显示 Gutter 标记。这可能依赖插件已有的任务解析逻辑。
3.  **动态 UI 加载**:
    *   根据 `Platform.isDesktop` 的值，在点击事件回调中动态创建和显示 Popover (可能使用 Obsidian 的 `Menu` 或自定义浮动元素) 或 Modal (继承 Obsidian `Modal` 类)。
4.  **组件复用**:
    *   尽可能复用 `TaskDetailsComponent` (`details.ts`) 中的任务信息展示逻辑、表单字段创建逻辑 (`createFormField`) 以及数据更新逻辑 (`onTaskUpdate`, `saveTask`)。
    *   对于 Modal 的基础框架，可以借鉴 `QuickCaptureModal.ts` 的结构，特别是其参数化配置和内容组织方式。
5.  **状态管理**:
    *   确保 Popover/Modal 中的任务数据与原始任务数据同步。
    *   修改后正确更新任务对象，并通过事件或回调通知其他组件（如任务列表视图）刷新。
6.  **性能考虑**:
    *   Gutter 标记的渲染不应对编辑器性能产生显著影响，尤其是在处理大量任务时。

## 7. 开放问题与未来考虑

-   **Gutter 标记自定义**: 是否允许用户自定义 Gutter 标记的图标或行为？
-   **Popover/Modal 内容可配置性**: 是否允许用户选择在 Popover/Modal 中显示或编辑哪些字段？
-   **键盘可访问性**: 如何确保通过键盘也能方便地触发 Gutter 标记和操作弹出层？
-   **与其他视图的交互**: 编辑后，如何更流畅地更新其他打开的任务视图或日历视图？
-   **右键菜单集成**: 除了左键点击，是否考虑在 Gutter 标记上支持右键菜单，提供更多上下文操作（如复制任务链接、快速设置提醒等）？
