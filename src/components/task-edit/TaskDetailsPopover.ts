/**
 * 任务详情弹出层组件
 * 用于桌面环境，菜单弹出式显示任务详情
 */

import { App, Menu, MenuItem, MarkdownView, TFile } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import TaskProgressBarPlugin from "../../index";
import { TaskMetadataEditor } from "./MetadataEditor";

export class TaskDetailsPopover {
	private task: Task;
	private plugin: TaskProgressBarPlugin;
	private app: App;
	private menu: Menu;
	private metadataEditor: TaskMetadataEditor;
	private onTaskUpdated: (task: Task) => Promise<void>;

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		task: Task,
		onTaskUpdated?: (task: Task) => Promise<void>
	) {
		this.app = app;
		this.plugin = plugin;
		this.task = task;
		this.onTaskUpdated = onTaskUpdated || (async () => {});
		this.menu = new Menu();
	}

	/**
	 * 显示任务详情弹出层
	 */
	showAtPosition(position: { x: number; y: number }) {
		// 创建内容容器
		const contentEl = createDiv({ cls: "task-popover-content" });

		// 创建元数据编辑器，使用紧凑模式
		this.metadataEditor = new TaskMetadataEditor(
			contentEl,
			this.app,
			this.plugin,
			true // 紧凑模式
		);

		// 初始化编辑器并显示任务
		this.metadataEditor.onload();
		this.metadataEditor.showTask(this.task);

		// 监听元数据变更事件
		this.metadataEditor.onMetadataChange = async (event) => {
			// 处理特殊操作
			if (event.field === "editInFile") {
				this.navigateToTaskInFile();
				this.menu.close();
				return;
			}

			// 更新任务数据
			this.updateTaskField(event.field, event.value);

			// 如果更新了状态，保存任务并关闭弹出层
			if (event.field === "status") {
				await this.onTaskUpdated(this.task);
				this.menu.close();
			}
		};

		// 将内容添加到菜单
		this.menu.addItem((item: MenuItem) => {
			item.setTitle("任务详情");

			// 获取菜单项DOM元素后添加内容
			setTimeout(() => {
				const itemEl = (item as any).dom as HTMLElement;
				if (itemEl) {
					// 清除标题文本，使用自定义内容
					itemEl.empty();
					itemEl.appendChild(contentEl);
				}
			}, 0);
		});

		// 显示菜单
		this.menu.showAtPosition(position);
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
			const activeView =
				this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.editor) {
				const pos = { line: line, ch: 0 };
				activeView.editor.setCursor(pos);
				activeView.editor.scrollIntoView({ from: pos, to: pos }, true);
			}
		}
	}

	/**
	 * 关闭弹出层
	 */
	close() {
		if (this.menu) {
			this.menu.close();
		}

		if (this.metadataEditor) {
			this.metadataEditor.onunload();
		}
	}
}
