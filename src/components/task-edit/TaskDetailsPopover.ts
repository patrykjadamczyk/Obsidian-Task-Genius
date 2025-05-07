/**
 * Task Details Popover Component
 * Used in desktop environments to display task details in a menu popover.
 */

import { App, MarkdownView, TFile } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import TaskProgressBarPlugin from "../../index";
import { TaskMetadataEditor } from "./MetadataEditor";
import { t } from "../../translations/helper";

export class TaskDetailsPopover {
	private task: Task;
	private plugin: TaskProgressBarPlugin;
	private app: App;
	private popoverRef: HTMLDivElement | null = null;
	private metadataEditor: TaskMetadataEditor;
	private onTaskUpdated: (task: Task) => Promise<void>;
	private win: Window;
	private scrollParent: HTMLElement | Window;

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
		this.win = app.workspace.containerEl.win || window;
		// Determine a reasonable scroll parent.
		const scrollEl = app.workspace.containerEl.closest(".cm-scroller");
		if (scrollEl instanceof HTMLElement) {
			this.scrollParent = scrollEl;
		} else {
			this.scrollParent = this.win;
		}
	}

	/**
	 * Shows the task details popover at the given position.
	 */
	showAtPosition(position: { x: number; y: number }) {
		if (this.popoverRef) {
			this.close();
		}

		// Create content container
		const contentEl = createDiv({ cls: "task-popover-content" });

		// Create metadata editor, use compact mode
		this.metadataEditor = new TaskMetadataEditor(
			contentEl,
			this.app,
			this.plugin,
			true // Compact mode
		);

		// Initialize editor and display task
		this.metadataEditor.onload();
		this.metadataEditor.showTask(this.task);

		// Listen for metadata change events
		this.metadataEditor.onMetadataChange = async (event) => {
			this.plugin.taskManager.updateTask({
				...this.task,
				line: this.task.line,
				id: `${this.task.filePath}-L${this.task.line}`,
				[event.field]: event.value,
			});
		};

		// Create the popover
		this.popoverRef = this.app.workspace.containerEl.createDiv({
			cls: "task-details-popover tg-menu bm-menu", // Borrowing some classes from IconMenu
		});
		this.popoverRef.appendChild(contentEl);

		// Add a title bar to the popover
		const titleBar = this.popoverRef.createDiv({
			cls: "tg-popover-titlebar",
			text: t("Task Details"),
		});
		// Prepend titleBar to popoverRef so it's at the top
		this.popoverRef.insertBefore(titleBar, this.popoverRef.firstChild);

		document.body.appendChild(this.popoverRef);
		this.calcPopoverPos(position);

		// Use timeout to ensure popover is rendered before adding listeners
		this.win.setTimeout(() => {
			this.win.addEventListener("click", this.clickOutside);
			this.scrollParent.addEventListener(
				"scroll",
				this.scrollHandler,
				true
			); // Use capture for scroll
		}, 10);
	}

	private clickOutside = (e: MouseEvent) => {
		if (this.popoverRef && !this.popoverRef.contains(e.target as Node)) {
			this.close();
		}
	};

	private scrollHandler = () => {
		if (this.popoverRef) {
			this.close();
		}
	};

	private calcPopoverPos(position: { x: number; y: number }) {
		if (!this.popoverRef) return;

		// Get menu dimensions
		const menuHeight = this.popoverRef.offsetHeight;
		const menuWidth = this.popoverRef.offsetWidth;

		// Get viewport dimensions
		const viewportWidth = this.win.innerWidth;
		const viewportHeight = this.win.innerHeight;

		let top = position.y;
		let left = position.x;

		// Adjust if popover goes off bottom edge
		if (top + menuHeight > viewportHeight - 20) {
			// 20px buffer
			top = viewportHeight - menuHeight - 20;
		}

		// Adjust if popover goes off top edge
		if (top < 20) {
			// 20px buffer
			top = 20;
		}

		// Adjust if popover goes off right edge
		if (left + menuWidth > viewportWidth - 20) {
			// 20px buffer
			left = viewportWidth - menuWidth - 20;
		}

		// Adjust if popover goes off left edge
		if (left < 20) {
			// 20px buffer
			left = 20;
		}

		this.popoverRef.style.position = "fixed";
		this.popoverRef.style.top = `${top}px`;
		this.popoverRef.style.left = `${left}px`;
	}

	/**
	 * Updates a task field.
	 */
	private updateTaskField(field: string, value: any) {
		if (field in this.task) {
			(this.task as any)[field] = value;
		}
	}

	/**
	 * Navigates to the task's location in the file.
	 */
	private async navigateToTaskInFile() {
		const { filePath, line } = this.task;
		if (!filePath) return;

		// Open the file
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;

		const leaf = this.app.workspace.getLeaf();
		await leaf.openFile(file);

		// If there's a line number, navigate to that line
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
	 * Closes the popover.
	 */
	close() {
		if (this.popoverRef) {
			this.popoverRef.remove();
			this.popoverRef = null;
		}

		this.win.removeEventListener("click", this.clickOutside);
		this.scrollParent.removeEventListener(
			"scroll",
			this.scrollHandler,
			true
		);

		if (this.metadataEditor) {
			this.metadataEditor.onunload();
		}
	}
}
