import { App, Component, Platform, WorkspaceLeaf } from "obsidian";
import TaskProgressBarPlugin from "../../index"; // Adjust path as needed
import { Task } from "../../utils/types/TaskIndex"; // Adjust path as needed
import { KanbanColumnComponent } from "./kanban-column";
// import { DragManager, DragMoveEvent, DragEndEvent } from "../DragManager";
import Sortable from "sortablejs";
import "../../styles/kanban/kanban.css";
import { t } from "../../translations/helper"; // Added import for t
import {
	FilterComponent,
	buildFilterOptionsFromTasks,
} from "../view-filter/filter";
import { ActiveFilter } from "../view-filter/filter-type";

// CSS classes for drop indicators
const DROP_INDICATOR_BEFORE_CLASS = "tg-kanban-card--drop-indicator-before";
const DROP_INDICATOR_AFTER_CLASS = "tg-kanban-card--drop-indicator-after";
const DROP_INDICATOR_EMPTY_CLASS =
	"tg-kanban-column-content--drop-indicator-empty";

export class KanbanComponent extends Component {
	plugin: TaskProgressBarPlugin;
	app: App;
	public containerEl: HTMLElement;
	private columns: KanbanColumnComponent[] = [];
	private columnContainerEl: HTMLElement;
	// private dragManager: DragManager;
	private sortableInstances: Sortable[] = [];
	private tasks: Task[] = [];
	private allTasks: Task[] = [];
	private params: {
		onTaskStatusUpdate?: (
			taskId: string,
			newStatusMark: string
		) => Promise<void>;
		onTaskSelected?: (task: Task) => void;
		onTaskCompleted?: (task: Task) => void;
		onTaskContextMenu?: (ev: MouseEvent, task: Task) => void;
	};
	private filterComponent: FilterComponent | null = null;
	private activeFilters: ActiveFilter[] = [];
	private filterContainerEl: HTMLElement; // Assume you have a container for filters

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
		this.containerEl = parentEl.createDiv("tg-kanban-component-container");
		this.tasks = initialTasks;
		this.params = params;
	}

	override onload() {
		super.onload();
		this.containerEl.empty();
		this.containerEl.addClass("tg-kanban-view");

		this.filterContainerEl = this.containerEl.createDiv({
			cls: "tg-kanban-filters",
		});

		this.renderFilterControls(this.filterContainerEl);

		this.columnContainerEl = this.containerEl.createDiv({
			cls: "tg-kanban-column-container",
		});

		this.renderColumns();
		console.log("KanbanComponent loaded.");
	}

	override onunload() {
		super.onunload();
		this.columns.forEach((col) => col.unload());
		this.sortableInstances.forEach((instance) => instance.destroy());
		this.columns = [];
		this.containerEl.empty();
		console.log("KanbanComponent unloaded.");
	}

	private renderFilterControls(containerEl: HTMLElement) {
		containerEl.empty(); // Clear previous controls

		// Build initial options from the current full task list
		const initialFilterOptions = buildFilterOptionsFromTasks(this.allTasks);
		console.log("Kanban initial filter options:", initialFilterOptions);

		this.filterComponent = new FilterComponent(
			{
				container: containerEl,
				options: initialFilterOptions,
				onChange: (updatedFilters: ActiveFilter[]) => {
					if (!this.columnContainerEl) {
						return;
					}
					this.activeFilters = updatedFilters;
					this.applyFiltersAndRender(); // Re-render when filters change
				},
			},
			this.plugin // Pass plugin instance
		);

		this.addChild(this.filterComponent); // Register as child component
	}

	public setTasks(newTasks: Task[]) {
		console.log("Kanban setting tasks:", newTasks.length);
		this.allTasks = [...newTasks]; // Store the full list

		console.log(this.filterComponent);
		// Update filter options based on the complete task list
		if (this.filterComponent) {
			this.filterComponent.updateFilterOptions(this.allTasks);
		} else {
			console.warn(
				"Filter component not initialized when setting tasks."
			);
			// Options will be built when renderFilterControls is called if it hasn't been yet.
			// If renderFilterControls already ran, this might indicate an issue.
		}

		// Apply current filters (which might be empty initially) and render the board
		this.applyFiltersAndRender();
	}

	private applyFiltersAndRender() {
		console.log("Kanban applying filters:", this.activeFilters);
		// Filter the full list based on active filters
		if (this.activeFilters.length === 0) {
			this.tasks = [...this.allTasks]; // No filters active, show all tasks
		} else {
			// Import or define PRIORITY_MAP if needed for priority filtering
			const PRIORITY_MAP: Record<string, number> = {
				"🔺": 5,
				"⏫": 4,
				"🔼": 3,
				"🔽": 2,
				"⏬️": 1,
				"⏬": 1,
				highest: 5,
				high: 4,
				medium: 3,
				low: 2,
				lowest: 1,
			};

			this.tasks = this.allTasks.filter((task) => {
				return this.activeFilters.every((filter) => {
					switch (filter.category) {
						case "status":
							return task.status === filter.value;
						case "tag":
							return task.tags.includes(filter.value);
						case "project":
							return task.project === filter.value;
						case "context":
							return task.context === filter.value;
						case "priority":
							const expectedPriority = PRIORITY_MAP[filter.value];
							return task.priority === expectedPriority;
						case "completed":
							return (
								(filter.value === "Yes" && task.completed) ||
								(filter.value === "No" && !task.completed)
							);
						case "filePath":
							return task.filePath === filter.value;
						default:
							console.warn(
								`Unknown filter category in Kanban: ${filter.category}`
							);
							return true;
					}
				});
			});
		}

		console.log("Kanban filtered tasks count:", this.tasks.length);

		this.renderColumns();
	}

	private renderColumns() {
		this.columnContainerEl?.empty();
		this.columns.forEach((col) => this.removeChild(col));
		this.columns = [];

		const statusCycle = this.plugin.settings.taskStatusCycle;
		let statusNames =
			statusCycle.length > 0
				? statusCycle
				: ["Todo", "In Progress", "Done"];

		const spaceStatus: string[] = [];
		const xStatus: string[] = [];
		const otherStatuses: string[] = [];

		statusNames.forEach((statusName) => {
			const statusMark =
				this.plugin.settings.taskStatusMarks[statusName] || " ";

			if (
				this.plugin.settings.excludeMarksFromCycle &&
				this.plugin.settings.excludeMarksFromCycle.includes(statusName)
			) {
				return;
			}

			if (statusMark === " ") {
				spaceStatus.push(statusName);
			} else if (statusMark === "x") {
				xStatus.push(statusName);
			} else {
				otherStatuses.push(statusName);
			}
		});

		// 按照要求的顺序合并状态名称
		statusNames = [...spaceStatus, ...otherStatuses, ...xStatus];

		statusNames.forEach((statusName) => {
			const column = new KanbanColumnComponent(
				this.app,
				this.plugin,
				this.columnContainerEl,
				statusName,
				// Pass filtered tasks for this status to the column
				this.getTasksForStatus(statusName),
				this.params
			);
			this.addChild(column);
			this.columns.push(column);
		});

		// Re-initialize sortable instances after columns are rendered
		this.initializeSortableInstances();
	}

	private getTasksForStatus(statusName: string): Task[] {
		const statusMark =
			this.plugin.settings.taskStatusMarks[statusName] || " ";

		// Filter from the already filtered list
		const tasksForStatus = this.tasks.filter((task) => {
			const taskStatusMark = task.status || " ";
			return taskStatusMark === statusMark;
		});

		// Optional: Sort tasks within the status column
		tasksForStatus.sort((a, b) => {
			const priorityA = a.priority ?? 0;
			const priorityB = b.priority ?? 0;
			if (priorityA !== priorityB) return priorityB - priorityA;

			const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
			const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
			return dateA - dateB;
		});

		return tasksForStatus;
	}

	private initializeSortableInstances() {
		this.sortableInstances.forEach((instance) => instance.destroy());
		this.sortableInstances = [];

		// Detect if we're on a mobile device
		const isMobile =
			!Platform.isDesktop ||
			"ontouchstart" in window ||
			navigator.maxTouchPoints > 0;

		this.columns.forEach((col) => {
			const columnContent = col.getContentElement();
			const instance = Sortable.create(columnContent, {
				group: "kanban-group",
				animation: 150,
				ghostClass: "tg-kanban-card-ghost",
				dragClass: "tg-kanban-card-dragging",
				// Mobile-specific optimizations
				delay: isMobile ? 150 : 0, // Longer delay on mobile to distinguish from scroll
				touchStartThreshold: isMobile ? 5 : 3, // More threshold on mobile
				forceFallback: false, // Use native HTML5 drag when possible
				fallbackOnBody: true, // Append ghost to body for better mobile performance
				// Scroll settings for mobile
				scroll: true, // Enable auto-scrolling
				scrollSensitivity: isMobile ? 50 : 30, // Higher sensitivity on mobile
				scrollSpeed: isMobile ? 15 : 10, // Faster scroll on mobile
				bubbleScroll: true, // Enable bubble scrolling for nested containers
				onEnd: (event) => {
					this.handleSortEnd(event);
				},
			});
			this.sortableInstances.push(instance);
		});
	}

	private async handleSortEnd(event: Sortable.SortableEvent) {
		console.log("Kanban sort end:", event.oldIndex, event.newIndex);
		const taskId = event.item.dataset.taskId;
		const dropTargetColumnContent = event.to;

		if (taskId && dropTargetColumnContent) {
			const targetColumnEl =
				dropTargetColumnContent.closest(".tg-kanban-column");
			const targetStatusName = targetColumnEl
				? (targetColumnEl as HTMLElement).dataset.statusName
				: null;

			if (targetStatusName) {
				const targetStatusMark =
					this.plugin.settings.taskStatusMarks[targetStatusName];
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
	}

	public getColumnContainer(): HTMLElement {
		return this.columnContainerEl;
	}
}
