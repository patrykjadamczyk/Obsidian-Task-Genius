import { App, Component, setIcon, Menu } from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { Task } from "../../types/task";
import { createTaskCheckbox } from "../task-view/details";
import { t } from "../../translations/helper";

export class QuadrantCardComponent extends Component {
	plugin: TaskProgressBarPlugin;
	app: App;
	public containerEl: HTMLElement;
	private task: Task;
	private checkboxEl: HTMLElement;
	private contentEl: HTMLElement;
	private metadataEl: HTMLElement;
	private params: {
		onTaskStatusUpdate?: (
			taskId: string,
			newStatusMark: string
		) => Promise<void>;
		onTaskSelected?: (task: Task) => void;
		onTaskCompleted?: (task: Task) => void;
		onTaskContextMenu?: (ev: MouseEvent, task: Task) => void;
	};

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		containerEl: HTMLElement,
		task: Task,
		params: {
			onTaskStatusUpdate?: (
				taskId: string,
				newStatusMark: string
			) => Promise<void>;
			onTaskSelected?: (task: Task) => void;
			onTaskCompleted?: (task: Task) => void;
			onTaskContextMenu?: (ev: MouseEvent, task: Task) => void;
		} = {}
	) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.containerEl = containerEl;
		this.task = task;
		this.params = params;
	}

	override onload() {
		super.onload();
		this.render();
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass("tg-quadrant-card");
		this.containerEl.setAttribute("data-task-id", this.task.id);

		// Add priority class for styling
		const priorityClass = this.getPriorityClass();
		if (priorityClass) {
			this.containerEl.addClass(priorityClass);
		}

		// Create card header with checkbox and actions
		this.createHeader();

		// Create task content
		this.createContent();

		// Create metadata section
		this.createMetadata();

		// Add event listeners
		this.addEventListeners();
	}

	private createHeader() {
		const headerEl = this.containerEl.createDiv("tg-quadrant-card-header");

		// Task checkbox
		this.checkboxEl = headerEl.createDiv("tg-quadrant-card-checkbox");
		const checkbox = createTaskCheckbox(
			this.task,
			(newStatus) => {
				if (this.params.onTaskStatusUpdate) {
					this.params.onTaskStatusUpdate(this.task.id, newStatus);
				}
			},
			this.plugin
		);
		this.checkboxEl.appendChild(checkbox);

		// Actions menu
		const actionsEl = headerEl.createDiv("tg-quadrant-card-actions");
		const moreBtn = actionsEl.createEl("button", {
			cls: "tg-quadrant-card-more-btn",
			attr: { "aria-label": t("More actions") }
		});
		setIcon(moreBtn, "more-horizontal");

		moreBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			this.showContextMenu(e);
		});
	}

	private createContent() {
		this.contentEl = this.containerEl.createDiv("tg-quadrant-card-content");
		
		// Task title/content
		const titleEl = this.contentEl.createDiv("tg-quadrant-card-title");
		titleEl.textContent = this.getCleanTaskContent();

		// Priority indicator
		const priorityEmoji = this.extractPriorityEmoji();
		if (priorityEmoji) {
			const priorityEl = this.contentEl.createSpan("tg-quadrant-card-priority");
			priorityEl.textContent = priorityEmoji;
		}

		// Tags
		const tags = this.extractTags();
		if (tags.length > 0) {
			const tagsEl = this.contentEl.createDiv("tg-quadrant-card-tags");
			tags.forEach(tag => {
				const tagEl = tagsEl.createSpan("tg-quadrant-card-tag");
				tagEl.textContent = tag;
				
				// Add special styling for urgent/important tags
				if (tag === "#urgent") {
					tagEl.addClass("tg-quadrant-tag--urgent");
				} else if (tag === "#important") {
					tagEl.addClass("tg-quadrant-tag--important");
				}
			});
		}
	}

	private createMetadata() {
		this.metadataEl = this.containerEl.createDiv("tg-quadrant-card-metadata");

		// Due date
		const dueDate = this.getTaskDueDate();
		if (dueDate) {
			const dueDateEl = this.metadataEl.createDiv("tg-quadrant-card-due-date");
			const dueDateIcon = dueDateEl.createSpan("tg-quadrant-card-due-date-icon");
			setIcon(dueDateIcon, "calendar");
			
			const dueDateText = dueDateEl.createSpan("tg-quadrant-card-due-date-text");
			dueDateText.textContent = this.formatDueDate(dueDate);
			
			// Add urgency styling
			if (this.isDueSoon(dueDate)) {
				dueDateEl.addClass("tg-quadrant-card-due-date--urgent");
			} else if (this.isOverdue(dueDate)) {
				dueDateEl.addClass("tg-quadrant-card-due-date--overdue");
			}
		}

		// File info
		const fileInfoEl = this.metadataEl.createDiv("tg-quadrant-card-file-info");
		const fileIcon = fileInfoEl.createSpan("tg-quadrant-card-file-icon");
		setIcon(fileIcon, "file-text");
		
		const fileName = fileInfoEl.createSpan("tg-quadrant-card-file-name");
		fileName.textContent = this.getFileName();

		// Line number
		const lineEl = this.metadataEl.createSpan("tg-quadrant-card-line");
		lineEl.textContent = `L${this.task.line}`;
	}

	private addEventListeners() {
		// Card click to select task
		this.containerEl.addEventListener("click", (e) => {
			if (e.target === this.checkboxEl || this.checkboxEl.contains(e.target as Node)) {
				return; // Don't select when clicking checkbox
			}
			
			if (this.params.onTaskSelected) {
				this.params.onTaskSelected(this.task);
			}
		});

		// Right-click context menu
		this.containerEl.addEventListener("contextmenu", (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			if (this.params.onTaskContextMenu) {
				this.params.onTaskContextMenu(e, this.task);
			} else {
				this.showContextMenu(e);
			}
		});

		// Double-click to open file
		this.containerEl.addEventListener("dblclick", (e) => {
			e.stopPropagation();
			this.openTaskInFile();
		});
	}

	private showContextMenu(e: MouseEvent) {
		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle(t("Open in file"))
				.setIcon("external-link")
				.onClick(() => {
					this.openTaskInFile();
				});
		});

		menu.addItem((item) => {
			item.setTitle(t("Copy task"))
				.setIcon("copy")
				.onClick(() => {
					navigator.clipboard.writeText(this.task.originalMarkdown);
				});
		});

		menu.addSeparator();

		menu.addItem((item) => {
			item.setTitle(t("Mark as urgent"))
				.setIcon("zap")
				.onClick(() => {
					this.addTagToTask("#urgent");
				});
		});

		menu.addItem((item) => {
			item.setTitle(t("Mark as important"))
				.setIcon("star")
				.onClick(() => {
					this.addTagToTask("#important");
				});
		});

		menu.showAtMouseEvent(e);
	}

	private async openTaskInFile() {
		const file = this.app.vault.getAbstractFileByPath(this.task.filePath);
		if (file) {
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file as any);
			
			// Navigate to the specific line
			const view = leaf.view;
			if (view && 'editor' in view && view.editor) {
				view.editor.setCursor(this.task.line - 1, 0);
				view.editor.scrollIntoView({ line: this.task.line - 1, ch: 0 }, true);
			}
		}
	}

	private async addTagToTask(tag: string) {
		// This would need to be implemented to actually modify the file
		console.log(`Would add tag ${tag} to task ${this.task.id}`);
		// Implementation would go here to update the actual file content
	}

	private getCleanTaskContent(): string {
		// Remove checkbox, priority emojis, and metadata from display
		let content = this.task.content;
		
		// Remove priority emojis
		content = content.replace(/[🔺⏫🔼🔽⏬]/g, "").trim();
		
		// Remove dates in 📅 format
		content = content.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "").trim();
		
		// Remove extra whitespace
		content = content.replace(/\s+/g, " ").trim();
		
		return content;
	}

	private extractPriorityEmoji(): string {
		const match = this.task.content.match(/[🔺⏫🔼🔽⏬]/);
		return match ? match[0] : "";
	}

	private extractTags(): string[] {
		const tags = this.task.content.match(/#[\w-]+/g) || [];
		return tags;
	}

	private getPriorityClass(): string {
		if (this.task.content.includes("🔺")) return "tg-quadrant-card--priority-highest";
		if (this.task.content.includes("⏫")) return "tg-quadrant-card--priority-high";
		if (this.task.content.includes("🔼")) return "tg-quadrant-card--priority-medium";
		if (this.task.content.includes("🔽")) return "tg-quadrant-card--priority-low";
		if (this.task.content.includes("⏬")) return "tg-quadrant-card--priority-lowest";
		return "";
	}

	private getTaskDueDate(): Date | null {
		// Extract due date from task content - this is a simplified implementation
		const match = this.task.content.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
		if (match) {
			return new Date(match[1]);
		}
		return null;
	}

	private formatDueDate(date: Date): string {
		const now = new Date();
		const diff = date.getTime() - now.getTime();
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

		if (days < 0) {
			return t("Overdue by {days} days", { days: Math.abs(days) });
		} else if (days === 0) {
			return t("Due today");
		} else if (days === 1) {
			return t("Due tomorrow");
		} else if (days <= 7) {
			return t("Due in {days} days", { days });
		} else {
			return date.toLocaleDateString();
		}
	}

	private isDueSoon(date: Date): boolean {
		const now = new Date();
		const diff = date.getTime() - now.getTime();
		const days = diff / (1000 * 60 * 60 * 24);
		return days >= 0 && days <= 3; // Due within 3 days
	}

	private isOverdue(date: Date): boolean {
		const now = new Date();
		return date.getTime() < now.getTime();
	}

	private getFileName(): string {
		const parts = this.task.filePath.split("/");
		return parts[parts.length - 1].replace(/\.md$/, "");
	}

	public getTask(): Task {
		return this.task;
	}

	public updateTask(task: Task) {
		this.task = task;
		this.render();
	}
}