# InlineEditor 性能优化

## 问题描述

在为 TreeItem 和 ListItem 组件添加 InlineEditor 功能后，发现性能显著下降，渲染时间大幅增加。主要问题包括：

1. **每个任务都创建 InlineEditor 实例**：即使用户可能永远不会编辑该任务
2. **大量事件监听器**：每个 InlineEditor 都注册了多个 DOM 事件
3. **重复的对象克隆**：在构造函数中进行不必要的任务对象克隆
4. **自动完成组件的过早初始化**：ProjectSuggest、TagSuggest 等在显示时就创建

## 优化方案

### 1. 懒加载初始化 (Lazy Initialization)

**优化前：**
```typescript
constructor() {
    // 在构造函数中立即创建 InlineEditor
    this.inlineEditor = new InlineEditor(this.app, this.plugin, this.task, options);
    this.addChild(this.inlineEditor);
}
```

**优化后：**
```typescript
constructor() {
    // 不在构造函数中创建编辑器
    this.inlineEditor = null;
}

private getInlineEditor(): InlineEditor {
    if (!this.inlineEditor) {
        // 只在需要时创建
        this.inlineEditor = new InlineEditor(this.app, this.plugin, this.task, options);
        this.addChild(this.inlineEditor);
    }
    return this.inlineEditor;
}
```

### 2. 编辑器管理器 (InlineEditorManager)

创建了一个共享的编辑器管理器，使用对象池模式来重用编辑器实例：

```typescript
export class InlineEditorManager extends Component {
    private editorPool: InlineEditor[] = [];
    private activeEditors = new Map<string, InlineEditor>();
    private maxPoolSize = 5;

    public getEditor(task: Task, options: InlineEditorOptions): InlineEditor {
        // 检查是否已有活跃编辑器
        const existingEditor = this.activeEditors.get(task.id);
        if (existingEditor) {
            return existingEditor;
        }

        // 从池中获取或创建新编辑器
        let editor = this.editorPool.pop();
        if (!editor) {
            editor = new InlineEditor(this.app, this.plugin, task, options);
            this.addChild(editor);
        } else {
            editor.updateTask(task, options);
        }

        this.activeEditors.set(task.id, editor);
        return editor;
    }

    public releaseEditor(taskId: string): void {
        const editor = this.activeEditors.get(taskId);
        if (!editor) return;

        this.activeEditors.delete(taskId);
        editor.reset();

        // 返回到池中或销毁
        if (this.editorPool.length < this.maxPoolSize) {
            this.editorPool.push(editor);
        } else {
            this.removeChild(editor);
            editor.unload();
        }
    }
}
```

### 3. InlineEditor 内部优化

**延迟对象克隆：**
```typescript
constructor(task: Task, options: InlineEditorOptions) {
    // 不立即克隆任务对象
    this.task = task;
    this.originalTask = null;
    this.debouncedSave = null;
}

private initializeEditingState(): void {
    if (!this.originalTask) {
        this.originalTask = { ...this.task };
        this.task = { ...this.task }; // 只在编辑时克隆
    }
    
    if (!this.debouncedSave) {
        this.debouncedSave = debounce(this.saveTask.bind(this), 500);
    }
}
```

**延迟自动完成组件创建：**
```typescript
private createProjectEditor(container: HTMLElement, currentValue?: string): void {
    this.activeInput = container.createEl("input", {
        cls: "inline-project-input",
        type: "text",
        value: currentValue || "",
        placeholder: "Enter project name...",
    });

    // 只在需要时创建自动完成
    this.activeSuggest = new ProjectSuggest(this.app, this.activeInput, this.plugin);
    
    this.setupInputEvents(this.activeInput, (value) => {
        this.task.project = value || undefined;
    });
}
```

### 4. 共享编辑器管理器

TreeItem 和 ListItem 组件现在使用静态的共享编辑器管理器：

```typescript
export class TaskTreeItemComponent extends Component {
    private static editorManager: InlineEditorManager | null = null;

    constructor() {
        // 初始化共享编辑器管理器
        if (!TaskTreeItemComponent.editorManager) {
            TaskTreeItemComponent.editorManager = new InlineEditorManager(this.app, this.plugin);
        }
    }

    private getInlineEditor(): InlineEditor {
        return TaskTreeItemComponent.editorManager!.getEditor(this.task, editorOptions);
    }

    private isCurrentlyEditing(): boolean {
        return TaskTreeItemComponent.editorManager?.hasActiveEditor(this.task.id) || false;
    }
}
```

## 性能提升效果

1. **内存使用减少**：只有正在编辑的任务才会创建编辑器实例
2. **初始化时间缩短**：避免了大量不必要的对象创建和事件监听器注册
3. **更好的资源管理**：通过对象池重用编辑器实例
4. **响应性提升**：减少了 DOM 操作和事件处理开销

## 使用注意事项

1. **编辑器清理**：组件卸载时需要释放编辑器资源
2. **状态管理**：确保编辑器状态正确重置和更新
3. **内存泄漏防护**：限制对象池大小，避免无限增长

这些优化显著提升了任务列表和树形视图的渲染性能，特别是在处理大量任务时。 
