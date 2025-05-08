/**
 * Task Details Popover Component
 * Used in desktop environments to display task details in a menu popover.
 */

import { App, debounce, MarkdownView, TFile } from "obsidian";
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
	private win: Window;
	private scrollParent: HTMLElement | Window;

	constructor(app: App, plugin: TaskProgressBarPlugin, task: Task) {
		this.app = app;
		this.plugin = plugin;
		this.task = task;
		this.win = app.workspace.containerEl.win || window;
		// Determine a reasonable scroll parent.
		const scrollEl = app.workspace.containerEl.closest(".cm-scroller");
		if (scrollEl instanceof HTMLElement) {
			this.scrollParent = scrollEl;
		} else {
			this.scrollParent = this.win;
		}
	}

	debounceUpdateTask = debounce(async (task: Task) => {
		await this.plugin.taskManager.updateTask(task);
	}, 200);

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

		console.log(this.task);

		// Listen for metadata change events
		this.metadataEditor.onMetadataChange = async (event) => {
			// Create a base task object with the updated field
			const updatedTask = {
				...this.task,
				[event.field]: event.value,
				line: this.task.line - 1,
				id: `${this.task.filePath}-L${this.task.line - 1}`,
			};

			// Update the internal task reference

			// Only update completed status and completedDate if the status field is changing to a completed state
			if (
				event.field === "status" &&
				(event.value === "x" || event.value === "X")
			) {
				updatedTask.completed = true;
				updatedTask.completedDate = Date.now();
			} else if (event.field === "status") {
				// If status is changing to something else, mark as not completed
				updatedTask.completed = false;
				updatedTask.completedDate = undefined;
			}

			this.task = {
				...this.task,
				[event.field]: event.value,
				completed: updatedTask.completed,
				completedDate: updatedTask.completedDate,
			};

			// Update the task with all changes
			this.debounceUpdateTask(updatedTask);
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

	private scrollHandler = (e: Event) => {
		if (this.popoverRef) {
			if (
				e.target instanceof Node &&
				this.popoverRef.contains(e.target)
			) {
				const targetElement = e.target as HTMLElement;
				if (
					targetElement.scrollHeight > targetElement.clientHeight ||
					targetElement.scrollWidth > targetElement.clientWidth
				) {
					return;
				}
			}
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

		// First check if there's enough space to the right
		if (left + menuWidth > viewportWidth - 20) {
			// Not enough space to the right, try positioning to the left of the click
			// But don't move all the way to the left edge (20px)
			console.log(position.x - menuWidth);
			left = Math.max(position.x - menuWidth, 20);

			// If we're still off the right edge somehow, just align to the right edge
			if (left + menuWidth > viewportWidth - 20) {
				left = viewportWidth - menuWidth - 20;
			}
		}

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

		this.popoverRef.style.position = "fixed";
		this.popoverRef.style.top = `${top}px`;
		this.popoverRef.style.left = `${left}px`;
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
