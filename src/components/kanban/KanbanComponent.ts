import { App, Component, WorkspaceLeaf } from "obsidian";
import TaskProgressBarPlugin from "../../index"; // Adjust path as needed
import { Task } from "src/utils/types/TaskIndex"; // Adjust path as needed
import { KanbanColumnComponent } from "./KanbanColumn";
import { DragManager } from "../DragManager";
import "../../styles/kanban/kanban.css";

export class KanbanComponent extends Component {
	plugin: TaskProgressBarPlugin;
	app: App;
	public containerEl: HTMLElement;
	private columns: KanbanColumnComponent[] = [];
	private columnContainerEl: HTMLElement;
	private dragManager: DragManager;
	private tasks: Task[] = [];
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
		parentEl: HTMLElement,
		initialTasks: Task[] = [],
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
		this.containerEl = parentEl.createDiv("kanban-component-container");
		this.tasks = initialTasks;
		this.params = params;
	}

	override onload() {
		super.onload();
		this.containerEl.empty();
		this.containerEl.addClass("kanban-view");

		this.renderFilterControls(
			this.containerEl.createDiv({ cls: "kanban-filters" })
		);

		this.columnContainerEl = this.containerEl.createDiv({
			cls: "kanban-column-container",
		});

		this.initializeDragManager();
		this.renderColumns();

		console.log("KanbanComponent loaded.");
	}

	override onunload() {
		super.onunload();
		this.columns.forEach((col) => col.unload());
		this.dragManager?.unload();
		this.columns = [];
		this.containerEl.empty();
		console.log("KanbanComponent unloaded.");
	}

	private renderFilterControls(containerEl: HTMLElement) {
		containerEl.setText("Filters: [Path] [Project] [Due Date]");
	}

	public setTasks(tasks: Task[]) {
		this.tasks = tasks;
		this.renderColumns();
	}

	private renderColumns() {
		this.columnContainerEl.empty();
		this.columns.forEach((col) => this.removeChild(col));
		this.columns = [];

		const statusCycle = this.plugin.settings.taskStatusCycle;
		const statusNames =
			statusCycle.length > 0
				? statusCycle
				: ["Todo", "In Progress", "Done"];

		statusNames.forEach((statusName) => {
			const column = new KanbanColumnComponent(
				this.app,
				this.plugin,
				this.columnContainerEl,
				statusName,
				this.getTasksForStatus(statusName)
			);
			this.addChild(column);
			this.columns.push(column);
		});
	}

	private getTasksForStatus(statusName: string): Task[] {
		const statusMark =
			this.plugin.settings.taskStatusMarks[statusName] || " ";

		return this.tasks.filter((task) => {
			const taskStatusMark = task.status || " ";
			return taskStatusMark === statusMark;
		});
	}

	private initializeDragManager() {
		if (this.dragManager) {
			this.removeChild(this.dragManager);
		}

		this.dragManager = new DragManager({
			container: this.columnContainerEl,
			draggableSelector: ".kanban-card",
			dropZoneSelector: ".kanban-column-content",
			cloneElement: true,
			dragClass: "kanban-card-dragging",
			ghostClass: "kanban-card-ghost",
			onDragStart: (data) => {
				console.log("Drag Start:", data.element.dataset.taskId);
				this.columnContainerEl
					.querySelectorAll(".kanban-column-content")
					.forEach((el) => {
						el.classList.add("kanban-drop-target-active");
					});
				return true;
			},
			onDragMove: (data) => {
				const elementUnder = document.elementFromPoint(
					data.currentX,
					data.currentY
				);
				this.columnContainerEl
					.querySelectorAll(".kanban-drop-target-hover")
					.forEach((el) => {
						el.classList.remove("kanban-drop-target-hover");
					});
				if (elementUnder) {
					const dropZone = elementUnder.closest(
						".kanban-column-content"
					);
					if (dropZone) {
						dropZone.classList.add("kanban-drop-target-hover");
					}
				}
			},
			onDragEnd: async (data) => {
				console.log(
					"Drag End:",
					data.element.dataset.taskId,
					"Dropped on:",
					data.dropTarget
				);
				this.columnContainerEl
					.querySelectorAll(
						".kanban-drop-target-active, .kanban-drop-target-hover"
					)
					.forEach((el) => {
						el.classList.remove(
							"kanban-drop-target-active",
							"kanban-drop-target-hover"
						);
					});

				const taskId = data.element.dataset.taskId;
				const dropTargetColumnContent = data.dropTarget;

				if (taskId && dropTargetColumnContent) {
					const targetColumnEl =
						dropTargetColumnContent.closest(".kanban-column");
					const targetStatusName = targetColumnEl
						? (targetColumnEl as HTMLElement).dataset.statusName
						: null;

					if (targetStatusName) {
						const targetStatusMark =
							this.plugin.settings.taskStatusMarks[
								targetStatusName
							];
						if (targetStatusMark !== undefined) {
							console.log(
								`Kanban requesting status update for task ${taskId} to status ${targetStatusName} (mark: ${targetStatusMark})`
							);
							if (this.params.onTaskStatusUpdate) {
								try {
									await this.params.onTaskStatusUpdate(
										taskId,
										targetStatusMark
									);
								} catch (error) {
									console.error(
										"Failed to request task status update:",
										error
									);
								}
							} else {
								console.warn(
									"onTaskStatusUpdate callback not provided to KanbanComponent"
								);
							}
						} else {
							console.warn(
								`Could not find status mark for status name: ${targetStatusName}`
							);
						}
					}
				}
			},
		});
		this.addChild(this.dragManager);
	}

	public getColumnContainer(): HTMLElement {
		return this.columnContainerEl;
	}
}
