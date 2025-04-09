import { App, Component } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import { MarkdownRendererComponent } from "../MarkdownRenderer";

export class TaskListItemComponent extends Component {
	public element: HTMLElement;

	// Events
	public onTaskSelected: (task: Task) => void;
	public onTaskCompleted: (task: Task) => void;

	private markdownRenderer: MarkdownRendererComponent;

	constructor(
		private task: Task,
		private viewMode: string,
		private app: App
	) {
		super();
	}

	onload() {
		this.element = document.createElement("div");
		this.element.className = "task-item";
		this.element.dataset.taskId = this.task.id;

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

		// Task content
		const contentEl = document.createElement("div");
		contentEl.className = "task-item-content";
		this.element.appendChild(contentEl);

		this.markdownRenderer = new MarkdownRendererComponent(
			this.app,
			contentEl,
			this.task.filePath
		);
		this.addChild(this.markdownRenderer);

		this.markdownRenderer.render(this.task.originalMarkdown);

		// Due date if available
		if (this.task.dueDate) {
			const dueEl = document.createElement("div");
			dueEl.className = "task-due-date";
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
			this.element.appendChild(dueEl);
		}

		// Project badge if available and not in project view
		if (this.task.project && this.viewMode !== "projects") {
			const projectEl = document.createElement("div");
			projectEl.className = "task-project";
			projectEl.textContent =
				this.task.project.split("/").pop() || this.task.project;
			this.element.appendChild(projectEl);
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

	public getTask(): Task {
		return this.task;
	}

	public updateTask(task: Task) {
		this.task = task;
		// Re-render the component with the updated task
		this.onunload();
		this.onload();
	}

	public setSelected(selected: boolean) {
		if (selected) {
			this.element.classList.add("selected");
		} else {
			this.element.classList.remove("selected");
		}
	}

	onunload() {
		this.element.remove();
	}
}
