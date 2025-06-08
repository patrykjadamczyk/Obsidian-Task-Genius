/**
 * Task Gutter Handler - Handles interaction for task markers in the gutter.
 * Displays a marker in front of task lines; clicking it shows task details.
 */

import { EditorView } from "@codemirror/view";
import { gutter, GutterMarker } from "./patchedGutter";
import { Extension } from "@codemirror/state";
import { RangeSetBuilder } from "@codemirror/state";
import {
	App,
	Modal,
	Menu,
	Platform,
	MenuItem,
	ExtraButtonComponent,
} from "obsidian";
import { Task } from "../types/task";
import TaskProgressBarPlugin from "../index";
import { TaskDetailsModal } from "../components/task-edit/TaskDetailsModal";
import { TaskDetailsPopover } from "../components/task-edit/TaskDetailsPopover";
import { CoreTaskParser } from "../utils/parsing/CoreTaskParser";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import "../styles/task-gutter.css";

const taskRegex = /^(([\s>]*)?(-|\d+\.|\*|\+)\s\[(.)\])\s+(.*)$/m;

class TaskMarker extends GutterMarker {
	constructor(public task: Task) {
		super();
	}

	toDOM(view: EditorView): HTMLElement {
		const marker = document.createElement("div");
		marker.className = "task-gutter-marker";

		const icon = document.createElement("span");
		icon.className = "task-gutter-icon";

		// Set icon based on task status
		if (this.task.completed) {
			icon.textContent = "✓";
			marker.classList.add("completed");
		} else if (
			this.task.metadata.priority &&
			this.task.metadata.priority > 3
		) {
			icon.textContent = "!";
			marker.classList.add("high-priority");
		} else {
			icon.textContent = "○";
			marker.classList.add("pending");
		}

		marker.appendChild(icon);
		return marker;
	}

	eq(other: GutterMarker): boolean {
		return (
			other instanceof TaskMarker &&
			this.task.id === other.task.id &&
			this.task.completed === other.task.completed &&
			this.task.metadata.priority === other.task.metadata.priority
		);
	}

	destroy(dom: HTMLElement): void {
		// Clean up any event listeners if needed
	}
}

class TaskGutterCompartment {
	private plugin: TaskProgressBarPlugin;
	private enabled: boolean = false;

	constructor(plugin: TaskProgressBarPlugin) {
		this.plugin = plugin;
	}

	enable(): Extension {
		if (this.enabled) return [];

		this.enabled = true;
		return [
			gutter({
				class: "task-gutter",
				lineMarker: (view, line) => this.getLineMarker(view, line),
				domEventHandlers: {
					click: (view, line, event) =>
						this.handleClick(view, line, event as MouseEvent),
					contextmenu: (view, line, event) =>
						this.handleContextMenu(view, line, event as MouseEvent),
				},
			}),
		];
	}

	disable(): void {
		this.enabled = false;
	}

	private getLineMarker(view: EditorView, line: any): GutterMarker | null {
		const lineText = view.state.doc.lineAt(line.from).text;
		const lineNumber = view.state.doc.lineAt(line.from).number;
		const filePath = this.plugin.app.workspace.getActiveFile()?.path || "";

		// Skip if not a task
		if (!taskRegex.test(lineText)) return null;

		// Check if the line is in a codeblock or frontmatter
		const syntaxNode = syntaxTree(view.state).resolveInner(line.from + 1);
		const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);

		if (nodeProps) {
			const props = nodeProps.split(" ");
			if (
				props.includes("hmd-codeblock") ||
				props.includes("hmd-frontmatter")
			) {
				return null;
			}
		}

		const task = getTaskFromLine(
			this.plugin,
			filePath,
			lineText,
			lineNumber - 1
		);
		if (task) {
			return new TaskMarker(task);
		}

		return null;
	}

	private handleClick(
		view: EditorView,
		line: any,
		event: MouseEvent
	): boolean {
		const lineText = view.state.doc.lineAt(line.from).text;
		const lineNumber = view.state.doc.lineAt(line.from).number;
		const filePath = this.plugin.app.workspace.getActiveFile()?.path || "";
		const task = getTaskFromLine(
			this.plugin,
			filePath,
			lineText,
			lineNumber - 1
		);

		if (task) {
			if (Platform.isMobile) {
				this.showTaskDetailsModal(task);
			} else {
				this.showTaskDetailsPopover(task, event);
			}
			return true;
		}

		return false;
	}

	private handleContextMenu(
		view: EditorView,
		line: any,
		event: MouseEvent
	): boolean {
		const lineText = view.state.doc.lineAt(line.from).text;
		const lineNumber = view.state.doc.lineAt(line.from).number;
		const filePath = this.plugin.app.workspace.getActiveFile()?.path || "";
		const task = getTaskFromLine(
			this.plugin,
			filePath,
			lineText,
			lineNumber - 1
		);

		if (task) {
			this.showContextMenu(task, event);
			return true;
		}

		return false;
	}

	private showTaskDetailsModal(task: Task): void {
		new TaskDetailsModal(this.plugin.app, this.plugin, task).open();
	}

	private showTaskDetailsPopover(task: Task, event: MouseEvent): void {
		const popover = new TaskDetailsPopover(
			this.plugin.app,
			this.plugin,
			task
		);
		popover.showAtPosition({
			x: event.clientX,
			y: event.clientY,
		});
	}

	private showContextMenu(task: Task, event: MouseEvent): void {
		const menu = new Menu();

		menu.addItem((item: MenuItem) => {
			item.setTitle(
				task.completed ? "Mark as incomplete" : "Mark as complete"
			)
				.setIcon(task.completed ? "circle" : "check-circle")
				.onClick(() => {
					// Toggle task completion
					const updatedTask = { ...task, completed: !task.completed };
					this.plugin.taskManager.updateTask(updatedTask);
				});
		});

		menu.addSeparator();

		menu.addItem((item: MenuItem) => {
			item.setTitle("Edit task")
				.setIcon("edit")
				.onClick(() => {
					this.showTaskDetailsModal(task);
				});
		});

		menu.showAtMouseEvent(event);
	}
}

// Core task parser instance - shared across the module
let taskParser: CoreTaskParser | null = null;

/**
 * Parses a task from the line content using the unified core parser.
 */
const getTaskFromLine = (
	plugin: TaskProgressBarPlugin,
	filePath: string,
	line: string,
	lineNum: number
): Task | null => {
	// Lazily load the task parser with plugin settings
	if (!taskParser) {
		taskParser = new CoreTaskParser({
			preferMetadataFormat:
				plugin.settings.preferMetadataFormat || "tasks",
			parseHeadings: false, // Don't need heading context for single line parsing
			parseHierarchy: false, // Don't need hierarchy for single line parsing
		});
	}

	try {
		return taskParser.parseTaskLine(filePath, line, lineNum);
	} catch (error) {
		console.error("Error parsing task:", error);
		return null;
	}
};

/**
 * Reset the parser when settings change
 */
export const resetTaskParser = (): void => {
	taskParser = null;
};

export { TaskGutterCompartment };
