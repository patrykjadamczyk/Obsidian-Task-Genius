import { App, Component } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import { MarkdownRendererComponent } from "../MarkdownRenderer";

export class TaskListItemComponent extends Component {
	public element: HTMLElement;

	// Events
	public onTaskSelected: (task: Task) => void;
	public onTaskCompleted: (task: Task) => void;

	private markdownRenderer: MarkdownRendererComponent;
	private containerEl: HTMLElement;
	private contentEl: HTMLElement;

	private metadataEl: HTMLElement;

	constructor(
		private task: Task,
		private viewMode: string,
		private app: App
	) {
		super();

		this.element = createEl("div", {
			cls: "task-item",
			attr: { "data-task-id": this.task.id },
		});
	}

	onload() {
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
				const checkbox = el.createEl("input", {
					cls: "task-list-item-checkbox",
					type: "checkbox",
				});
				checkbox.dataset.task = this.task.status;
				if (this.task.status !== " ") {
					checkbox.checked = true;
				}
			}
		);

		this.element.appendChild(checkboxEl);
		this.containerEl = this.element.createDiv({
			cls: "task-item-container",
		});
		// Task content
		this.contentEl = document.createElement("div");
		this.contentEl.className = "task-item-content";
		this.containerEl.appendChild(this.contentEl);

		this.renderMarkdown();

		this.metadataEl = this.containerEl.createDiv({
			cls: "task-item-metadata",
		});

		// Due date if available
		if (this.task.dueDate) {
			const dueEl = this.metadataEl.createEl("div", {
				cls: "task-due-date",
			});
			const dueDate = new Date(this.task.dueDate);

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);

			// Format date
			let dateText = "";
			if (dueDate.getTime() < today.getTime()) {
				dateText = "Overdue";
				dueEl.classList.add("task-overdue");
			} else if (dueDate.getTime() === today.getTime()) {
				dateText = "Today";
				dueEl.classList.add("task-due-today");
			} else if (dueDate.getTime() === tomorrow.getTime()) {
				dateText = "Tomorrow";
			} else {
				dateText = dueDate.toLocaleDateString();
			}

			dueEl.textContent = dateText;
			dueEl.setAttribute("aria-label", dueDate.toLocaleDateString());
		}

		// Project badge if available and not in project view
		if (this.task.project && this.viewMode !== "projects") {
			const projectEl = this.metadataEl.createEl("div", {
				cls: "task-project",
			});
			projectEl.textContent =
				this.task.project.split("/").pop() || this.task.project;
		}

		// Priority indicator if available
		if (this.task.priority) {
			const priorityEl = document.createElement("div");
			priorityEl.className = `task-priority priority-${this.task.priority}`;

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

		// Checkbox click handler to toggle completion
		this.registerDomEvent(checkboxEl, "click", (e) => {
			e.stopPropagation();
			if (this.onTaskCompleted) {
				this.onTaskCompleted(this.task);
			}
		});
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
			this.element.empty();
			this.onload();
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
