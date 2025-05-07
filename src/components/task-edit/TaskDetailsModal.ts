/**
 * 任务详情模态框组件
 * 用于移动环境，显示完整的任务详情和编辑界面
 */

import { App, Modal, TFile, MarkdownView } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import TaskProgressBarPlugin from "../../index";
import { TaskMetadataEditor } from "./MetadataEditor";

export class TaskDetailsModal extends Modal {
	private task: Task;
	private plugin: TaskProgressBarPlugin;
	private metadataEditor: TaskMetadataEditor;
	private onTaskUpdated: (task: Task) => Promise<void>;

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		task: Task,
		onTaskUpdated?: (task: Task) => Promise<void>
	) {
		super(app);
		this.task = task;
		this.plugin = plugin;
		this.onTaskUpdated = onTaskUpdated || (async () => {});

		// 设置模态框样式
		this.modalEl.addClass("task-details-modal");
		this.titleEl.setText("编辑任务");
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// 创建元数据编辑器，使用完整模式
		this.metadataEditor = new TaskMetadataEditor(
			contentEl,
			this.app,
			this.plugin,
			false // 完整模式，非紧凑模式
		);

		// 初始化编辑器并显示任务
		this.metadataEditor.onload();
		this.metadataEditor.showTask(this.task);

		// 监听元数据变更事件
		this.metadataEditor.onMetadataChange = async (event) => {
			// 处理特殊操作
			if (event.field === "save") {
				await this.onTaskUpdated(this.task);
				this.close();
				return;
			}

			if (event.field === "editInFile") {
				this.navigateToTaskInFile();
				this.close();
				return;
			}

			// 更新任务数据
			this.updateTaskField(event.field, event.value);
		};
	}

	onClose() {
		const { contentEl } = this;
		if (this.metadataEditor) {
			this.metadataEditor.onunload();
		}
		contentEl.empty();
	}

	/**
	 * 更新任务字段
	 */
	private updateTaskField(field: string, value: any) {
		if (field in this.task) {
			(this.task as any)[field] = value;
		}
	}

	/**
	 * 在文件中导航到任务所在位置
	 */
	private async navigateToTaskInFile() {
		const { filePath, line } = this.task;
		if (!filePath) return;

		// 打开文件
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;

		const leaf = this.app.workspace.getLeaf();
		await leaf.openFile(file);

		// 如果有行号，定位到该行
		if (line !== undefined) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.editor) {
				const pos = { line: line, ch: 0 };
				view.editor.setCursor(pos);
				view.editor.scrollIntoView({ from: pos, to: pos }, true);
			}
		}
	}
}
