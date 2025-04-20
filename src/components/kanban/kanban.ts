import { App, Component, WorkspaceLeaf } from "obsidian";
import TaskProgressBarPlugin from "../../index"; // Adjust path as needed
import { Task } from "src/utils/types/TaskIndex"; // Adjust path as needed
import { KanbanColumnComponent } from "./kanban-column";
import { DragManager, DragMoveEvent, DragEndEvent } from "../DragManager";
import "../../styles/kanban/kanban.css";
import { t } from "../../translations/helper"; // Added import for t
import { FilterComponent, buildFilterOptionsFromTasks } from "../filter/filter";
import { ActiveFilter } from "../filter/filter-type";

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
	private dragManager: DragManager;
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

		// Create the container for filter controls early if it's part of the main layout
		this.filterContainerEl = this.containerEl.createDiv(
			"kanban-filter-controls-container" // Example class
		);
		this.renderFilterControls(this.filterContainerEl);

		this.columnContainerEl = this.containerEl.createDiv({
			cls: "tg-kanban-column-container",
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

		// Re-initialize drag manager after columns are rendered
		this.initializeDragManager();
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

	private initializeDragManager() {
		if (this.dragManager) {
			this.removeChild(this.dragManager);
		}

		this.dragManager = new DragManager({
			container: this.columnContainerEl,
			draggableSelector: ".tg-kanban-card",
			dropZoneSelector: ".tg-kanban-column-content",
			cloneElement: true,
			dragClass: "tg-kanban-card-dragging",
			ghostClass: "tg-kanban-card-ghost",
			onDragStart: (data) => {
				console.log("Drag Start:", data.element.dataset.taskId);
				this.columnContainerEl
					.querySelectorAll(".tg-kanban-column-content")
					.forEach((el) => {
						el.classList.add("tg-kanban-drop-target-active");
					});
				return true;
			},
			onDragMove: (data) => {
				this.handleDragMove(data);
			},
			onDragEnd: async (data) => {
				this.handleDragEnd(data);
			},
		});
		this.addChild(this.dragManager);
	}

	private clearDropIndicators() {
		this.columnContainerEl
			.querySelectorAll(
				`.${DROP_INDICATOR_BEFORE_CLASS}, .${DROP_INDICATOR_AFTER_CLASS}`
			)
			.forEach((el) => {
				el.classList.remove(
					DROP_INDICATOR_BEFORE_CLASS,
					DROP_INDICATOR_AFTER_CLASS
				);
			});
		this.columnContainerEl
			.querySelectorAll(`.${DROP_INDICATOR_EMPTY_CLASS}`)
			.forEach((el) => el.classList.remove(DROP_INDICATOR_EMPTY_CLASS));
	}

	private handleDragMove(data: DragMoveEvent) {
		// Clear previous indicators first
		this.clearDropIndicators();

		// Temporarily hide the ghost element to find element underneath
		let elementUnderPointer: Element | null = null;
		const ghostElement = data.element; // This is the clone
		const originalDisplay = ghostElement.style.display;
		ghostElement.style.display = "none";
		try {
			elementUnderPointer = document.elementFromPoint(
				data.currentX,
				data.currentY
			);
		} finally {
			ghostElement.style.display = originalDisplay; // Restore display
		}

		if (!elementUnderPointer) return;

		const dropZone = elementUnderPointer.closest(
			".tg-kanban-column-content"
		) as HTMLElement;

		if (dropZone) {
			const cards = Array.from(
				dropZone.querySelectorAll<HTMLElement>(".tg-kanban-card")
			).filter((card) => card !== data.originalElement); // Exclude the original dragged card if it's still technically in the DOM

			if (cards.length === 0) {
				// Add indicator for empty column
				dropZone.classList.add(DROP_INDICATOR_EMPTY_CLASS);
				return;
			}

			let targetCard: HTMLElement | null = null;
			let insertBefore = false;

			// Find the card to insert before/after based on Y position
			for (const card of cards) {
				const rect = card.getBoundingClientRect();
				const midY = rect.top + rect.height / 2;

				if (data.currentY < midY) {
					targetCard = card;
					insertBefore = true;
					break;
				}
			}

			if (targetCard) {
				if (insertBefore) {
					targetCard.classList.add(DROP_INDICATOR_BEFORE_CLASS);
				} else {
					// If loop finished without finding a card to insert before,
					// it means we should insert after the last card.
					// Check if targetCard was set in the loop (should always be unless Y is below all cards)
					const lastCard = cards[cards.length - 1];
					if (lastCard) {
						lastCard.classList.add(DROP_INDICATOR_AFTER_CLASS);
					}
				}
			} else {
				// If no targetCard found (e.g., dragging below all cards),
				// add indicator after the last card
				const lastCard = cards[cards.length - 1];
				if (lastCard) {
					lastCard.classList.add(DROP_INDICATOR_AFTER_CLASS);
				}
			}
		} else {
			// If not over a drop zone, ensure all indicators are cleared
			// (already done at the start of the function)
		}
	}

	private async handleDragEnd(data: DragEndEvent) {
		console.log(
			"Drag End:",
			data.originalElement.dataset.taskId, // Use originalElement
			"Dropped on:",
			data.dropTarget
		);

		// Clear visual cues regardless of drop success
		this.clearDropIndicators();
		this.columnContainerEl
			.querySelectorAll(
				".tg-kanban-drop-target-active, .tg-kanban-drop-target-hover"
			)
			.forEach((el) => {
				el.classList.remove(
					"tg-kanban-drop-target-active",
					"tg-kanban-drop-target-hover"
				);
			});

		const taskId = data.originalElement.dataset.taskId; // Use originalElement
		const dropTargetColumnContent = data.dropTarget;

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
