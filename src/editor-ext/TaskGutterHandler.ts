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
import { TaskDetailsModal } from "../components/task-edit/TaskDetailsModal";
import { TaskDetailsPopover } from "../components/task-edit/TaskDetailsPopover";
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
	// 任务更新回调函数
	const onTaskUpdated = async (updatedTask: Task) => {
		if (plugin.taskManager) {
			await plugin.taskManager.updateTask(updatedTask);
		}
	};

	if (Platform.isDesktop) {
		// 桌面环境 - 显示Popover
		const popover = new TaskDetailsPopover(
			app,
			plugin,
			task,
			onTaskUpdated
		);
		popover.showAtPosition({ x: event.clientX, y: event.clientY });
	} else {
		// 移动环境 - 显示Modal
		const modal = new TaskDetailsModal(app, plugin, task, onTaskUpdated);
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
			".task-metadata-editor": {
				display: "flex",
				flexDirection: "column",
				gap: "8px",
				padding: "4px",
			},
			".task-content-preview": {
				fontSize: "0.9em",
				padding: "4px",
				borderBottom: "1px solid var(--background-modifier-border)",
				marginBottom: "8px",
				whiteSpace: "nowrap",
				overflow: "hidden",
				textOverflow: "ellipsis",
				maxWidth: "280px",
			},
			".field-container": {
				display: "flex",
				flexDirection: "column",
				marginBottom: "4px",
			},
			".field-label": {
				fontSize: "0.8em",
				fontWeight: "bold",
				marginBottom: "2px",
				color: "var(--text-muted)",
			},
			".action-buttons": {
				display: "flex",
				justifyContent: "space-between",
				marginTop: "8px",
				gap: "8px",
			},
			".action-button": {
				padding: "4px 8px",
				fontSize: "0.8em",
				borderRadius: "4px",
				cursor: "pointer",
			},
		}),
	];
}
