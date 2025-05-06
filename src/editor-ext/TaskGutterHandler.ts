/**
 * Task Gutter Handler - 任务标记行交互处理器
 * 在任务行前显示标记，点击后弹出任务详情
 */

import {
	EditorView,
	gutter,
	GutterMarker,
	Decoration,
	WidgetType,
} from "@codemirror/view";
import {
	StateField,
	StateEffect,
	RangeSet,
	Extension,
} from "@codemirror/state";
import { RegExpCursor } from "./regexp-cursor";
import { App, Modal, Menu, Platform, MenuItem } from "obsidian";
import { Task } from "../utils/types/TaskIndex";
import TaskProgressBarPlugin from "../index";
import { TaskDetailsComponent } from "../components/task-view/details";
import { TaskParser } from "../utils/import/TaskParser";

// 扩展TaskProgressBarPlugin类型
declare module "../index" {
	interface TaskProgressBarPlugin {
		taskManager?: {
			updateTask(task: Task): Promise<void>;
		};
	}
}

// 任务行标记效果
const taskMarkerEffect = StateEffect.define<{ pos: number; on: boolean }>({
	map: (val, mapping) => ({ pos: mapping.mapPos(val.pos), on: val.on }),
});

// 任务标记状态字段
const taskMarkerState = StateField.define<RangeSet<GutterMarker>>({
	create() {
		return RangeSet.empty;
	},
	update(set, transaction) {
		set = set.map(transaction.changes);
		for (let e of transaction.effects) {
			if (e.is(taskMarkerEffect)) {
				if (e.value.on)
					set = set.update({ add: [taskMarker.range(e.value.pos)] });
				else
					set = set.update({ filter: (from) => from != e.value.pos });
			}
		}
		return set;
	},
});

// 任务图标标记
class TaskGutterMarker extends GutterMarker {
	constructor() {
		super();
	}

	toDOM() {
		const markerEl = document.createElement("div");
		markerEl.className = "task-gutter-marker";
		markerEl.innerHTML = "🔍";
		markerEl.title = "查看/编辑任务";
		return markerEl;
	}
}

// 创建任务标记实例
const taskMarker = new TaskGutterMarker();

/**
 * 任务详情弹出窗口
 */
class TaskDetailsModal extends Modal {
	private task: Task;
	private plugin: TaskProgressBarPlugin;
	private detailsComponent: TaskDetailsComponent;

	constructor(app: App, task: Task, plugin: TaskProgressBarPlugin) {
		super(app);
		this.task = task;
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("task-details-modal");

		this.detailsComponent = new TaskDetailsComponent(
			contentEl,
			this.app,
			this.plugin
		);

		this.detailsComponent.onload();
		this.detailsComponent.showTaskDetails(this.task);

		// 任务更新回调
		this.detailsComponent.onTaskUpdate = async (task, updatedTask) => {
			// 更新任务
			if (this.plugin.taskManager) {
				await this.plugin.taskManager.updateTask(updatedTask);
			}
		};

		// 关闭弹窗按钮
		this.detailsComponent.toggleDetailsVisibility = (visible) => {
			if (!visible) this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		if (this.detailsComponent) {
			this.detailsComponent.onunload();
		}
		contentEl.empty();
	}
}

/**
 * 显示任务详情
 * 根据平台类型决定显示Popover还是Modal
 */
const showTaskDetails = (
	view: EditorView,
	app: App,
	plugin: TaskProgressBarPlugin,
	task: Task,
	event: MouseEvent
) => {
	if (Platform.isDesktop) {
		// 桌面环境 - 显示Popover
		const menu = new Menu();

		// 创建任务内容容器
		const contentEl = createDiv({ cls: "task-popover-content" });

		const detailsComponent = new TaskDetailsComponent(
			contentEl,
			app,
			plugin
		);

		detailsComponent.onload();
		detailsComponent.showTaskDetails(task);

		// 任务更新回调
		detailsComponent.onTaskUpdate = async (task, updatedTask) => {
			if (plugin.taskManager) {
				await plugin.taskManager.updateTask(updatedTask);
			}
		};

		// 将内容添加到菜单
		menu.addItem((item: MenuItem) => {
			item.setTitle("任务详情");
			const itemEl = item.dom as HTMLElement;
			itemEl.appendChild(contentEl);
		});

		// 在点击位置显示菜单
		menu.showAtPosition({ x: event.clientX, y: event.clientY });
	} else {
		// 移动环境 - 显示Modal
		const modal = new TaskDetailsModal(app, task, plugin);
		modal.open();
	}
};

// 任务解析器实例
let taskParser: TaskParser | null = null;

/**
 * 从行内容解析任务
 */
const getTaskFromLine = (
	plugin: TaskProgressBarPlugin,
	filePath: string,
	line: string,
	lineNum: number
): Task | null => {
	// 懒加载任务解析器
	if (!taskParser) {
		taskParser = new TaskParser();
	}

	try {
		return taskParser.parseTask(line, filePath, lineNum);
	} catch (error) {
		console.error("Error parsing task:", error);
		return null;
	}
};

/**
 * 任务Gutter扩展
 */
export function taskGutterExtension(
	app: App,
	plugin: TaskProgressBarPlugin
): Extension {
	// 创建任务行识别正则表达式
	const taskRegex = /^(([\s>]*)?(-|\d+\.|\*|\+)\s\[(.)\])\s*(.*)$/m;

	return [
		taskMarkerState,
		gutter({
			class: "task-gutter",
			markers: (view) => view.state.field(taskMarkerState),
			initialSpacer: () => taskMarker,
			domEventHandlers: {
				mousedown(view, line, event) {
					// 确保事件是MouseEvent类型
					if (!(event instanceof MouseEvent)) return false;

					const lineText = view.state.doc.lineAt(line.from).text;
					const file = app.workspace.getActiveFile();

					if (!file || !taskRegex.test(lineText)) return false;

					const lineNum = view.state.doc.lineAt(line.from).number - 1;
					const task = getTaskFromLine(
						plugin,
						file.path,
						lineText,
						lineNum
					);

					if (task) {
						showTaskDetails(view, app, plugin, task, event);
						return true;
					}

					return false;
				},
			},
		}),

		EditorView.updateListener.of((update) => {
			if (!update.docChanged && !update.viewportChanged) return;

			const file = app.workspace.getActiveFile();
			if (!file) return;

			// 清除现有标记
			let effects: StateEffect<unknown>[] = [];

			// 遍历可见行，为任务行添加标记
			const { state, viewport } = update.view;
			let pos = viewport.from;

			while (pos <= viewport.to) {
				const line = state.doc.lineAt(pos);
				const lineText = line.text;

				if (taskRegex.test(lineText)) {
					effects.push(
						taskMarkerEffect.of({ pos: line.from, on: true })
					);
				}

				pos = line.to + 1;
			}

			if (effects.length > 0) {
				update.view.dispatch({ effects });
			}
		}),

		EditorView.baseTheme({
			".task-gutter": {
				width: "20px",
			},
			".task-gutter-marker": {
				cursor: "pointer",
				fontSize: "14px",
				opacity: "0.6",
				transition: "opacity 0.2s ease",
			},
			".task-gutter-marker:hover": {
				opacity: "1",
			},
			".task-popover-content": {
				padding: "8px",
				maxWidth: "300px",
				maxHeight: "400px",
				overflow: "auto",
			},
		}),
	];
}
