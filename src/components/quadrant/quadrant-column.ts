import { App, Component, setIcon } from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { Task } from "../../types/task";
import { QuadrantDefinition } from "./quadrant";
import { QuadrantCardComponent } from "./quadrant-card";
import { t } from "../../translations/helper";

export class QuadrantColumnComponent extends Component {
	plugin: TaskProgressBarPlugin;
	app: App;
	public containerEl: HTMLElement;
	private headerEl: HTMLElement;
	private titleEl: HTMLElement;
	private descriptionEl: HTMLElement;
	private countEl: HTMLElement;
	private contentEl: HTMLElement;
	private quadrant: QuadrantDefinition;
	private tasks: Task[] = [];
	private cardComponents: QuadrantCardComponent[] = [];
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
		quadrant: QuadrantDefinition,
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
		this.quadrant = quadrant;
		this.params = params;
	}

	override onload() {
		super.onload();
		this.render();
	}

	override onunload() {
		this.cleanup();
		super.onunload();
	}

	private cleanup() {
		// Clean up card components
		this.cardComponents.forEach(card => {
			card.onunload();
		});
		this.cardComponents = [];
	}

	private render() {
		this.containerEl.empty();
		this.containerEl.addClass("tg-quadrant-column");
		this.containerEl.addClass(this.quadrant.className);

		// Create header
		this.createHeader();

		// Create content area
		this.createContent();
	}

	private createHeader() {
		this.headerEl = this.containerEl.createDiv("tg-quadrant-header");
		
		// Title and priority indicator
		const titleContainerEl = this.headerEl.createDiv("tg-quadrant-title-container");
		
		// Priority emoji
		const priorityEl = titleContainerEl.createSpan("tg-quadrant-priority");
		priorityEl.textContent = this.quadrant.priorityEmoji;
		
		// Title
		this.titleEl = titleContainerEl.createDiv("tg-quadrant-title");
		this.titleEl.textContent = this.quadrant.title;
		
		// Description
		this.descriptionEl = this.headerEl.createDiv("tg-quadrant-description");
		this.descriptionEl.textContent = this.quadrant.description;
		
		// Task count
		this.countEl = this.headerEl.createDiv("tg-quadrant-count");
		this.updateCount();
	}

	private createContent() {
		this.contentEl = this.containerEl.createDiv("tg-quadrant-column-content");
		this.contentEl.setAttribute("data-quadrant-id", this.quadrant.id);
	}

	public setTasks(tasks: Task[]) {
		this.tasks = tasks;
		this.updateCount();
		this.renderTasks();
	}

	private updateCount() {
		if (this.countEl) {
			this.countEl.textContent = `${this.tasks.length} ${this.tasks.length === 1 ? t("task") : t("tasks")}`;
		}
	}

	private renderTasks() {
		if (!this.contentEl) return;

		// Clean up existing components
		this.cleanup();

		// Clear content
		this.contentEl.empty();

		// Render tasks
		this.tasks.forEach(task => {
			const cardEl = this.contentEl.createDiv("tg-quadrant-card");
			cardEl.setAttribute("data-task-id", task.id);

			const card = new QuadrantCardComponent(
				this.app,
				this.plugin,
				cardEl,
				task,
				{
					onTaskStatusUpdate: this.params.onTaskStatusUpdate,
					onTaskSelected: this.params.onTaskSelected,
					onTaskCompleted: this.params.onTaskCompleted,
					onTaskContextMenu: this.params.onTaskContextMenu
				}
			);

			this.addChild(card);
			this.cardComponents.push(card);
		});

		// Show empty state if no tasks
		if (this.tasks.length === 0) {
			this.showEmptyState();
		}
	}

	private showEmptyState() {
		const emptyEl = this.contentEl.createDiv("tg-quadrant-empty-state");
		
		const iconEl = emptyEl.createDiv("tg-quadrant-empty-icon");
		setIcon(iconEl, "inbox");
		
		const messageEl = emptyEl.createDiv("tg-quadrant-empty-message");
		messageEl.textContent = this.getEmptyStateMessage();
	}

	private getEmptyStateMessage(): string {
		switch (this.quadrant.id) {
			case "urgent-important":
				return t("No crisis tasks - great job!");
			case "not-urgent-important":
				return t("No planning tasks - consider adding some goals");
			case "urgent-not-important":
				return t("No interruptions - focus time!");
			case "not-urgent-not-important":
				return t("No time wasters - excellent focus!");
			default:
				return t("No tasks in this quadrant");
		}
	}

	public setVisibility(visible: boolean) {
		if (visible) {
			this.containerEl.style.display = "";
			this.containerEl.removeClass("tg-quadrant-column--hidden");
		} else {
			this.containerEl.style.display = "none";
			this.containerEl.addClass("tg-quadrant-column--hidden");
		}
	}

	public addDropIndicator() {
		this.contentEl.addClass("tg-quadrant-column-content--drop-active");
	}

	public removeDropIndicator() {
		this.contentEl.removeClass("tg-quadrant-column-content--drop-active");
	}

	public getQuadrantId(): string {
		return this.quadrant.id;
	}

	public getQuadrant(): QuadrantDefinition {
		return this.quadrant;
	}

	public getTasks(): Task[] {
		return this.tasks;
	}

	public getTaskCount(): number {
		return this.tasks.length;
	}

	public isEmpty(): boolean {
		return this.tasks.length === 0;
	}

	// Method to get quadrant-specific styling or behavior
	public getQuadrantColor(): string {
		switch (this.quadrant.id) {
			case "urgent-important":
				return "#dc3545"; // Red - Crisis
			case "not-urgent-important":
				return "#28a745"; // Green - Growth
			case "urgent-not-important":
				return "#ffc107"; // Yellow - Caution
			case "not-urgent-not-important":
				return "#6c757d"; // Gray - Eliminate
			default:
				return "#007bff"; // Blue - Default
		}
	}

	// Method to get quadrant recommendations
	public getQuadrantRecommendation(): string {
		switch (this.quadrant.id) {
			case "urgent-important":
				return t("Handle immediately. These are critical tasks that need your attention now.");
			case "not-urgent-important":
				return t("Schedule and plan. These tasks are key to your long-term success.");
			case "urgent-not-important":
				return t("Delegate if possible. These tasks are urgent but don't require your specific skills.");
			case "not-urgent-not-important":
				return t("Eliminate or minimize. These tasks may be time wasters.");
			default:
				return t("Review and categorize these tasks appropriately.");
		}
	}
}