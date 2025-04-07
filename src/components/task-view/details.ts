import { Component, TFile } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";

export class TaskDetailsComponent extends Component {
	public containerEl: HTMLElement;
	private contentEl: HTMLElement;
	private currentTask: Task | null = null;
	private isVisible: boolean = true;

	// Events
	public onTaskEdit: (task: Task) => void;
	public onTaskToggleComplete: (task: Task) => void;

	constructor(private parentEl: HTMLElement, private app: any) {
		super();
	}

	onload() {
		// Create details container
		this.containerEl = this.parentEl.createDiv({
			cls: "task-details",
		});

		// Initial empty state
		this.showEmptyState();
	}

	private showEmptyState() {
		this.containerEl.empty();

		const emptyEl = this.containerEl.createDiv({ cls: "details-empty" });
		emptyEl.setText("Select a task to view details");
	}

	public showTaskDetails(task: Task) {
		if (!task) {
			this.currentTask = null;
			this.showEmptyState();
			return;
		}

		this.currentTask = task;

		// Clear existing content
		this.containerEl.empty();

		// Create details header
		const headerEl = this.containerEl.createDiv({ cls: "details-header" });
		headerEl.setText("Task Details");

		// Create content container
		this.contentEl = this.containerEl.createDiv({ cls: "details-content" });

		// Task name
		const nameEl = this.contentEl.createEl("h2", { cls: "details-name" });
		nameEl.setText(task.content);

		// Task status
		const statusEl = this.contentEl.createDiv({ cls: "details-status" });
		const statusText = task.completed ? "Completed" : "Incomplete";
		statusEl.setText(statusText);

		// Task metadata
		const metaEl = this.contentEl.createDiv({ cls: "details-metadata" });

		// Add metadata fields
		if (task.project) {
			this.addMetadataField(metaEl, "Project", task.project);
		}

		if (task.dueDate) {
			const dueDateText = new Date(task.dueDate).toLocaleDateString();
			this.addMetadataField(metaEl, "Due Date", dueDateText);
		}

		if (task.startDate) {
			const startDateText = new Date(task.startDate).toLocaleDateString();
			this.addMetadataField(metaEl, "Start Date", startDateText);
		}

		if (task.completedDate) {
			const completedDateText = new Date(
				task.completedDate
			).toLocaleDateString();
			this.addMetadataField(metaEl, "Completed", completedDateText);
		}

		if (task.priority) {
			let priorityText = "Low";
			if (task.priority === 3) {
				priorityText = "High";
			} else if (task.priority === 2) {
				priorityText = "Medium";
			}
			this.addMetadataField(metaEl, "Priority", priorityText);
		}

		if (task.tags && task.tags.length > 0) {
			this.addMetadataField(metaEl, "Tags", task.tags.join(", "));
		}

		if (task.context) {
			this.addMetadataField(metaEl, "Context", task.context);
		}

		// Task file location
		this.addMetadataField(metaEl, "File", task.filePath);

		// Add edit controls
		const actionsEl = this.contentEl.createDiv({ cls: "details-actions" });

		// Edit button
		const editBtn = actionsEl.createEl("button", {
			cls: "details-edit-btn",
		});
		editBtn.setText("Edit Task");

		this.registerDomEvent(editBtn, "click", () => {
			if (this.onTaskEdit) {
				this.onTaskEdit(task);
			} else {
				this.editTask(task);
			}
		});

		// Toggle completion button
		const toggleBtn = actionsEl.createEl("button", {
			cls: "details-toggle-btn",
		});
		toggleBtn.setText(task.completed ? "Mark Incomplete" : "Mark Complete");

		this.registerDomEvent(toggleBtn, "click", () => {
			if (this.onTaskToggleComplete) {
				this.onTaskToggleComplete(task);
			}
		});
	}

	private addMetadataField(
		container: HTMLElement,
		label: string,
		value: string
	) {
		const fieldEl = container.createDiv({ cls: "metadata-field" });

		const labelEl = fieldEl.createDiv({ cls: "metadata-label" });
		labelEl.setText(label);

		const valueEl = fieldEl.createDiv({ cls: "metadata-value" });
		valueEl.setText(value);
	}

	private async editTask(task: Task) {
		// Get the file from the vault
		const file = this.app.vault.getAbstractFileByPath(task.filePath);
		if (!(file instanceof TFile)) return;

		// Open the file
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);

		// Try to set the cursor at the task's line
		const editor = this.app.workspace.activeEditor?.editor;
		if (editor) {
			editor.setCursor({ line: task.line, ch: 0 });
			editor.focus();
		}
	}

	public setVisible(visible: boolean) {
		this.isVisible = visible;

		if (visible) {
			this.containerEl.show();
			this.containerEl.addClass("visible");
			this.containerEl.removeClass("hidden");
		} else {
			this.containerEl.addClass("hidden");
			this.containerEl.removeClass("visible");

			// Optionally hide with animation, then truly hide
			setTimeout(() => {
				if (!this.isVisible) {
					this.containerEl.hide();
				}
			}, 300); // match animation duration
		}
	}

	public getCurrentTask(): Task | null {
		return this.currentTask;
	}

	onunload() {
		this.containerEl.empty();
		this.containerEl.remove();
	}
}
