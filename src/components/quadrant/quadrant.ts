import {
	App,
	Component,
	setIcon,
} from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { Task } from "../../types/task";
import { QuadrantColumnComponent } from "./quadrant-column";
import Sortable from "sortablejs";
import "../../styles/quadrant/quadrant.css";
import { t } from "../../translations/helper";
import { FilterComponent } from "../inview-filter/filter";
import { ActiveFilter } from "../inview-filter/filter-type";

export interface QuadrantSortOption {
	field:
		| "priority"
		| "dueDate"
		| "scheduledDate"
		| "startDate"
		| "createdDate";
	order: "asc" | "desc";
	label: string;
}

// 四象限定义
export interface QuadrantDefinition {
	id: string;
	title: string;
	description: string;
	priorityEmoji: string;
	urgentTag?: string; // 紧急任务标签
	importantTag?: string; // 重要任务标签
	className: string;
}

export const QUADRANT_DEFINITIONS: QuadrantDefinition[] = [
	{
		id: "urgent-important",
		title: t("Urgent & Important"),
		description: t("Do First - Crisis & emergencies"),
		priorityEmoji: "🔺", // Highest priority
		urgentTag: "#urgent",
		importantTag: "#important",
		className: "quadrant-urgent-important"
	},
	{
		id: "not-urgent-important", 
		title: t("Not Urgent & Important"),
		description: t("Schedule - Planning & development"),
		priorityEmoji: "⏫", // High priority
		importantTag: "#important",
		className: "quadrant-not-urgent-important"
	},
	{
		id: "urgent-not-important",
		title: t("Urgent & Not Important"), 
		description: t("Delegate - Interruptions & distractions"),
		priorityEmoji: "🔼", // Medium priority
		urgentTag: "#urgent",
		className: "quadrant-urgent-not-important"
	},
	{
		id: "not-urgent-not-important",
		title: t("Not Urgent & Not Important"),
		description: t("Eliminate - Time wasters"),
		priorityEmoji: "🔽", // Low priority
		className: "quadrant-not-urgent-not-important"
	}
];

export class QuadrantComponent extends Component {
	plugin: TaskProgressBarPlugin;
	app: App;
	public containerEl: HTMLElement;
	private columns: QuadrantColumnComponent[] = [];
	private columnContainerEl: HTMLElement;
	private sortableInstances: Sortable[] = [];
	private tasks: Task[] = [];
	private allTasks: Task[] = [];
	private currentViewId: string = "quadrant";
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
	private filterContainerEl: HTMLElement;
	private sortOption: QuadrantSortOption = {
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
		} = {},
		viewId: string = "quadrant"
	) {
		super();
		this.app = app;
		this.plugin = plugin;
		this.currentViewId = viewId;
		this.containerEl = parentEl.createDiv("tg-quadrant-component-container");
		this.tasks = initialTasks;
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
		// Clean up sortable instances
		this.sortableInstances.forEach(sortable => {
			sortable.destroy();
		});
		this.sortableInstances = [];

		// Clean up columns
		this.columns.forEach(column => {
			column.onunload();
		});
		this.columns = [];

		// Clean up filter component
		if (this.filterComponent) {
			this.filterComponent.onunload();
			this.filterComponent = null;
		}
	}

	private render() {
		this.containerEl.empty();

		// Create header with controls
		this.createHeader();

		// Create filter section
		this.createFilterSection();

		// Create main quadrant grid
		this.createQuadrantGrid();

		// Initialize the view
		this.refresh();
	}

	private createHeader() {
		const headerEl = this.containerEl.createDiv("tg-quadrant-header");
		
		const titleEl = headerEl.createDiv("tg-quadrant-title");
		titleEl.textContent = t("Task Priority Matrix");

		const controlsEl = headerEl.createDiv("tg-quadrant-controls");

		// Sort dropdown
		const sortEl = controlsEl.createDiv("tg-quadrant-sort");
		const sortSelect = sortEl.createEl("select", { cls: "tg-quadrant-sort-select" });
		
		const sortOptions: QuadrantSortOption[] = [
			{ field: "priority", order: "desc", label: t("Priority (High to Low)") },
			{ field: "priority", order: "asc", label: t("Priority (Low to High)") },
			{ field: "dueDate", order: "asc", label: t("Due Date (Earliest First)") },
			{ field: "dueDate", order: "desc", label: t("Due Date (Latest First)") },
			{ field: "createdDate", order: "desc", label: t("Created Date (Newest First)") },
			{ field: "createdDate", order: "asc", label: t("Created Date (Oldest First)") }
		];

		sortOptions.forEach(option => {
			const optionEl = sortSelect.createEl("option");
			optionEl.value = `${option.field}-${option.order}`;
			optionEl.textContent = option.label;
		});

		sortSelect.addEventListener("change", () => {
			const [field, order] = sortSelect.value.split("-");
			this.sortOption = sortOptions.find(opt => opt.field === field && opt.order === order) || this.sortOption;
			this.refresh();
		});

		// Toggle empty columns button
		const toggleEmptyBtn = controlsEl.createEl("button", {
			cls: "tg-quadrant-toggle-empty",
			attr: { "aria-label": t("Toggle empty columns") }
		});
		setIcon(toggleEmptyBtn, "eye");
		toggleEmptyBtn.addEventListener("click", () => {
			this.hideEmptyColumns = !this.hideEmptyColumns;
			setIcon(toggleEmptyBtn, this.hideEmptyColumns ? "eye-off" : "eye");
			this.refresh();
		});
	}

	private createFilterSection() {
		this.filterContainerEl = this.containerEl.createDiv("tg-quadrant-filter-container");
	}

	private createQuadrantGrid() {
		this.columnContainerEl = this.containerEl.createDiv("tg-quadrant-grid");
		
		// Create four quadrant columns
		QUADRANT_DEFINITIONS.forEach((quadrant) => {
			const columnEl = this.columnContainerEl.createDiv(`tg-quadrant-column ${quadrant.className}`);
			
			const column = new QuadrantColumnComponent(
				this.app,
				this.plugin,
				columnEl,
				quadrant,
				{
					onTaskStatusUpdate: this.params.onTaskStatusUpdate,
					onTaskSelected: this.params.onTaskSelected,
					onTaskCompleted: this.params.onTaskCompleted,
					onTaskContextMenu: this.params.onTaskContextMenu
				}
			);

			this.addChild(column);
			this.columns.push(column);

			// Setup drag and drop for this column
			this.setupDragAndDrop(columnEl, quadrant);
		});
	}

	private setupDragAndDrop(columnEl: HTMLElement, quadrant: QuadrantDefinition) {
		const contentEl = columnEl.querySelector(".tg-quadrant-column-content") as HTMLElement;
		if (!contentEl) return;

		const sortable = new Sortable(contentEl, {
			group: "quadrant-tasks",
			animation: 150,
			ghostClass: "tg-quadrant-card--ghost",
			chosenClass: "tg-quadrant-card--chosen",
			dragClass: "tg-quadrant-card--drag",
			emptyInsertThreshold: 20,
			
			onStart: (evt) => {
				// Add visual indicators
				this.addDropIndicators();
			},

			onEnd: (evt) => {
				// Remove visual indicators
				this.removeDropIndicators();
				
				// Handle the drop
				if (evt.to !== evt.from) {
					this.handleTaskMove(evt, quadrant);
				}
			},

			onAdd: (evt) => {
				// Task moved to this quadrant
				const taskEl = evt.item;
				const taskId = taskEl.getAttribute("data-task-id");
				if (taskId) {
					this.updateTaskQuadrant(taskId, quadrant);
				}
			}
		});

		this.sortableInstances.push(sortable);
	}

	private addDropIndicators() {
		this.columns.forEach(column => {
			column.addDropIndicator();
		});
	}

	private removeDropIndicators() {
		this.columns.forEach(column => {
			column.removeDropIndicator();
		});
	}

	private handleTaskMove(evt: any, targetQuadrant: QuadrantDefinition) {
		const taskEl = evt.item;
		const taskId = taskEl.getAttribute("data-task-id");
		
		if (!taskId) return;

		const task = this.tasks.find(t => t.id === taskId);
		if (!task) return;

		// Update task priority and tags based on quadrant
		this.updateTaskQuadrant(taskId, targetQuadrant);
	}

	private async updateTaskQuadrant(taskId: string, quadrant: QuadrantDefinition) {
		const task = this.tasks.find(t => t.id === taskId);
		if (!task) return;

		try {
			// Update task content with new priority emoji
			let updatedContent = task.content;
			
			// Remove existing priority emojis
			updatedContent = updatedContent.replace(/[🔺⏫🔼🔽⏬]/g, "").trim();
			
			// Add new priority emoji
			if (quadrant.priorityEmoji) {
				updatedContent += ` ${quadrant.priorityEmoji}`;
			}

			// Update tags based on quadrant
			let updatedTags = task.content;
			
			// Remove existing urgent/important tags
			updatedTags = updatedTags.replace(/#urgent\b/g, "").replace(/#important\b/g, "").trim();
			
			// Add new tags based on quadrant
			if (quadrant.urgentTag) {
				updatedTags += ` ${quadrant.urgentTag}`;
			}
			if (quadrant.importantTag) {
				updatedTags += ` ${quadrant.importantTag}`;
			}

			// Update the task content
			updatedContent = updatedTags.trim();

			// Call the update callback if provided
			if (this.params.onTaskStatusUpdate) {
				// For now, we'll just trigger a refresh - proper task updating would need file modification
				await this.updateTaskInFile(task, updatedContent);
			}

			// Refresh the view
			this.refresh();

		} catch (error) {
			console.error("Failed to update task quadrant:", error);
		}
	}

	private async updateTaskInFile(task: Task, newContent: string) {
		// This is a simplified implementation - in a real scenario, you'd need to
		// update the actual file content using the Obsidian API
		const file = this.app.vault.getAbstractFileByPath(task.filePath);
		if (file && file instanceof this.app.vault.adapter.constructor) {
			// Implementation would go here to update the file
			console.log(`Would update task ${task.id} with new content: ${newContent}`);
		}
	}

	private categorizeTasksByQuadrant(tasks: Task[]): Map<string, Task[]> {
		const quadrantTasks = new Map<string, Task[]>();
		
		// Initialize all quadrants
		QUADRANT_DEFINITIONS.forEach(quadrant => {
			quadrantTasks.set(quadrant.id, []);
		});

		tasks.forEach(task => {
			const quadrantId = this.determineTaskQuadrant(task);
			const quadrantTaskList = quadrantTasks.get(quadrantId) || [];
			quadrantTaskList.push(task);
			quadrantTasks.set(quadrantId, quadrantTaskList);
		});

		return quadrantTasks;
	}

	private determineTaskQuadrant(task: Task): string {
		const content = task.content.toLowerCase();
		const isUrgent = content.includes("#urgent") || this.isTaskUrgent(task);
		const isImportant = content.includes("#important") || this.isTaskImportant(task);

		if (isUrgent && isImportant) {
			return "urgent-important";
		} else if (!isUrgent && isImportant) {
			return "not-urgent-important";
		} else if (isUrgent && !isImportant) {
			return "urgent-not-important";
		} else {
			return "not-urgent-not-important";
		}
	}

	private isTaskUrgent(task: Task): boolean {
		// Check if task has high priority emojis or due date is soon
		const hasHighPriority = /[🔺⏫]/.test(task.content);
		const hasSoonDueDate = task.metadata?.dueDate && task.metadata.dueDate <= Date.now() + (24 * 60 * 60 * 1000); // Due within 24 hours
		
		return hasHighPriority || !!hasSoonDueDate;
	}

	private isTaskImportant(task: Task): boolean {
		// Check if task has medium-high priority or is part of important projects
		const hasMediumHighPriority = /[🔺⏫🔼]/.test(task.content);
		// Could also check for important project tags or keywords
		const hasImportantKeywords = /\b(goal|project|milestone|strategic)\b/i.test(task.content);
		
		return hasMediumHighPriority || hasImportantKeywords;
	}

	public setTasks(tasks: Task[]) {
		this.allTasks = [...tasks];
		this.applyFilters();
	}

	private applyFilters() {
		// Apply active filters to tasks
		let filteredTasks = [...this.allTasks];

		// TODO: Apply active filters here if needed
		// for (const filter of this.activeFilters) {
		//     filteredTasks = this.applyFilter(filteredTasks, filter);
		// }

		this.tasks = filteredTasks;
		this.refresh();
	}

	public refresh() {
		if (!this.columns.length) return;

		// Categorize tasks by quadrant
		const quadrantTasks = this.categorizeTasksByQuadrant(this.tasks);

		// Update each column
		this.columns.forEach(column => {
			const quadrantId = column.getQuadrantId();
			const tasks = quadrantTasks.get(quadrantId) || [];
			
			// Sort tasks within each quadrant
			const sortedTasks = this.sortTasks(tasks);
			
			// Update column visibility
			const shouldHide = this.hideEmptyColumns && tasks.length === 0;
			column.setVisibility(!shouldHide);
			
			// Update column tasks
			column.setTasks(sortedTasks);
		});
	}

	private sortTasks(tasks: Task[]): Task[] {
		const sortedTasks = [...tasks];
		
		sortedTasks.sort((a, b) => {
			let aValue: any, bValue: any;

			switch (this.sortOption.field) {
				case "priority":
					aValue = this.getTaskPriorityValue(a);
					bValue = this.getTaskPriorityValue(b);
					break;
				case "dueDate":
					aValue = a.metadata?.dueDate || 0;
					bValue = b.metadata?.dueDate || 0;
					break;
				case "scheduledDate":
					aValue = a.metadata?.scheduledDate || 0;
					bValue = b.metadata?.scheduledDate || 0;
					break;
				case "startDate":
					aValue = a.metadata?.startDate || 0;
					bValue = b.metadata?.startDate || 0;
					break;
				case "createdDate":
					aValue = a.metadata?.createdDate || 0;
					bValue = b.metadata?.createdDate || 0;
					break;
				default:
					return 0;
			}

			if (this.sortOption.order === "asc") {
				return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
			} else {
				return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
			}
		});

		return sortedTasks;
	}

	private getTaskPriorityValue(task: Task): number {
		if (task.content.includes("🔺")) return 5; // Highest
		if (task.content.includes("⏫")) return 4; // High
		if (task.content.includes("🔼")) return 3; // Medium
		if (task.content.includes("🔽")) return 2; // Low
		if (task.content.includes("⏬")) return 1; // Lowest
		return 0; // No priority
	}

	public getQuadrantStats(): { [key: string]: number } {
		const quadrantTasks = this.categorizeTasksByQuadrant(this.tasks);
		const stats: { [key: string]: number } = {};
		
		QUADRANT_DEFINITIONS.forEach(quadrant => {
			stats[quadrant.id] = quadrantTasks.get(quadrant.id)?.length || 0;
		});

		return stats;
	}
}