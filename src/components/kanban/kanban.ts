import {
	App,
	Component,
	Menu,
	Platform,
	setIcon,
	WorkspaceLeaf,
} from "obsidian";
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
import { KanbanSpecificConfig } from "../../common/setting-definition";

// CSS classes for drop indicators
const DROP_INDICATOR_BEFORE_CLASS = "tg-kanban-card--drop-indicator-before";
const DROP_INDICATOR_AFTER_CLASS = "tg-kanban-card--drop-indicator-after";
const DROP_INDICATOR_EMPTY_CLASS =
	"tg-kanban-column-content--drop-indicator-empty";

export interface KanbanSortOption {
	field:
		| "priority"
		| "dueDate"
		| "scheduledDate"
		| "startDate"
		| "createdDate";
	order: "asc" | "desc";
	label: string;
}

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
	private sortOption: KanbanSortOption = {
		field: "priority",
		order: "desc",
		label: "Priority (High to Low)",
	};
	private hideEmptyColumns: boolean = false;

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

		// Load configuration settings
		this.loadKanbanConfig();

		this.filterContainerEl = this.containerEl.createDiv({
			cls: "tg-kanban-filters",
		});

		// Render filter controls first
		this.renderFilterControls(this.filterContainerEl);

		// Then render sort and toggle controls
		this.renderControls(this.filterContainerEl);

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

	private renderControls(containerEl: HTMLElement) {
		// Create a controls container for sort and toggle controls
		const controlsContainer = containerEl.createDiv({
			cls: "tg-kanban-controls-container",
		});

		// Sort dropdown
		const sortContainer = controlsContainer.createDiv({
			cls: "tg-kanban-sort-container",
		});

		const sortButton = sortContainer.createEl(
			"button",
			{
				cls: "tg-kanban-sort-button clickable-icon",
			},
			(el) => {
				setIcon(el, "arrow-up-down");
			}
		);

		this.registerDomEvent(sortButton, "click", (event) => {
			const menu = new Menu();

			const sortOptions: KanbanSortOption[] = [
				{
					field: "priority",
					order: "desc",
					label: t("Priority (High to Low)"),
				},
				{
					field: "priority",
					order: "asc",
					label: t("Priority (Low to High)"),
				},
				{
					field: "dueDate",
					order: "asc",
					label: t("Due Date (Earliest First)"),
				},
				{
					field: "dueDate",
					order: "desc",
					label: t("Due Date (Latest First)"),
				},
				{
					field: "scheduledDate",
					order: "asc",
					label: t("Scheduled Date (Earliest First)"),
				},
				{
					field: "scheduledDate",
					order: "desc",
					label: t("Scheduled Date (Latest First)"),
				},
				{
					field: "startDate",
					order: "asc",
					label: t("Start Date (Earliest First)"),
				},
				{
					field: "startDate",
					order: "desc",
					label: t("Start Date (Latest First)"),
				},
			];

			sortOptions.forEach((option) => {
				menu.addItem((item) => {
					item.setTitle(option.label)
						.setChecked(
							option.field === this.sortOption.field &&
								option.order === this.sortOption.order
						)
						.onClick(() => {
							this.sortOption = option;
							this.renderColumns();
						});
				});
			});

			menu.showAtMouseEvent(event);
		});
	}

	private renderFilterControls(containerEl: HTMLElement) {
		console.log("Kanban rendering filter controls");
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
				// Add numeric string mappings
				"1": 1,
				"2": 2,
				"3": 3,
				"4": 4,
				"5": 5,
			};

			this.tasks = this.allTasks.filter((task) => {
				return this.activeFilters.every((filter) => {
					switch (filter.category) {
						case "status":
							return task.status === filter.value;
						case "tag":
							// Support for nested tags - include child tags
							return this.matchesTagFilter(task, filter.value);
						case "project":
							return task.project === filter.value;
						case "context":
							return task.context === filter.value;
						case "priority":
							const expectedPriority =
								PRIORITY_MAP[filter.value] ||
								parseInt(filter.value);
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

	// Enhanced tag filtering to support nested tags
	private matchesTagFilter(task: Task, filterTag: string): boolean {
		if (!task.tags || task.tags.length === 0) return false;

		return task.tags.some((taskTag) => {
			// Direct match
			if (taskTag === filterTag) return true;

			// Check if task tag is a child of the filter tag
			// e.g., filterTag = "#work", taskTag = "#work/project1"
			const normalizedFilterTag = filterTag.startsWith("#")
				? filterTag
				: `#${filterTag}`;
			const normalizedTaskTag = taskTag.startsWith("#")
				? taskTag
				: `#${taskTag}`;

			return normalizedTaskTag.startsWith(normalizedFilterTag + "/");
		});
	}

	// Handle filter application from clickable metadata
	private handleFilterApply = (
		filterType: string,
		value: string | number | string[]
	) => {
		// Convert value to string for consistent handling
		let stringValue = Array.isArray(value) ? value[0] : value.toString();

		// For priority filters, convert numeric input to icon representation if needed
		if (filterType === "priority" && /^\d+$/.test(stringValue)) {
			stringValue = this.convertPriorityToIcon(parseInt(stringValue));
		}

		// Add the filter to active filters
		const newFilter: ActiveFilter = {
			id: `${filterType}-${stringValue}`,
			category: filterType,
			categoryLabel: this.getCategoryLabel(filterType),
			value: stringValue,
		};

		console.log("Kanban handleFilterApply", filterType, stringValue);

		// Check if filter already exists
		const existingFilterIndex = this.activeFilters.findIndex(
			(f) => f.category === filterType && f.value === stringValue
		);

		if (existingFilterIndex === -1) {
			// Add new filter
			this.activeFilters.push(newFilter);
		} else {
			// Remove existing filter (toggle behavior)
			this.activeFilters.splice(existingFilterIndex, 1);
		}

		// Update filter component to reflect changes
		if (this.filterComponent) {
			this.filterComponent.setFilters(
				this.activeFilters.map((f) => ({
					category: f.category,
					value: f.value,
				}))
			);
		}

		// Re-apply filters and render
		this.applyFiltersAndRender();
	};

	private convertPriorityToIcon(priority: number): string {
		const PRIORITY_ICONS: Record<number, string> = {
			5: "🔺",
			4: "⏫",
			3: "🔼",
			2: "🔽",
			1: "⏬",
		};
		return PRIORITY_ICONS[priority] || priority.toString();
	}

	private getCategoryLabel(category: string): string {
		switch (category) {
			case "tag":
				return t("Tag");
			case "project":
				return t("Project");
			case "priority":
				return t("Priority");
			case "status":
				return t("Status");
			case "context":
				return t("Context");
			default:
				return category;
		}
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
			const tasksForStatus = this.getTasksForStatus(statusName);

			const column = new KanbanColumnComponent(
				this.app,
				this.plugin,
				this.columnContainerEl,
				statusName,
				// Pass filtered and sorted tasks for this status to the column
				tasksForStatus,
				{
					...this.params,
					onFilterApply: this.handleFilterApply,
				}
			);
			this.addChild(column);
			this.columns.push(column);
		});

		// Update column visibility based on hideEmptyColumns setting
		this.updateColumnVisibility();

		// Re-initialize sortable instances after columns are rendered
		this.initializeSortableInstances();
	}

	private updateColumnVisibility() {
		this.columns.forEach((column) => {
			if (this.hideEmptyColumns && column.isEmpty()) {
				column.setVisible(false);
			} else {
				column.setVisible(true);
			}
		});
	}

	private getTasksForStatus(statusName: string): Task[] {
		const statusMark =
			this.plugin.settings.taskStatusMarks[statusName] || " ";

		// Filter from the already filtered list
		const tasksForStatus = this.tasks.filter((task) => {
			const taskStatusMark = task.status || " ";
			return taskStatusMark === statusMark;
		});

		// Sort tasks within the status column based on selected sort option
		tasksForStatus.sort((a, b) => {
			return this.compareTasks(a, b, this.sortOption);
		});

		return tasksForStatus;
	}

	private compareTasks(
		a: Task,
		b: Task,
		sortOption: KanbanSortOption
	): number {
		const { field, order } = sortOption;
		let comparison = 0;

		switch (field) {
			case "priority":
				const priorityA = a.priority ?? 0;
				const priorityB = b.priority ?? 0;
				comparison = priorityA - priorityB;
				break;
			case "dueDate":
				const dueDateA = a.dueDate ?? Number.MAX_SAFE_INTEGER;
				const dueDateB = b.dueDate ?? Number.MAX_SAFE_INTEGER;
				comparison = dueDateA - dueDateB;
				break;
			case "scheduledDate":
				const scheduledA = a.scheduledDate ?? Number.MAX_SAFE_INTEGER;
				const scheduledB = b.scheduledDate ?? Number.MAX_SAFE_INTEGER;
				comparison = scheduledA - scheduledB;
				break;
			case "startDate":
				const startA = a.startDate ?? Number.MAX_SAFE_INTEGER;
				const startB = b.startDate ?? Number.MAX_SAFE_INTEGER;
				comparison = startA - startB;
				break;
			case "createdDate":
				const createdA = a.createdDate ?? Number.MAX_SAFE_INTEGER;
				const createdB = b.createdDate ?? Number.MAX_SAFE_INTEGER;
				comparison = createdA - createdB;
				break;
		}

		// Apply order (asc/desc)
		return order === "desc" ? -comparison : comparison;
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

	private loadKanbanConfig() {
		const kanbanConfig = this.plugin.settings.viewConfiguration.find(
			(v) => v.id === "kanban"
		)?.specificConfig as KanbanSpecificConfig;

		if (kanbanConfig) {
			this.hideEmptyColumns = kanbanConfig.hideEmptyColumns || false;
			this.sortOption = {
				field: kanbanConfig.defaultSortField || "priority",
				order: kanbanConfig.defaultSortOrder || "desc",
				label: this.getSortOptionLabel(
					kanbanConfig.defaultSortField || "priority",
					kanbanConfig.defaultSortOrder || "desc"
				),
			};
		}
	}

	private getSortOptionLabel(field: string, order: string): string {
		const fieldLabels: Record<string, string> = {
			priority: t("Priority"),
			dueDate: t("Due Date"),
			scheduledDate: t("Scheduled Date"),
			startDate: t("Start Date"),
			createdDate: t("Created Date"),
		};

		const orderLabel = order === "asc" ? t("Ascending") : t("Descending");
		return `${fieldLabels[field]} (${orderLabel})`;
	}

	public getColumnContainer(): HTMLElement {
		return this.columnContainerEl;
	}
}
