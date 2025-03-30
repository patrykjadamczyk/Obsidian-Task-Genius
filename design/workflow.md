# Task Progress Bar Plugin - TODO List

## 特性开发计划

### 任务状态循环增强
- [ ] 实现可配置的任务工作流及自定义循环
- [ ] 添加任务状态变更时间戳记录功能
    - [ ] 时间戳使用日期体现
- [ ] 创建工作流配置设置界面
- [ ] 支持右键菜单跳转到特定状态
    - [ ] 跳转至特定状态后再增加子任务

### 工作流系统
- [ ] 设计工作流配置架构
  - [ ] 定义工作流模板（如专利流程、项目管理）
  - [ ] 允许自定义工作流创建
- [ ] 实现工作流状态持久化
- [ ] 添加工作流进度可视化

### 专利流程工作流示例
- [ ] 创建专利工作流模板，包含以下阶段：
  - [ ] 开案
  - [ ] 交流交底（循环）
    - [ ] 等待提问
    - [ ] 等待回答
  - [ ] 撰写（可重复）
  - [ ] 审核（可重复）
- [ ] 为每个阶段转换添加时间戳记录
- [ ] 实现当前阶段状态指示器

## 实现方案

本插件提供两种核心实现方式：基于JSON配置的结构化实现和基于纯文本Markdown的轻量级实现。

### 实现方案一：结构化JSON配置

#### 配置结构
- [ ] 创建工作流定义的JSON架构
- [ ] 设计工作流管理的设置UI
- [ ] 实现工作流模板的导入/导出功能

#### 用户界面
- [ ] 在任务上下文菜单中添加工作流选择下拉框
- [ ] 创建当前工作流阶段的视觉指示器
- [ ] 实现进度可视化（时间线或进度条）
- [ ] 添加显示阶段历史和时间戳的悬停提示

#### 交互模型
- [ ] 左键点击：按顺序进入下一阶段
- [ ] 右键点击：打开跳转到任意阶段的上下文菜单
- [ ] Shift+点击：标记为循环（稍后返回此阶段）
- [ ] Alt+点击：为阶段转换添加注释/备注

#### 专利流程工作流JSON配置示例

```json
{
  "workflowId": "patent_process",
  "name": "专利处理流程",
  "description": "标准专利处理工作流程",
  "stages": [
    {
      "id": "case_opening",
      "name": "开案",
      "type": "linear",
      "next": "disclosure_communication"
    },
    {
      "id": "disclosure_communication",
      "name": "交流交底",
      "type": "cycle",
      "subStages": [
        {
          "id": "waiting_questions",
          "name": "等待提问",
          "next": "waiting_answers"
        },
        {
          "id": "waiting_answers",
          "name": "等待回答",
          "next": "waiting_questions"
        }
      ],
      "canProceedTo": ["drafting", "case_closed"]
    },
    {
      "id": "drafting",
      "name": "撰写",
      "type": "cycle",
      "canProceedTo": ["review", "disclosure_communication"]
    },
    {
      "id": "review",
      "name": "审核",
      "type": "cycle",
      "canProceedTo": ["drafting", "case_closed"]
    },
    {
      "id": "case_closed",
      "name": "结案",
      "type": "terminal"
    }
  ],
  "metadata": {
    "version": "1.0",
    "created": "2024-03-20",
    "lastModified": "2024-03-20"
  }
}
```

#### 数据结构设计
1. 工作流定义（WorkflowDefinition）
   - 基本信息（ID、名称、描述）
   - 阶段列表
   - 元数据（版本、创建时间等）

2. 阶段定义（StageDefinition）
   - 基本信息（ID、名称）
   - 类型（linear/cycle/terminal）
   - 子阶段（针对循环类型）
   - 可跳转目标（canProceedTo）

3. 任务状态（TaskState）
   - 当前阶段
   - 阶段历史记录
   - 时间戳记录
   - 备注信息

### 实现方案二：基于纯文本Markdown的工作流实现

#### 核心设计原则
- 利用现有Markdown任务语法（- [ ] 和 - [x]）
- 最小化额外标记
- 使用原生日期标记和Obsidian块引用

#### 状态表示方法

##### 1. 基本状态表示
```markdown
- [ ] 任务描述 #workflow/专利 ^task-123
```

在任务后添加工作流标签和块引用ID，用于状态追踪。

##### 2. 阶段标记
```markdown
- [ ] 任务描述 #workflow/专利/开案 ^task-123
```

工作流标签使用嵌套结构表示工作流类型和当前阶段。

##### 3. 历史记录与时间戳
```markdown
- [ ] 任务描述 #workflow/专利/撰写 ^task-123
  - [x] #workflow/专利/开案 (2024-05-01)
  - [x] #workflow/专利/交流交底 (2024-05-03 → 2024-05-10)
    - [x] 等待提问 (2024-05-03)
    - [x] 等待回答 (2024-05-05)
    - [x] 等待提问 (2024-05-07)
    - [x] 等待回答 (2024-05-10)
```

使用子任务记录历史阶段，日期标记表示完成时间，箭头表示周期性阶段的开始和结束。

##### 4. 循环阶段处理
```markdown
- [ ] 任务描述 #workflow/专利/交流交底/等待回答 ^task-123
  - [x] 等待提问 (2024-05-03)
```

对于循环子阶段，在标签中添加子阶段名称，并用子任务记录循环历史。

#### 实现示例：专利工作流

```markdown
## 专利任务

### 当前任务
- [ ] 量子计算专利 #workflow/专利/撰写 ^patent-001
  - [x] #workflow/专利/开案 (2024-01-15)
  - [x] #workflow/专利/交流交底 (2024-01-20 → 2024-02-15)
    - [x] 等待提问 (2024-01-20)
    - [x] 等待回答 (2024-01-25)
    - [x] 等待提问 (2024-02-05)
    - [x] 等待回答 (2024-02-15)

- [ ] AI推理加速器专利 #workflow/专利/交流交底/等待回答 ^patent-002
  - [x] #workflow/专利/开案 (2024-03-10)
  - [ ] #workflow/专利/交流交底 (2024-03-15 →)
    - [x] 等待提问 (2024-03-15)
    - [ ] 等待回答
```

#### 插件交互设计

##### 工作流解析规则
1. 通过标签 `#workflow/{工作流类型}/{阶段}[/{子阶段}]` 识别工作流
2. 通过块引用 `^task-id` 唯一标识任务
3. 子任务表示历史记录
4. 日期标记表示时间戳

##### 命令与快捷键
1. 推进到下一阶段: 单击任务复选框
   - 更新当前任务的工作流标签
   - 添加已完成子任务记录历史阶段
   - 自动添加日期时间戳

2. 跳转到特定阶段: 右键菜单
   - 右键点击任务，显示可用阶段
   - 选择目标阶段，更新标签和添加历史记录

3. 添加注释: Alt+单击
   ```markdown
   - [ ] 任务描述 #workflow/专利/撰写 ^task-123
     - [x] #workflow/专利/开案 (2024-01-15)
     - [x] #workflow/专利/交流交底 (2024-01-20 → 2024-02-15) - 客户需求变更多次
   ```

##### 视觉增强
1. 使用CSS添加视觉指示器
   - 显示当前阶段图标
   - 根据工作流阶段使用不同颜色

2. 悬停信息
   - 显示完整历史记录
   - 显示预计完成时间

#### 配置示例
预定义工作流使用YAML前置元数据：

```yaml
---
workflows:
  - id: patent_process
    name: 专利处理流程
    stages:
      - id: case_opening
        name: 开案
        next: disclosure_communication
      - id: disclosure_communication
        name: 交流交底
        type: cycle
        subStages:
          - id: waiting_questions
            name: 等待提问
          - id: waiting_answers
            name: 等待回答
        next: ["drafting","case_closed"] 
      - id: drafting
        name: 撰写
        next: ["review", "disclosure_communication"]
      - id: review
        name: 审核
        type: cycle
        next: ["drafting", "case_closed"]
      - id: case_closed
        name: 结案
        type: terminal
---
```

#### 兼容性与优势
1. 无插件环境下仍可读取和手动更新
2. 历史记录作为常规Markdown列表存在
3. 与其他任务插件兼容
4. 使用原生Obsidian功能（标签、块引用）易于查询和链接

## 后续优化方向

1. 工作流分析
   - 阶段耗时统计
   - 瓶颈分析
   - 效率报告

2. 协作功能
   - 多用户支持
   - 阶段分配
   - 通知系统

3. 自动化
   - 条件触发
   - 定时提醒
   - 自动推进规则

