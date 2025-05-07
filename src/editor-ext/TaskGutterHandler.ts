/**
 * Task Gutter Handler - Handles interaction for task markers in the gutter.
 * Displays a marker in front of task lines; clicking it shows task details.
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
import {
	App,
	Modal,
	Menu,
	Platform,
	MenuItem,
	ExtraButtonComponent,
} from "obsidian";
import { Task } from "../utils/types/TaskIndex";
import TaskProgressBarPlugin from "../index";
import { TaskDetailsModal } from "../components/task-edit/TaskDetailsModal";
import { TaskDetailsPopover } from "../components/task-edit/TaskDetailsPopover";
import { TaskParser } from "../utils/import/TaskParser";
import { t } from "../translations/helper";
import "../styles/task-gutter.css";

const taskRegex = /^(([\s>]*)?(-|\d+\.|\*|\+)\s\[(.)\])\s*(.*)$/m;

// Task icon marker
class TaskGutterMarker extends GutterMarker {
	text: string;
	lineNum: number;
	view: EditorView;
	app: App;
	plugin: TaskProgressBarPlugin;

	constructor(
		text: string,
		lineNum: number,
		view: EditorView,
		app: App,
		plugin: TaskProgressBarPlugin
	) {
		super();
		this.text = text;
		this.lineNum = lineNum;
		this.view = view;
		this.app = app;
		this.plugin = plugin;
	}

	toDOM() {
		const markerEl = createEl("div");
		const button = new ExtraButtonComponent(markerEl)
			.setIcon("calendar-check")
			.onClick(() => {
				const lineText = this.view.state.doc.lineAt(this.lineNum).text;
				const file = this.app.workspace.getActiveFile();

				if (!file || !taskRegex.test(lineText)) return false;

				const lineNum =
					this.view.state.doc.lineAt(this.lineNum).number - 1;
				const task = getTaskFromLine(
					this.plugin,
					file.path,
					lineText,
					lineNum
				);

				if (task) {
					showTaskDetails(
						this.view,
						this.app,
						this.plugin,
						task,
						button.extraSettingsEl
					);
					return true;
				}

				return false;
			});

		button.extraSettingsEl.toggleClass("task-gutter-marker", true);
		return button.extraSettingsEl;
	}
}

/**
 * Shows task details.
 * Decides whether to show a Popover or a Modal based on the platform type.
 */
const showTaskDetails = (
	view: EditorView,
	app: App,
	plugin: TaskProgressBarPlugin,
	task: Task,
	extraSettingsEl: HTMLElement
) => {
	// Task update callback function
	const onTaskUpdated = async (updatedTask: Task) => {
		if (plugin.taskManager) {
			await plugin.taskManager.updateTask(updatedTask);
		}
	};

	if (Platform.isDesktop) {
		// Desktop environment - show Popover
		const popover = new TaskDetailsPopover(
			app,
			plugin,
			task,
			onTaskUpdated
		);
		const rect = extraSettingsEl.getBoundingClientRect();
		popover.showAtPosition({
			x: rect.left,
			y: rect.bottom + 10,
		});
	} else {
		// Mobile environment - show Modal
		const modal = new TaskDetailsModal(app, plugin, task, onTaskUpdated);
		modal.open();
	}
};

// Task parser instance
let taskParser: TaskParser | null = null;

/**
 * Parses a task from the line content.
 */
const getTaskFromLine = (
	plugin: TaskProgressBarPlugin,
	filePath: string,
	line: string,
	lineNum: number
): Task | null => {
	// Lazily load the task parser
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
 * Task Gutter Extension
 */
export function taskGutterExtension(
	app: App,
	plugin: TaskProgressBarPlugin
): Extension {
	// Create a regular expression to identify task lines

	return [
		gutter({
			class: "task-gutter",
			lineMarker(view, line) {
				const lineText = view.state.doc.lineAt(line.from).text;
				const lineNumber = view.state.doc.lineAt(line.from).number;
				if (taskRegex.test(lineText)) {
					return new TaskGutterMarker(
						lineText,
						lineNumber,
						view,
						app,
						plugin
					);
				}
				return null;
			},
		}),
	];
}
