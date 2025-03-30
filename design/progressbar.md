# Progress Bar Text Formatter Design Document

## 1. Overview

当前进度条实现在自定义方面存在局限性，特别是对于非百分比显示。我们将设计一个更灵活的文本格式化系统，允许：

1. 任何显示模式下的完全文本自定义
2. 自定义任务计数的格式
3. 基于进度百分比范围的动态文本
4. 数据计算和文本呈现的更好分离
5. 与现有任务状态标记的集成

## 2. 数据模型

```typescript
interface ProgressData {
  completed: number;
  total: number;
  inProgress: number;
  abandoned: number;
  notStarted: number;
  planned: number;
  
  // 派生数据（按需计算）
  percentages: {
    completed: number;
    inProgress: number;
    abandoned: number;
    planned: number;
    notStarted: number;
  };
}

interface ProgressFormatOptions {
  // 显示模式
  displayMode: "percentage" | "fraction" | "custom" | "range-based";
  
  // 自定义显示模式
  customFormat: string; // 使用占位符如 {{COMPLETED}}, {{TOTAL}} 等
  
  // 根据百分比范围的自定义文本模板（保留原有设计）
  progressRanges: Array<{
    min: number;
    max: number;
    text: string; // 带占位符如 {{PROGRESS}}
  }>;
  
  // 不同状态的显示符号（默认使用相应taskStatus的第一个字符）
  statusDisplaySymbols: {
    completed: string; // 默认: "✓"
    inProgress: string; // 默认: "⟳"
    abandoned: string; // 默认: "✗"
    planned: string; // 默认: "?"
    notStarted: string; // 默认: " "
  };
}
```

## 3. 实现结构

### 3.1 数据计算层

```typescript
class ProgressCalculator {
  // 从原始任务计数计算所有派生数据
  static calculateProgressData(data: Partial<ProgressData>): ProgressData {
    // 为缺失值填充默认值
    const fullData: ProgressData = {
      completed: data.completed || 0,
      total: data.total || 0,
      inProgress: data.inProgress || 0,
      abandoned: data.abandoned || 0,
      notStarted: data.notStarted || 0,
      planned: data.planned || 0,
      percentages: { completed: 0, inProgress: 0, abandoned: 0, planned: 0, notStarted: 0 }
    };
    
    // 如果总数 > 0，计算百分比
    if (fullData.total > 0) {
      fullData.percentages = {
        completed: Math.round((fullData.completed / fullData.total) * 10000) / 100,
        inProgress: Math.round((fullData.inProgress / fullData.total) * 10000) / 100,
        abandoned: Math.round((fullData.abandoned / fullData.total) * 10000) / 100,
        planned: Math.round((fullData.planned / fullData.total) * 10000) / 100,
        notStarted: Math.round((fullData.notStarted / fullData.total) * 10000) / 100
      };
    }
    
    return fullData;
  }
}
```

### 3.2 文本格式化器

```typescript
class ProgressTextFormatter {
  // 从任务状态初始化显示符号
  static initStatusDisplaySymbols(
    taskStatuses: { 
      completed: string; 
      inProgress: string; 
      abandoned: string; 
      notStarted: string;
      planned: string;
    },
    customSymbols?: Partial<ProgressFormatOptions['statusDisplaySymbols']>
  ): ProgressFormatOptions['statusDisplaySymbols'] {
    // 从每个任务状态提取第一个字符作为默认符号
    const getDefaultSymbol = (statusStr: string, defaultSymbol: string): string => {
      const parts = statusStr.split('|');
      return parts[0].trim().charAt(0) || defaultSymbol;
    };
    
    return {
      completed: customSymbols?.completed || getDefaultSymbol(taskStatuses.completed, "✓"),
      inProgress: customSymbols?.inProgress || getDefaultSymbol(taskStatuses.inProgress, "⟳"),
      abandoned: customSymbols?.abandoned || getDefaultSymbol(taskStatuses.abandoned, "✗"),
      planned: customSymbols?.planned || getDefaultSymbol(taskStatuses.planned, "?"),
      notStarted: customSymbols?.notStarted || getDefaultSymbol(taskStatuses.notStarted, " ")
    };
  }

  // 替换模板字符串中的所有占位符
  static formatTemplate(
    template: string, 
    data: ProgressData,
    options: ProgressFormatOptions,
    taskStatuses: { 
      completed: string; 
      inProgress: string; 
      abandoned: string; 
      notStarted: string;
      planned: string;
    }
  ): string {
    // 确保我们有显示符号
    const displaySymbols = this.initStatusDisplaySymbols(taskStatuses, options.statusDisplaySymbols);
    
    // 基本替换
    let result = template
      .replace(/{{COMPLETED}}/g, data.completed.toString())
      .replace(/{{TOTAL}}/g, data.total.toString())
      .replace(/{{IN_PROGRESS}}/g, data.inProgress.toString())
      .replace(/{{ABANDONED}}/g, data.abandoned.toString())
      .replace(/{{PLANNED}}/g, data.planned.toString())
      .replace(/{{NOT_STARTED}}/g, data.notStarted.toString())
      .replace(/{{PERCENT}}/g, data.percentages.completed.toString())
      .replace(/{{PROGRESS}}/g, data.percentages.completed.toString()) // 兼容原有占位符
      .replace(/{{PERCENT_IN_PROGRESS}}/g, data.percentages.inProgress.toString())
      .replace(/{{PERCENT_ABANDONED}}/g, data.percentages.abandoned.toString())
      .replace(/{{PERCENT_PLANNED}}/g, data.percentages.planned.toString())
      .replace(/{{COMPLETED_SYMBOL}}/g, displaySymbols.completed)
      .replace(/{{IN_PROGRESS_SYMBOL}}/g, displaySymbols.inProgress)
      .replace(/{{ABANDONED_SYMBOL}}/g, displaySymbols.abandoned)
      .replace(/{{PLANNED_SYMBOL}}/g, displaySymbols.planned)
      .replace(/{{NOT_STARTED_SYMBOL}}/g, displaySymbols.notStarted);
      
    // 支持简单的表达式计算，例如进度条文本生成
    // 处理形如 ${=expression} 的模式
    result = result.replace(/\${=(.+?)}/g, (match, expr) => {
      try {
        // 使用Function构造器安全地执行表达式，提供data和displaySymbols作为上下文
        return new Function('data', 'displaySymbols', `return ${expr}`)(data, displaySymbols);
      } catch (e) {
        console.error("Error evaluating expression:", expr, e);
        return match; // 出错时返回原始匹配
      }
    });
      
    return result;
  }
  
  // 基于进度范围获取文本模板 - 保留原有设计
  static getRangeBasedTemplate(data: ProgressData, options: ProgressFormatOptions): string {
    const percent = data.percentages.completed;
    
    // 检查是否有匹配的范围
    if (options.progressRanges && options.progressRanges.length > 0) {
      for (const range of options.progressRanges) {
        if (percent >= range.min && percent <= range.max) {
          return range.text;
        }
      }
    }
    
    // 如果没有匹配的范围，返回默认格式
    return "{{PROGRESS}}%";
  }
  
  // 基于显示模式获取适当的文本模板
  static getTextTemplate(data: ProgressData, options: ProgressFormatOptions): string {
    // 基于显示模式的默认选项
    switch(options.displayMode) {
      case "percentage":
        return "{{PERCENT}}%";
      case "fraction":
        return "[{{COMPLETED}}/{{TOTAL}}]";
      case "range-based":
        return this.getRangeBasedTemplate(data, options);
      case "custom":
        return options.customFormat;
      default:
        // 保持向后兼容性：如果启用了范围或百分比，使用相应格式
        if (options.progressRanges && options.progressRanges.length > 0) {
          return this.getRangeBasedTemplate(data, options);
        } else {
          return "[{{COMPLETED}}/{{TOTAL}}]";
        }
    }
  }
  
  // 主要格式化函数：计算数据并生成最终的文本表示
  static formatProgressText(
    rawData: Partial<ProgressData>, 
    options: ProgressFormatOptions,
    taskStatuses: {
      completed: string;
      inProgress: string;
      abandoned: string;
      notStarted: string;
      planned: string;
    }
  ): string {
    // 计算完整数据
    const data = ProgressCalculator.calculateProgressData(rawData);
    
    // 获取适当的模板
    const template = this.getTextTemplate(data, options);
    
    // 使用模板生成最终文本
    return this.formatTemplate(template, data, options, taskStatuses);
  }
}
```

## 4. 设置界面

```typescript
// 在 TaskProgressBarSettingTab 类中
addProgressBarTextSettings() {
  const { containerEl } = this;

  new Setting(containerEl)
    .setName(t("进度条文本格式"))
    .setHeading();

  new Setting(containerEl)
    .setName(t("显示模式"))
    .setDesc(t("选择如何显示任务进度"))
    .addDropdown(dropdown => {
      dropdown
        .addOption("percentage", t("百分比"))
        .addOption("fraction", t("分数"))
        .addOption("range-based", t("基于进度范围"))
        .addOption("custom", t("自定义格式"))
        .setValue(this.plugin.settings.progressBarFormat.displayMode || "fraction")
        .onChange(async (value) => {
          this.plugin.settings.progressBarFormat.displayMode = value;
          this.applySettingsUpdate();
          // 有条件地显示自定义格式设置
          this.display();
        });
    });

  // 仅在选择自定义格式时显示
  if (this.plugin.settings.progressBarFormat.displayMode === "custom") {
    new Setting(containerEl)
      .setName(t("自定义格式"))
      .setDesc(t("使用占位符如 {{COMPLETED}}, {{TOTAL}}, {{PERCENT}} 等"))
      .addText(text => {
        text.setValue(this.plugin.settings.progressBarFormat.customFormat || "[{{COMPLETED}}/{{TOTAL}}]")
          .setPlaceholder("[{{COMPLETED}}/{{TOTAL}}]")
          .onChange(async (value) => {
            this.plugin.settings.progressBarFormat.customFormat = value;
            this.applySettingsUpdate();
          });
      });
      
    // 添加占位符的帮助提示
    containerEl.createEl("div", {
      cls: "setting-item-description",
      text: t("可用占位符: {{COMPLETED}}, {{TOTAL}}, {{IN_PROGRESS}}, {{ABANDONED}}, {{PLANNED}}, {{NOT_STARTED}}, {{PERCENT}}, {{COMPLETED_SYMBOL}}, {{IN_PROGRESS_SYMBOL}}, {{ABANDONED_SYMBOL}}, {{PLANNED_SYMBOL}}, {{NOT_STARTED_SYMBOL}}")
    });
    
    // 高级表达式示例
    containerEl.createEl("div", {
      cls: "setting-item-description",
      text: t("高级用法: 您可以使用 ${= } 包裹JavaScript表达式，比如: ${=\"=\".repeat(Math.floor(data.percentages.completed/10))}")
    });
  }

  // 基于范围的进度文本 (保留原有设计)
  if (this.plugin.settings.progressBarFormat.displayMode === "range-based" || this.plugin.settings.progressBarFormat.displayMode === undefined) {
    this.addProgressRangesSettings();
  }

  // 显示符号设置
  new Setting(containerEl)
    .setName(t("显示符号"))
    .setDesc(t("自定义进度条文本中使用的符号（默认使用任务状态标记）"));

  // 从任务状态获取默认符号
  const displaySymbols = ProgressTextFormatter.initStatusDisplaySymbols(this.plugin.settings.taskStatuses);

  const statusTypes = [
    { id: "completed", name: t("已完成"), default: displaySymbols.completed },
    { id: "inProgress", name: t("进行中"), default: displaySymbols.inProgress },
    { id: "abandoned", name: t("已放弃"), default: displaySymbols.abandoned },
    { id: "notStarted", name: t("未开始"), default: displaySymbols.notStarted },
    { id: "planned", name: t("已计划"), default: displaySymbols.planned }
  ];

  for (const statusType of statusTypes) {
    new Setting(containerEl)
      .setName(statusType.name)
      .addText(text => {
        const currentValue = this.plugin.settings.progressBarFormat.statusDisplaySymbols?.[statusType.id];
        text.setValue(currentValue || statusType.default)
          .setPlaceholder(statusType.default)
          .onChange(async (value) => {
            if (!this.plugin.settings.progressBarFormat.statusDisplaySymbols) {
              this.plugin.settings.progressBarFormat.statusDisplaySymbols = {} as any;
            }
            this.plugin.settings.progressBarFormat.statusDisplaySymbols[statusType.id] = value;
            this.applySettingsUpdate();
          });
      });
  }

  // 添加进度条文本预览
  new Setting(containerEl)
    .setName(t("预览"))
    .setDesc(t("当前设置的进度条文本预览"));
    
  const previewContainer = containerEl.createDiv({ cls: "progress-bar-text-preview-container" });
  
  // 创建示例数据用于预览
  const sampleData = { 
    completed: 3, 
    total: 5,
    inProgress: 1, 
    abandoned: 0, 
    notStarted: 0,
    planned: 1,
    percentages: {
      completed: 60,
      inProgress: 20,
      abandoned: 0,
      planned: 20,
      notStarted: 0
    }
  };
  
  // 渲染预览文本
  const previewText = ProgressTextFormatter.formatProgressText(
    sampleData, 
    this.plugin.settings.progressBarFormat,
    this.plugin.settings.taskStatuses
  );
  
  previewContainer.setText(previewText);
}

// 保留原有的进度范围设置 - 与当前实现保持兼容
addProgressRangesSettings() {
  new Setting(this.containerEl)
    .setName(t("进度范围"))
    .setDesc(
      t(
        "定义进度范围及其对应的文本表示形式。使用 {{PROGRESS}} 作为百分比值的占位符。"
      )
    )
    .setHeading();

  // 显示现有范围
  this.plugin.settings.progressRanges.forEach((range, index) => {
    new Setting(this.containerEl)
      .setName(`范围 ${index + 1}: ${range.min}%-${range.max}%`)
      .setDesc(
        `使用 {{PROGRESS}} 作为百分比值的占位符`
      )
      .addText((text) =>
        text
          .setPlaceholder(
            "包含 {{PROGRESS}} 占位符的模板文本"
          )
          .setValue(range.text)
          .onChange(async (value) => {
            this.plugin.settings.progressRanges[index].text =
              value;
            this.applySettingsUpdate();
          })
      )
      .addButton((button) => {
        button.setButtonText("删除").onClick(async () => {
          this.plugin.settings.progressRanges.splice(index, 1);
          this.applySettingsUpdate();
          this.display();
        });
      });
  });

  new Setting(this.containerEl)
    .setName(t("添加新范围"))
    .setDesc(t("添加新的进度百分比范围及自定义文本"));

  // 添加新范围
  const newRangeSetting = new Setting(this.containerEl);
  newRangeSetting.infoEl.detach();

  newRangeSetting
    .addText((text) =>
      text
        .setPlaceholder(t("最小百分比 (0-100)"))
        .setValue("")
        .onChange(async (value) => {
          // 将在用户点击添加按钮时处理
        })
    )
    .addText((text) =>
      text
        .setPlaceholder(t("最大百分比 (0-100)"))
        .setValue("")
        .onChange(async (value) => {
          // 将在用户点击添加按钮时处理
        })
    )
    .addText((text) =>
      text
        .setPlaceholder(t("文本模板 (使用 {{PROGRESS}})"))
        .setValue("")
        .onChange(async (value) => {
          // 将在用户点击添加按钮时处理
        })
    )
    .addButton((button) => {
      button.setButtonText("添加").onClick(async () => {
        const settingsContainer = button.buttonEl.parentElement;
        if (!settingsContainer) return;

        const inputs = settingsContainer.querySelectorAll("input");
        if (inputs.length < 3) return;

        const min = parseInt(inputs[0].value);
        const max = parseInt(inputs[1].value);
        const text = inputs[2].value;

        if (isNaN(min) || isNaN(max) || !text) {
          return;
        }

        this.plugin.settings.progressRanges.push({
          min,
          max,
          text,
        });

        // 清空输入
        inputs[0].value = "";
        inputs[1].value = "";
        inputs[2].value = "";

        this.applySettingsUpdate();
        this.display();
      });
    });

  // 重置为默认值
  new Setting(this.containerEl)
    .setName(t("重置为默认值"))
    .setDesc(t("将进度范围重置为默认值"))
    .addButton((button) => {
      button.setButtonText(t("重置")).onClick(async () => {
        this.plugin.settings.progressRanges = [
          {
            min: 0,
            max: 20,
            text: t("刚刚开始 {{PROGRESS}}%"),
          },
          {
            min: 20,
            max: 40,
            text: t("正在推进 {{PROGRESS}}%"),
          },
          { min: 40, max: 60, text: t("进行一半 {{PROGRESS}}%") },
          {
            min: 60,
            max: 80,
            text: t("进展良好 {{PROGRESS}}%"),
          },
          {
            min: 80,
            max: 100,
            text: t("即将完成 {{PROGRESS}}%"),
          },
        ];
        this.applySettingsUpdate();
        this.display();
      });
    });
}
```

## 5. 实现步骤

1. **添加新设置到插件设置接口**:
   - 创建新的 `progressBarFormat` 对象
   - 为所有自定义选项添加默认值
   - 确保与现有 taskStatuses 集成
   - 保留现有的 progressRanges 设计

2. **实现文本格式化器**:
   - 实现 `ProgressCalculator` 用于数据处理
   - 创建 `ProgressTextFormatter` 用于文本模板处理
   - 添加与任务状态系统的集成
   - 维护对基于范围模板的支持

3. **更新设置界面**:
   - 添加新的设置部分
   - 确保与现有设置的向后兼容性
   - 保留现有的进度范围设置界面
   - 添加实时预览功能

4. **与现有实现的桥接**:
   - 支持旧设置格式
   - 自动将现有设置转换为新格式
   - 为用户提供平滑过渡

## 6. 迁移策略

```typescript
function migrateOldProgressBarSettings(oldSettings: any): ProgressFormatOptions {
  // 检测是否使用百分比或范围显示
  const usesPercentage = oldSettings.showPercentage;
  const usesRanges = oldSettings.customizeProgressRanges && oldSettings.progressRanges && oldSettings.progressRanges.length > 0;
  
  return {
    // 根据现有配置自动选择最合适的显示模式
    displayMode: usesRanges ? "range-based" : (usesPercentage ? "percentage" : "fraction"),
    customFormat: "[{{COMPLETED}}/{{TOTAL}}]",
    progressRanges: oldSettings.progressRanges || [
      { min: 0, max: 20, text: t("刚刚开始 {{PROGRESS}}%") },
      { min: 20, max: 40, text: t("正在推进 {{PROGRESS}}%") },
      { min: 40, max: 60, text: t("进行一半 {{PROGRESS}}%") },
      { min: 60, max: 80, text: t("进展良好 {{PROGRESS}}%") },
      { min: 80, max: 100, text: t("即将完成 {{PROGRESS}}%") },
    ],
    statusDisplaySymbols: ProgressTextFormatter.initStatusDisplaySymbols(oldSettings.taskStatuses)
  };
}
```

## 7. 自定义格式示例

以下是可以通过自定义格式实现的一些例子：

1. **带括号的简单分数**:  
   `[{{COMPLETED}}/{{TOTAL}}]`

2. **自定义符号**:  
   `【{{COMPLETED}}⭐ / {{TOTAL}}⭐】`

3. **基于任务状态的进度计量**:  
   `{{COMPLETED}}{{COMPLETED_SYMBOL}} {{IN_PROGRESS}}{{IN_PROGRESS_SYMBOL}} {{ABANDONED}}{{ABANDONED_SYMBOL}} / {{TOTAL}}`

4. **表情符号进度条**:  
   `${="⬛".repeat(Math.floor(data.percentages.completed/10)) + "⬜".repeat(10-Math.floor(data.percentages.completed/10))}`

5. **文本进度条**:  
   `[${="=".repeat(Math.floor(data.percentages.completed/10)) + " ".repeat(10-Math.floor(data.percentages.completed/10))}]`

6. **状态感知自定义格式**:  
   `[{{COMPLETED_SYMBOL}}:{{COMPLETED}} {{IN_PROGRESS_SYMBOL}}:{{IN_PROGRESS}} {{PLANNED_SYMBOL}}:{{PLANNED}} / {{TOTAL}}]`

7. **彩色文本**:
   `{{COMPLETED}}/{{TOTAL}} 完成率: ${=data.percentages.completed < 30 ? '🔴低' : data.percentages.completed < 70 ? '🟠中' : '🟢高'}`

8. **范围示例** (基于progressRanges配置):
   - 0-20%: "刚刚开始 15%"
   - 20-40%: "正在推进 35%"
   - 40-60%: "进行一半 50%"
   - 60-80%: "进展良好 75%"
   - 80-100%: "即将完成 90%"

## 8. 性能考虑

1. **懒计算**:
   - 仅在需要时计算百分比
   - 对于重复渲染，尽可能缓存结果

2. **表达式处理**:
   - 对于常用格式，预编译模板
   - 缓存处理过的模板
   
3. **向后兼容性**:
   - 确保现有的进度范围设置仍然可用
   - 无缝支持从旧版本升级

