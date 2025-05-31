import { App, Component, Menu } from "obsidian";
import { Task } from "../../types/task";
import { MarkdownRendererComponent } from "../MarkdownRenderer";
import "../../styles/task-list.css";
import { createTaskCheckbox } from "./details";
import { getRelativeTimeString } from "../../utils/dateUtil";
import { t } from "../../translations/helper";
import TaskProgressBarPlugin from "../../index";
import { TaskProgressBarSettings } from "../../common/setting-definition";
import { InlineEditor, InlineEditorOptions } from "./InlineEditor";

export class TaskListItemComponent extends Component {
	public element: HTMLElement;

	// Events
	public onTaskSelected: (task: Task) => void;
	public onTaskCompleted: (task: Task) => void;
	public onTaskUpdate: (task: Task, updatedTask: Task) => Promise<void>;

	public onTaskContextMenu: (event: MouseEvent, task: Task) => void;

	private markdownRenderer: MarkdownRendererComponent;
	private containerEl: HTMLElement;
	private contentEl: HTMLElement;

	private metadataEl: HTMLElement;

	private settings: TaskProgressBarSettings;
	private inlineEditor: InlineEditor;

	constructor(
		private task: Task,
		private viewMode: string,
		private app: App,
		private plugin: TaskProgressBarPlugin
	) {
		super();

		this.element = createEl("div", {
			cls: "task-item",
			attr: { "data-task-id": this.task.id },
		});

		this.settings = this.plugin.settings;

		// Initialize inline editor
		const editorOptions: InlineEditorOptions = {
			onTaskUpdate: async (originalTask: Task, updatedTask: Task) => {
				if (this.onTaskUpdate) {
					await this.onTaskUpdate(originalTask, updatedTask);
					// Update the task reference and re-render
					this.task = updatedTask;
					this.updateTaskDisplay();
				}
			},
			onContentEditFinished: (targetEl: HTMLElement) => {
				// Re-render the markdown content
				this.renderMarkdown();
			},
		};

		this.inlineEditor = new InlineEditor(
			this.app,
			this.plugin,
			this.task,
			editorOptions
		);
		this.addChild(this.inlineEditor);
	}

	onload() {
		this.registerDomEvent(this.element, "contextmenu", (event) => {
			console.log("contextmenu", event, this.task);
			if (this.onTaskContextMenu) {
				this.onTaskContextMenu(event, this.task);
			}
		});

		this.renderTaskItem();
	}

	private renderTaskItem() {
		this.element.empty();

		if (this.task.completed) {
			this.element.classList.add("task-completed");
		}

		// Task checkbox for completion status
		const checkboxEl = createEl(
			"div",
			{
				cls: "task-checkbox",
			},
			(el) => {
				// Create a checkbox input element
				const checkbox = createTaskCheckbox(
					this.task.status,
					this.task,
					el
				);

				this.registerDomEvent(checkbox, "click", (event) => {
					event.stopPropagation();

					if (this.onTaskCompleted) {
						this.onTaskCompleted(this.task);
					}

					if (this.task.status === " ") {
						checkbox.checked = true;
						checkbox.dataset.task = "x";
					}
				});
			}
		);

		this.element.appendChild(checkboxEl);
		this.containerEl = this.element.createDiv({
			cls: "task-item-container",
		});

		// Task content
		this.contentEl = createDiv({
			cls: "task-item-content",
		});
		this.containerEl.appendChild(this.contentEl);

		// Make content clickable for editing
		this.registerDomEvent(this.contentEl, "click", (e) => {
			e.stopPropagation();
			if (!this.inlineEditor.isCurrentlyEditing()) {
				this.inlineEditor.showContentEditor(this.contentEl);
			}
		});

		this.renderMarkdown();

		this.metadataEl = this.containerEl.createDiv({
			cls: "task-item-metadata",
		});

		this.renderMetadata();

		// Priority indicator if available
		if (this.task.priority) {
			const priorityEl = createDiv({
				cls: ["task-priority", `priority-${this.task.priority}`],
			});

			// Priority icon based on level
			let icon = "•";
			icon = "!".repeat(this.task.priority);

			priorityEl.textContent = icon;
			this.element.appendChild(priorityEl);
		}

		// Click handler to select task
		this.registerDomEvent(this.element, "click", () => {
			if (this.onTaskSelected) {
				this.onTaskSelected(this.task);
			}
		});
	}

	private renderMetadata() {
		this.metadataEl.empty();

		// Display dates based on task completion status
		if (!this.task.completed) {
			// For incomplete tasks, show due, scheduled, and start dates

			// Due date if available
			if (this.task.dueDate) {
				this.renderDateMetadata("due", this.task.dueDate);
			}

			// Scheduled date if available
			if (this.task.scheduledDate) {
				this.renderDateMetadata("scheduled", this.task.scheduledDate);
			}

			// Start date if available
			if (this.task.startDate) {
				this.renderDateMetadata("start", this.task.startDate);
			}

			// Recurrence if available
			if (this.task.recurrence) {
				this.renderRecurrenceMetadata();
			}
		} else {
			// For completed tasks, show completion date
			if (this.task.completedDate) {
				this.renderDateMetadata("completed", this.task.completedDate);
			}

			// Created date if available
			if (this.task.createdDate) {
				this.renderDateMetadata("created", this.task.createdDate);
			}
		}

		// Project badge if available and not in project view
		if (this.task.project && this.viewMode !== "projects") {
			this.renderProjectMetadata();
		}

		// Tags if available
		if (this.task.tags && this.task.tags.length > 0) {
			this.renderTagsMetadata();
		}

		// Add metadata button for adding new metadata
		this.renderAddMetadataButton();
	}

	private renderDateMetadata(
		type: "due" | "scheduled" | "start" | "completed" | "created",
		dateValue: number
	) {
		const dateEl = this.metadataEl.createEl("div", {
			cls: ["task-date", `task-${type}-date`],
		});

		const date = new Date(dateValue);
		let dateText = "";
		let cssClass = "";

		if (type === "due") {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			// Format date
			if (date.getTime() < today.getTime()) {
				dateText =
					t("Overdue") +
					(this.settings.useRelativeTimeForDate
						? " | " + getRelativeTimeString(date)
						: "");
				cssClass = "task-overdue";
			} else if (date.getTime() === today.getTime()) {
				dateText = this.settings.useRelativeTimeForDate
					? getRelativeTimeString(date) || "Today"
					: "Today";
				cssClass = "task-due-today";
			} else if (date.getTime() === tomorrow.getTime()) {
				dateText = this.settings.useRelativeTimeForDate
					? getRelativeTimeString(date) || "Tomorrow"
					: "Tomorrow";
				cssClass = "task-due-tomorrow";
			} else {
				dateText = date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			}
		} else {
			dateText = this.settings.useRelativeTimeForDate
				? getRelativeTimeString(date)
				: date.toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
				  });
		}

		if (cssClass) {
			dateEl.classList.add(cssClass);
		}

		dateEl.textContent = dateText;
		dateEl.setAttribute("aria-label", date.toLocaleDateString());

		// Make date clickable for editing
		this.registerDomEvent(dateEl, "click", (e) => {
			e.stopPropagation();
			if (!this.inlineEditor.isCurrentlyEditing()) {
				const dateString = this.formatDateForInput(date);
				const fieldType =
					type === "due"
						? "dueDate"
						: type === "scheduled"
						? "scheduledDate"
						: type === "start"
						? "startDate"
						: null;

				if (fieldType) {
					this.inlineEditor.showMetadataEditor(
						dateEl,
						fieldType,
						dateString
					);
				}
			}
		});
	}

	private renderProjectMetadata() {
		const projectEl = this.metadataEl.createEl("div", {
			cls: "task-project",
		});
		projectEl.textContent =
			this.task.project?.split("/").pop() || this.task.project || "";

		// Make project clickable for editing
		this.registerDomEvent(projectEl, "click", (e) => {
			e.stopPropagation();
			if (!this.inlineEditor.isCurrentlyEditing()) {
				this.inlineEditor.showMetadataEditor(
					projectEl,
					"project",
					this.task.project || ""
				);
			}
		});
	}

	private renderTagsMetadata() {
		const tagsContainer = this.metadataEl.createEl("div", {
			cls: "task-tags-container",
		});

		this.task.tags
			.filter((tag) => !tag.startsWith("#project"))
			.forEach((tag) => {
				const tagEl = tagsContainer.createEl("span", {
					cls: "task-tag",
					text: tag.startsWith("#") ? tag : `#${tag}`,
				});

				// Make tag clickable for editing
				this.registerDomEvent(tagEl, "click", (e) => {
					e.stopPropagation();
					if (!this.inlineEditor.isCurrentlyEditing()) {
						const tagsString = this.task.tags?.join(", ") || "";
						this.inlineEditor.showMetadataEditor(
							tagsContainer,
							"tags",
							tagsString
						);
					}
				});
			});
	}

	private renderRecurrenceMetadata() {
		const recurrenceEl = this.metadataEl.createEl("div", {
			cls: "task-date task-recurrence",
		});
		recurrenceEl.textContent = this.task.recurrence || "";

		// Make recurrence clickable for editing
		this.registerDomEvent(recurrenceEl, "click", (e) => {
			e.stopPropagation();
			if (!this.inlineEditor.isCurrentlyEditing()) {
				this.inlineEditor.showMetadataEditor(
					recurrenceEl,
					"recurrence",
					this.task.recurrence || ""
				);
			}
		});
	}

	private renderAddMetadataButton() {
		const addButtonContainer = this.metadataEl.createDiv({
			cls: "add-metadata-container",
		});

		this.inlineEditor.showAddMetadataButton(addButtonContainer);
	}

	private formatDateForInput(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	}

	private renderMarkdown() {
		// Clear existing content if needed
		if (this.markdownRenderer) {
			this.removeChild(this.markdownRenderer);
		}

		// Create new renderer
		this.markdownRenderer = new MarkdownRendererComponent(
			this.app,
			this.contentEl,
			this.task.filePath
		);
		this.addChild(this.markdownRenderer);

		// Render the markdown content
		this.markdownRenderer.render(this.task.originalMarkdown);
	}

	private updateTaskDisplay() {
		// Update the inline editor's task reference
		this.inlineEditor.onunload();
		this.removeChild(this.inlineEditor);

		const editorOptions: InlineEditorOptions = {
			onTaskUpdate: async (originalTask: Task, updatedTask: Task) => {
				if (this.onTaskUpdate) {
					await this.onTaskUpdate(originalTask, updatedTask);
					this.task = updatedTask;
					this.updateTaskDisplay();
				}
			},
			onContentEditFinished: (targetEl: HTMLElement) => {
				// Re-render the markdown content
				this.renderMarkdown();
			},
		};

		this.inlineEditor = new InlineEditor(
			this.app,
			this.plugin,
			this.task,
			editorOptions
		);
		this.addChild(this.inlineEditor);

		// Re-render the entire task item
		this.renderTaskItem();
	}

	public getTask(): Task {
		return this.task;
	}

	public updateTask(task: Task) {
		const oldTask = this.task;
		this.task = task;

		// Update completion status
		if (oldTask.completed !== task.completed) {
			if (task.completed) {
				this.element.classList.add("task-completed");
			} else {
				this.element.classList.remove("task-completed");
			}
		}

		// If only the content changed, just update the markdown
		if (oldTask.originalMarkdown !== task.originalMarkdown) {
			// Just re-render the markdown content
			this.contentEl.empty();
			this.renderMarkdown();
		} else {
			// Full refresh needed for other changes
			this.updateTaskDisplay();
		}
	}

	public setSelected(selected: boolean) {
		if (selected) {
			this.element.classList.add("selected");
		} else {
			this.element.classList.remove("selected");
		}
	}

	onunload() {
		this.element.detach();
	}
}
