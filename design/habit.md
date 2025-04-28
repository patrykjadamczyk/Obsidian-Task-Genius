# Habit Tracking 功能设计文档

## 1. 概述

Habit Tracking 是 Task Genius 插件的一个扩展功能模块，旨在利用 Obsidian 的日记功能，提供习惯追踪和可视化能力。它允许用户定义习惯，并通过每日笔记中的元数据自动记录完成情况，与现有的任务管理系统互补。

## 2. 核心功能

- 习惯定义与管理
- 基于日记元数据的习惯完成情况自动索引
- 习惯日历视图
- 习惯统计与 streaks (连续完成天数) 展示
- 与 Task View 的潜在集成 (例如，将习惯打卡显示为特殊任务)

## 3. 数据结构

### 3.1 习惯定义

```typescript
interface Habit {
  id: string;          // unique identifier (e.g., 'habit-meditation')
  name: string;        // Display name (e.g., "Meditation")
  description?: string; // Optional description
  goal?: string;        // Description of the goal (e.g., "Meditate for 10 minutes daily")
  // Frequency definition - determines expected occurrences.
  // 'daily' is simple. 'weekly' might imply checking specific weekdays. 'monthly' specific month days.
  // number could mean 'every N days'. Needs careful definition for streak calculation.
  frequency: 'daily' | 'weekly' | 'monthly' | number;
  metadataKey: string; // The frontmatter key used to track this habit (e.g., 'meditation-done')
  // Define the type of habit, influencing how data might be stored and interpreted.
  // Corresponds to the HabitProps types defined later for UI/consumption.
  type: 'daily' | 'count' | 'scheduled' | 'mapping';
  // Defines how to determine if the habit is 'completed' based on the metadata value.
  // Default: { condition: 'exists' } - any value present means completed.
  completionCondition?: {
    condition: 'exists' | 'equals' | 'greaterThan' | 'lessThan' | 'contains'; // Type of comparison
    value?: any; // The value to compare against (for 'equals', 'greaterThan', 'lessThan', 'contains')
  };
  // Potential future fields: icon, color, target value (e.g., for count type)
}
```

### 3.2 习惯日志条目 (内部索引结构)

```typescript
interface HabitLogEntry {
  habitId: string;     // Reference to Habit.id
  date: number;        // Timestamp (representing the start of the day) of the log entry
  // Determined based on the Habit's completionCondition and the raw value found in metadata.
  completed: boolean;
  filePath: string;    // Path to the daily note file
  // Stores the raw value found in the frontmatter associated with the habit's metadataKey for this date.
  // Useful for 'count', 'mapping', or 'scheduled' types, or showing specific recorded data.
  value?: any;
}
```

### 3.3 习惯缓存结构

```typescript
interface HabitCache {
  habits: Map<string, Habit>;         // habitId -> Habit definition
  logs: Map<string, HabitLogEntry[]>; // habitId -> sorted array of log entries
  // Index for quick lookup by date might be needed
  logsByDate: Map<number, { habitId: string, filePath: string, completed: boolean }[]>; // dateTimestamp -> entries for that day
  // Index for file path to related habit logs
  logsByFile: Map<string, { habitId: string, date: number }[]>; // filePath -> entries in that file
}
```

## 4. 索引方案

### 4.1 挑战

与 Task View 不同，习惯数据并非来自特定的文本行格式 (`- [ ]`), 而是分散在大量日记文件的 Frontmatter 元数据中。这要求一个不同的索引策略。

### 4.2 索引流程

1.  **习惯定义加载**: 从插件设置或指定配置文件中加载用户定义的 `Habit` 列表。`metadataKey` 是关键，用于关联元数据。
2.  **初始扫描**:
    *   识别日记文件 (基于 Obsidian 日历插件设置或用户自定义的路径/格式)。
    *   使用 `app.metadataCache` 访问每个日记文件的 Frontmatter。
    *   遍历已定义的 `Habit`，检查每个日记文件的 Frontmatter 是否包含对应的 `metadataKey`。
    *   如果找到 `metadataKey`，解析其值 (通常是 `true` 或具体数值)，并创建 `HabitLogEntry`。
    *   构建 `HabitCache` 中的 `logs`, `logsByDate`, 和 `logsByFile` 索引。
3.  **实时更新**:
    *   监听 `app.metadataCache.on('changed', (file, data, cache) => ...)` 事件。
    *   当一个文件的元数据变化时，检查该文件是否是日记文件。
    *   如果 是日记文件，重新解析其 Frontmatter 中与已定义习惯相关的 `metadataKey`。
    *   更新 `HabitCache` 中与该文件和日期相关的 `HabitLogEntry` 以及 `logsByDate`, `logsByFile` 索引。
    *   **注意**: 需要高效地处理 `metadataCache` 事件，避免对非日记文件或无关元数据变化的过多处理。可能需要维护一个已知日记文件的集合。
4.  **习惯定义变更**: 如果用户添加、删除或修改了 `Habit` 定义 (特别是 `metadataKey`)，可能需要触发一次部分或全部的重新扫描来更新索引。

### 4.3 实现细节

```typescript
class HabitIndexer extends Component {
  private habitCache: HabitCache;
  private dailyNoteFormat: string; // Store the daily note format (e.g., YYYY-MM-DD)

  constructor(plugin: TaskGeniusPlugin) {
    this.habitCache = this.initEmptyCache();
    // Load habit definitions from settings
    this.loadHabitDefinitions(plugin.settings.habits);
    // Determine daily note format/location
    this.dailyNoteFormat = this.getDailyNoteFormat();
    this.setupMetadataListener(plugin);
  }

  loadHabitDefinitions(definitions: Habit[]): void {
    this.habitCache.habits.clear();
    definitions.forEach(habit => {
      this.habitCache.habits.set(habit.id, habit);
      // Initialize log arrays if not present
      if (!this.habitCache.logs.has(habit.id)) {
        this.habitCache.logs.set(habit.id, []);
      }
    });
  }

  async initialScan(plugin: TaskGeniusPlugin): Promise<void> {
    const files = plugin.app.vault.getMarkdownFiles();
    // Clear existing logs before scan
    this.clearLogs();

    for (const file of files) {
      if (this.isDailyNote(file.path)) {
        await this.indexFileMetadata(file, plugin.app.metadataCache);
      }
    }
    this.sortAllLogsByDate(); // Ensure logs are sorted after initial scan
  }

  private async indexFileMetadata(file: TFile, metadataCache: MetadataCache): Promise<void> {
    const fileCache = metadataCache.getFileCache(file);
    const frontmatter = fileCache?.frontmatter;
    const dateFromName = this.getDateFromPath(file.path); // Extract date from filename/path

    if (!frontmatter || !dateFromName) return;

    const dateTimestamp = dateFromName.getTime();

    // Remove existing entries for this file before adding new ones
    this.removeLogsForFile(file.path);
    let fileLogs: { habitId: string, date: number }[] = [];


    for (const [habitId, habit] of this.habitCache.habits.entries()) {
      if (frontmatter.hasOwnProperty(habit.metadataKey)) {
        const metadataValue = frontmatter[habit.metadataKey];

        // Determine completion status based on the configured condition
        let completed = false;
        const conditionConfig = habit.completionCondition || { condition: 'exists' }; // Default to 'exists'

        if (metadataValue !== undefined && metadataValue !== null) {
             switch (conditionConfig.condition) {
                case 'exists':
                    completed = true; // Value exists
                    break;
                case 'equals':
                    // Use strict equality for predictability
                    completed = metadataValue === conditionConfig.value;
                    break;
                case 'greaterThan':
                    completed = typeof metadataValue === 'number' && typeof conditionConfig.value === 'number' && metadataValue > conditionConfig.value;
                    break;
                case 'lessThan':
                     completed = typeof metadataValue === 'number' && typeof conditionConfig.value === 'number' && metadataValue < conditionConfig.value;
                     break;
                case 'contains':
                     // Basic check - might need refinement based on expected data types (string, array)
                     if (typeof metadataValue === 'string' && typeof conditionConfig.value === 'string') {
                         completed = metadataValue.includes(conditionConfig.value);
                     } else if (Array.isArray(metadataValue) && conditionConfig.value) {
                         completed = metadataValue.includes(conditionConfig.value);
                     }
                     break;
                 default:
                     // Fallback or default behavior if condition is unknown - treat as 'exists'
                     completed = true;
            }
        }
        // If metadataValue is null/undefined, 'completed' remains false.

        const logEntry: HabitLogEntry = {
          habitId,
          date: dateTimestamp,
          completed, // Use the calculated completion status
          filePath: file.path,
          value: metadataValue // Store the raw value found in frontmatter
        };

        // Add to main logs map
        const logs = this.habitCache.logs.get(habitId) || [];
        logs.push(logEntry);
        this.habitCache.logs.set(habitId, logs); // Re-set in case it was new

        // Add to logsByDate index - Note: we store `completed` status here too
        const dateLogs = this.habitCache.logsByDate.get(dateTimestamp) || [];
        // Consider if the structure of logsByDate needs the raw 'value' as well
        dateLogs.push({ habitId, filePath: file.path, completed });
        this.habitCache.logsByDate.set(dateTimestamp, dateLogs);

        // Add to logsByFile index (for efficient removal/update)
        fileLogs.push({ habitId, date: dateTimestamp });
      }
    }
    if (fileLogs.length > 0) {
       this.habitCache.logsByFile.set(file.path, fileLogs);
    }
  }

  private setupMetadataListener(plugin: TaskGeniusPlugin) {
    plugin.registerEvent(
      plugin.app.metadataCache.on('changed', async (file, _, cache) => {
        if (this.isDailyNote(file.path) && this.containsRelevantMetadata(cache.frontmatter)) {
           console.log(`Metadata changed for daily note: ${file.path}, re-indexing habit data.`);
           await this.indexFileMetadata(file, plugin.app.metadataCache);
           this.sortLogsForHabitsInFile(file.path); // Re-sort affected logs
           // Trigger UI update if necessary
           plugin.eventBus.emit('habit-index-updated');
        }
      })
    );
  }

  // --- Helper methods ---

  private isDailyNote(filePath: string): boolean {
    // Implementation depends on daily note settings (e.g., regex match path)
    // Placeholder: Assumes YYYY-MM-DD.md format in root
    return /^\d{4}-\d{2}-\d{2}\.md$/.test(filePath.split('/').pop() || '');
  }

  private getDateFromPath(filePath: string): Date | null {
     // Extract date based on isDailyNote logic
     const match = filePath.match(/(\d{4}-\d{2}-\d{2})\.md$/);
     if (match) {
       const date = new Date(match[1] + 'T00:00:00'); // Use T00:00:00 for consistency
       return isNaN(date.getTime()) ? null : date;
     }
     return null;
  }

  private containsRelevantMetadata(frontmatter: any): boolean {
      if (!frontmatter) return false;
      for (const habit of this.habitCache.habits.values()) {
          if (frontmatter.hasOwnProperty(habit.metadataKey)) {
              return true;
          }
      }
      return false;
  }

  private initEmptyCache(): HabitCache {
    return {
      habits: new Map(),
      logs: new Map(),
      logsByDate: new Map(),
      logsByFile: new Map(),
    };
  }

  private clearLogs(): void {
      this.habitCache.logs.clear();
      this.habitCache.logsByDate.clear();
      this.habitCache.logsByFile.clear();
      // Re-initialize empty arrays for known habits
      this.habitCache.habits.forEach(habit => {
          this.habitCache.logs.set(habit.id, []);
      });
  }

  private removeLogsForFile(filePath: string): void {
      const fileEntries = this.habitCache.logsByFile.get(filePath);
      if (!fileEntries) return;

      fileEntries.forEach(({ habitId, date }) => {
          // Remove from main logs
          const habitLogs = this.habitCache.logs.get(habitId);
          if (habitLogs) {
              const index = habitLogs.findIndex(log => log.filePath === filePath && log.date === date);
              if (index > -1) {
                  habitLogs.splice(index, 1);
              }
          }
          // Remove from logsByDate
          const dateLogs = this.habitCache.logsByDate.get(date);
           if (dateLogs) {
               const index = dateLogs.findIndex(log => log.filePath === filePath && log.habitId === habitId);
               if (index > -1) {
                   dateLogs.splice(index, 1);
               }
               if(dateLogs.length === 0) {
                   this.habitCache.logsByDate.delete(date);
               }
           }
      });
      this.habitCache.logsByFile.delete(filePath);
  }

   private sortLogsForHabitsInFile(filePath: string): void {
       const fileEntries = this.habitCache.logsByFile.get(filePath);
       if (!fileEntries) return;
       const affectedHabitIds = new Set(fileEntries.map(e => e.habitId));
       affectedHabitIds.forEach(habitId => {
           const logs = this.habitCache.logs.get(habitId);
           if (logs) {
               logs.sort((a, b) => a.date - b.date);
           }
       });
   }

   private sortAllLogsByDate(): void {
       this.habitCache.logs.forEach(logs => {
           logs.sort((a, b) => a.date - b.date);
       });
   }

  // Other methods: getDailyNoteFormat, etc.
}
```

### 习惯的种类和类型

```typescript
// 基础习惯类型
interface BaseHabitProps {
  id: string;
  name: string;
  icon: string | React.ReactNode;
  completions: Record<string, number>;

  properties?: string[];
}

// 日常习惯类型
export interface DailyHabitProps extends BaseHabitProps {
  type: 'daily';
}

// 计数习惯类型
export interface CountHabitProps extends BaseHabitProps {
  type: 'count';
  maxCount: number;
  notice?: string;
}

export interface ScheduledEvent {
  name: string;
  details: string;
}

export interface ScheduledHabitProps extends BaseHabitProps {
  type: 'scheduled';
  events: ScheduledEvent[];
  completions: Record<string, Record<string, string>>;
}

export interface MappingHabitProps extends BaseHabitProps {
  type: 'mapping';
  mapping: Record<number, string>;
  completions: Record<string, number>;
}

// 所有习惯类型的联合
export type HabitProps = DailyHabitProps | CountHabitProps | ScheduledHabitProps | MappingHabitProps;

// 习惯卡片属性
export interface HabitCardProps {
  habit: HabitProps;
  toggleCompletion: (habitId: string) => void;
  triggerConfetti?: (pos: {
    x: number
    y: number
    width?: number
    height?: number
  }) => void;
  children?: React.ReactNode;
}

interface MappingHabitCardProps extends HabitCardProps {
  toggleCompletion: (habitId: string, value: number) => void;
}

interface ScheduledHabitCardProps extends HabitCardProps {
  toggleCompletion: (habitId: string, {
    id,
    details
  }: {
    id: string;
    details: string;
  }) => void;
}

```

### 设置和相关类型

```typescript
import { LucideIcon } from "lucide-react";

// 基础习惯类型
interface BaseHabitProps {
  id: string;
  name: string;
  icon: string | React.ReactNode;
  completions: Record<string, number>;

  properties?: string[];
}

// 日常习惯类型
export interface DailyHabitProps extends BaseHabitProps {
  type: 'daily';
}

// 计数习惯类型
export interface CountHabitProps extends BaseHabitProps {
  type: 'count';
  maxCount: number;
  notice?: string;
}

export interface ScheduledEvent {
  name: string;
  details: string;
}

export interface ScheduledHabitProps extends BaseHabitProps {
  type: 'scheduled';
  events: ScheduledEvent[];
  completions: Record<string, Record<string, string>>;
}

export interface MappingHabitProps extends BaseHabitProps {
  type: 'mapping';
  mapping: Record<number, string>;
  completions: Record<string, number>;
}

// 所有习惯类型的联合
export type HabitProps = DailyHabitProps | CountHabitProps | ScheduledHabitProps | MappingHabitProps;

// 习惯卡片属性
export interface HabitCardProps {
  habit: HabitProps;
  toggleCompletion: (habitId: string) => void;
  triggerConfetti?: (pos: {
    x: number
    y: number
    width?: number
    height?: number
  }) => void;
  children?: React.ReactNode;
}

interface MappingHabitCardProps extends HabitCardProps {
  toggleCompletion: (habitId: string, value: number) => void;
}

interface ScheduledHabitCardProps extends HabitCardProps {
  toggleCompletion: (habitId: string, {
    id,
    details
  }: {
    id: string;
    details: string;
  }) => void;
}

```


## 5. 习惯视图 UI

- **日历视图**: 显示一个日历（例如，月视图），其中每个日期单元格通过视觉方式（如颜色编码的点）指示所选习惯的完成状态。点击某一天可以导航到对应的日记笔记。
- **列表/统计视图**: 显示已定义习惯的列表。对于每个习惯，展示：
    - 当前连续完成天数（连续完成的天数/周期）
    - 最长连续完成记录
    - 完成百分比（例如，过去30天内）
    - 最近活动日志
- **筛选/选择**: 允许用户选择在视图中显示哪些习惯。
- **与任务视图集成**: 如果某个习惯当天尚未记录，可能在相关的任务视图透视图中将其显示为"为今天记录习惯X"的循环任务。

## 6. 设置

- **习惯定义**: 专门的部分用于添加、编辑和删除习惯（`id`、`name`、`metadataKey`、`frequency`等）。
- **日记笔记配置**: 允许用户指定路径模式或依赖周期性笔记/日历插件设置来识别日记笔记。
- **视觉设置**: 日历外观、颜色等选项。
- **数据管理**: 触发习惯数据完全重新扫描/重新索引的按钮。

## 7. 性能与可扩展性

- **元数据缓存依赖**: 严重依赖Obsidian的`metadataCache`。性能取决于其效率。
- **高效更新**: `metadataCache.on('changed')`处理程序必须高效，快速过滤无关变更并仅更新`HabitCache`中必要的部分。
- **初始扫描时间**: 对于包含数千个日记笔记的保险库，初始扫描可能需要时间。考虑后台处理或进度指示。
- **缓存大小**: `HabitCache`大小可能会显著增长。确保高效的数据结构，并考虑如果持久化存储，可能的序列化/反序列化性能。更新时需要谨慎管理日志排序。

## 8. 开放问题与未来考虑

- 如何处理非每日频率的习惯（例如，每周）？基于`date`的索引可能需要调整。
    - 怎么实现每天
- 如何为非每日习惯定义*预期*完成情况，以准确计算连续完成天数？
- 支持数值型习惯值（例如，跟踪分钟数、阅读页数）并将其可视化。
- 更复杂的连续完成天数计算（处理非每日习惯的跳过天数）。
- 导出/导入习惯数据和统计信息。
- 习惯数据的高级查询/筛选。
