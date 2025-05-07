/**
 * 任务元数据编辑组件
 * 提供任务元数据的展示和编辑功能
 */

import { App, Component, setIcon } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import TaskProgressBarPlugin from "../../index";

export interface MetadataChangeEvent {
	field: string;
	value: any;
	task: Task;
}

export class TaskMetadataEditor extends Component {
	private task: Task;
	private container: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	private app: App;
	private isCompactMode: boolean;

	onMetadataChange: (event: MetadataChangeEvent) => void;

	constructor(
		container: HTMLElement,
		app: App,
		plugin: TaskProgressBarPlugin,
		isCompactMode = false
	) {
		super();
		this.container = container;
		this.app = app;
		this.plugin = plugin;
		this.isCompactMode = isCompactMode;
	}

	/**
	 * 显示任务元数据编辑界面
	 */
	showTask(task: Task): void {
		this.task = task;
		this.container.empty();
		this.container.addClass("task-metadata-editor");

		if (this.isCompactMode) {
			this.createCompactView();
		} else {
			this.createFullView();
		}
	}

	/**
	 * 创建紧凑视图 (用于Popover)
	 */
	private createCompactView(): void {
		// 创建任务内容预览
		this.createContentPreview();

		// 创建状态编辑器
		this.createStatusEditor();

		// 创建基本元数据编辑器 (优先级、日期等)
		const metadataContainer = this.container.createDiv({
			cls: "metadata-basic-container",
		});

		// 优先级编辑
		this.createPriorityEditor(metadataContainer);

		// 日期编辑 (截止日期)
		this.createDateEditor(
			metadataContainer,
			"截止日期",
			"dueDate",
			this.getDateString(this.task.dueDate)
		);

		// 底部操作按钮
		this.createActionButtons();
	}

	/**
	 * 创建完整视图 (用于Modal)
	 */
	private createFullView(): void {
		// 创建可编辑的内容区域
		this.createContentEditor();

		// 创建状态编辑器
		this.createStatusEditor();

		// 创建完整的元数据编辑区域
		const metadataContainer = this.container.createDiv({
			cls: "metadata-full-container",
		});

		// 项目编辑
		this.createProjectEditor(metadataContainer);

		// 标签编辑
		this.createTagsEditor(metadataContainer);

		// 上下文编辑
		this.createContextEditor(metadataContainer);

		// 优先级编辑
		this.createPriorityEditor(metadataContainer);

		// 日期编辑 (所有日期类型)
		const datesContainer = metadataContainer.createDiv({
			cls: "dates-container",
		});
		this.createDateEditor(
			datesContainer,
			"截止日期",
			"dueDate",
			this.getDateString(this.task.dueDate)
		);
		this.createDateEditor(
			datesContainer,
			"开始日期",
			"startDate",
			this.getDateString(this.task.startDate)
		);
		this.createDateEditor(
			datesContainer,
			"计划日期",
			"scheduledDate",
			this.getDateString(this.task.scheduledDate)
		);

		// 重复规则编辑
		this.createRecurrenceEditor(metadataContainer);

		// 底部操作按钮
		this.createActionButtons();
	}

	/**
	 * 将日期值转换为字符串
	 */
	private getDateString(dateValue: string | number | undefined): string {
		if (dateValue === undefined) return "";
		if (typeof dateValue === "number") {
			return new Date(dateValue).toISOString().split("T")[0];
		}
		return dateValue;
	}

	/**
	 * 创建任务内容预览 (只读)
	 */
	private createContentPreview(): void {
		const contentEl = this.container.createDiv({
			cls: "task-content-preview",
		});
		contentEl.setText(this.task.content);
	}

	/**
	 * 创建可编辑的任务内容
	 */
	private createContentEditor(): void {
		const contentContainer = this.container.createDiv({
			cls: "task-content-editor",
		});
		const contentLabel = contentContainer.createDiv({ cls: "field-label" });
		contentLabel.setText("内容");

		const contentInput = contentContainer.createEl("textarea", {
			cls: "task-content-input",
		});
		contentInput.value = this.task.content;
		contentInput.rows = 3;

		contentInput.addEventListener("change", () => {
			this.notifyMetadataChange("content", contentInput.value);
		});
	}

	/**
	 * 创建状态编辑器
	 */
	private createStatusEditor(): void {
		const statusContainer = this.container.createDiv({
			cls: "task-status-editor",
		});
		const statusLabel = statusContainer.createDiv({ cls: "field-label" });
		statusLabel.setText("状态");

		// 这里应该集成现有的StatusComponent或创建一个简化版本
		const statusSelect = statusContainer.createEl("select", {
			cls: "task-status-select",
		});

		// 添加状态选项 (应该从StatusComponent中获取可用状态)
		const statuses = ["todo", "done", "inprogress", "cancelled"];
		statuses.forEach((status) => {
			const option = statusSelect.createEl("option", { value: status });
			option.text =
				status === "todo"
					? "待办"
					: status === "done"
					? "完成"
					: status === "inprogress"
					? "进行中"
					: "取消";
			if (this.task.status === status) {
				option.selected = true;
			}
		});

		statusSelect.addEventListener("change", () => {
			this.notifyMetadataChange("status", statusSelect.value);
		});
	}

	/**
	 * 创建优先级编辑器
	 */
	private createPriorityEditor(container: HTMLElement): void {
		const fieldContainer = container.createDiv({
			cls: "field-container priority-container",
		});
		const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
		fieldLabel.setText("优先级");

		const select = fieldContainer.createEl("select", {
			cls: "priority-select",
		});
		const priorities = [
			{ value: "", label: "无" },
			{ value: "high", label: "高" },
			{ value: "medium", label: "中" },
			{ value: "low", label: "低" },
		];

		priorities.forEach((priority) => {
			const option = select.createEl("option", { value: priority.value });
			option.text = priority.label;
			// 优先级的字符串比较
			const taskPriority = this.getPriorityString(this.task.priority);
			if (taskPriority === priority.value) {
				option.selected = true;
			}
		});

		select.addEventListener("change", () => {
			this.notifyMetadataChange("priority", select.value);
		});
	}

	/**
	 * 将优先级值转换为字符串
	 */
	private getPriorityString(priority: string | number | undefined): string {
		if (priority === undefined) return "";
		return String(priority);
	}

	/**
	 * 创建日期编辑器
	 */
	private createDateEditor(
		container: HTMLElement,
		label: string,
		field: string,
		value: string
	): void {
		const fieldContainer = container.createDiv({
			cls: `field-container date-container ${field}-container`,
		});
		const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
		fieldLabel.setText(label);

		const dateInput = fieldContainer.createEl("input", {
			cls: `date-input ${field}-input`,
			type: "date",
		});

		if (value) {
			// 日期格式转换 (应匹配插件中使用的日期格式)
			try {
				const date = new Date(value);
				const formattedDate = date.toISOString().split("T")[0];
				dateInput.value = formattedDate;
			} catch (e) {
				console.error(`无法解析日期: ${value}`, e);
			}
		}

		dateInput.addEventListener("change", () => {
			this.notifyMetadataChange(field, dateInput.value);
		});
	}

	/**
	 * 创建项目编辑器
	 */
	private createProjectEditor(container: HTMLElement): void {
		const fieldContainer = container.createDiv({
			cls: "field-container project-container",
		});
		const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
		fieldLabel.setText("项目");

		const projectInput = fieldContainer.createEl("input", {
			cls: "project-input",
			type: "text",
			value: this.task.project || "",
		});

		// 应添加项目建议功能 (类似ProjectSuggest)

		projectInput.addEventListener("change", () => {
			this.notifyMetadataChange("project", projectInput.value);
		});
	}

	/**
	 * 创建标签编辑器
	 */
	private createTagsEditor(container: HTMLElement): void {
		const fieldContainer = container.createDiv({
			cls: "field-container tags-container",
		});
		const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
		fieldLabel.setText("标签");

		const tagsInput = fieldContainer.createEl("input", {
			cls: "tags-input",
			type: "text",
			value: Array.isArray(this.task.tags)
				? this.task.tags.join(", ")
				: "",
		});

		// 应添加标签建议功能 (类似TagSuggest)

		tagsInput.addEventListener("change", () => {
			const tags = tagsInput.value
				.split(",")
				.map((tag) => tag.trim())
				.filter((tag) => tag);
			this.notifyMetadataChange("tags", tags);
		});
	}

	/**
	 * 创建上下文编辑器
	 */
	private createContextEditor(container: HTMLElement): void {
		const fieldContainer = container.createDiv({
			cls: "field-container context-container",
		});
		const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
		fieldLabel.setText("上下文");

		const contextInput = fieldContainer.createEl("input", {
			cls: "context-input",
			type: "text",
			value: Array.isArray(this.task.context)
				? this.task.context.join(", ")
				: "",
		});

		// 应添加上下文建议功能 (类似ContextSuggest)

		contextInput.addEventListener("change", () => {
			const contexts = contextInput.value
				.split(",")
				.map((ctx) => ctx.trim())
				.filter((ctx) => ctx);
			this.notifyMetadataChange("context", contexts);
		});
	}

	/**
	 * 创建重复规则编辑器
	 */
	private createRecurrenceEditor(container: HTMLElement): void {
		const fieldContainer = container.createDiv({
			cls: "field-container recurrence-container",
		});
		const fieldLabel = fieldContainer.createDiv({ cls: "field-label" });
		fieldLabel.setText("重复规则");

		const recurrenceInput = fieldContainer.createEl("input", {
			cls: "recurrence-input",
			type: "text",
			value: this.task.recurrence || "",
		});

		recurrenceInput.addEventListener("change", () => {
			this.notifyMetadataChange("recurrence", recurrenceInput.value);
		});
	}

	/**
	 * 创建操作按钮
	 */
	private createActionButtons(): void {
		const buttonsContainer = this.container.createDiv({
			cls: "action-buttons",
		});

		// 保存按钮 (仅在Modal中显示)
		if (!this.isCompactMode) {
			const saveButton = buttonsContainer.createEl("button", {
				cls: "action-button save-button",
				text: "保存",
			});

			saveButton.addEventListener("click", () => {
				// 触发保存事件 (会由外部处理)
				this.notifyMetadataChange("save", true);
			});
		}

		// 在文件中编辑按钮
		const editInFileButton = buttonsContainer.createEl("button", {
			cls: "action-button edit-in-file-button",
			text: "在文件中编辑",
		});

		editInFileButton.addEventListener("click", () => {
			this.notifyMetadataChange("editInFile", true);
		});

		// 切换完成状态按钮
		const toggleStatusButton = buttonsContainer.createEl("button", {
			cls: "action-button toggle-status-button",
			text: this.task.status === "done" ? "标记为未完成" : "标记为完成",
		});

		toggleStatusButton.addEventListener("click", () => {
			const newStatus = this.task.status === "done" ? "todo" : "done";
			this.notifyMetadataChange("status", newStatus);
		});
	}

	/**
	 * 通知元数据变更
	 */
	private notifyMetadataChange(field: string, value: any): void {
		if (this.onMetadataChange) {
			this.onMetadataChange({
				field,
				value,
				task: this.task,
			});
		}
	}
}
