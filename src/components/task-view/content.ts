import { App, Component, ExtraButtonComponent, setIcon } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import { TaskListItemComponent } from "./listItem"; // Re-import needed components
import { ViewMode } from "./sidebar";
import { tasksToTree } from "../../utils/treeViewUtil"; // Re-import needed utils
import { TaskTreeItemComponent } from "./treeItem"; // Re-import needed components
import { t } from "../../translations/helper";
import TaskProgressBarPlugin from "../../index";
// We won't use BaseTaskRendererComponent for the main list in Inbox
// import { BaseTaskRendererComponent } from "./baseTaskRenderer";

export class ContentComponent extends Component {
	public containerEl: HTMLElement;
	private headerEl: HTMLElement;
	private taskListEl: HTMLElement; // Container for rendering
	private filterInput: HTMLInputElement;
	private titleEl: HTMLElement;
	private countEl: HTMLElement;

	// Task data
	private allTasks: Task[] = [];
	private filteredTasks: Task[] = []; // Tasks after filters applied
	private selectedTask: Task | null = null;

	// Child Components (managed by InboxComponent for lazy loading)
	private taskComponents: TaskListItemComponent[] = [];
	private treeComponents: TaskTreeItemComponent[] = [];

	// Virtualization State
	private taskListObserver: IntersectionObserver;
	private taskPageSize = 50; // Number of tasks to load per batch
	private nextTaskIndex = 0; // Index for next list item batch
	private nextRootTaskIndex = 0; // Index for next tree root batch
	private rootTasks: Task[] = []; // Root tasks for tree view

	// State
	private currentViewMode: ViewMode = "inbox";
	private selectedProject: string | null = null;
	private focusFilter: string | null = null;
	private isTreeView: boolean = false;

	// Events (Passed to created components)
	public onTaskSelected: (task: Task | null) => void;
	public onTaskCompleted: (task: Task) => void;
	public onTaskContextMenu: (event: MouseEvent, task: Task) => void;

	constructor(
		private parentEl: HTMLElement,
		private app: App,
		private plugin: TaskProgressBarPlugin
	) {
		super();
	}

	onload() {
		// Create main content container
		this.containerEl = this.parentEl.createDiv({ cls: "task-content" });

		// Create header
		this.createContentHeader();

		// Create task list container
		this.taskListEl = this.containerEl.createDiv({ cls: "task-list" });

		// Set up intersection observer for lazy loading
		this.initializeVirtualList();
	}

	private createContentHeader() {
		this.headerEl = this.containerEl.createDiv({ cls: "content-header" });

		// View title
		this.titleEl = this.headerEl.createDiv({
			cls: "content-title",
			text: t("Inbox"), // Default title
		});

		// Task count
		this.countEl = this.headerEl.createDiv({
			cls: "task-count",
			text: t("0 tasks"),
		});

		// Filter controls
		const filterEl = this.headerEl.createDiv({ cls: "content-filter" });
		this.filterInput = filterEl.createEl("input", {
			cls: "filter-input",
			attr: { type: "text", placeholder: t("Filter tasks...") },
		});

		// View toggle button
		const viewToggleBtn = this.headerEl.createDiv({
			cls: "view-toggle-btn",
		});
		setIcon(viewToggleBtn, "list"); // Set initial icon
		viewToggleBtn.setAttribute("aria-label", t("Toggle list/tree view"));
		this.registerDomEvent(viewToggleBtn, "click", () => {
			this.toggleViewMode();
		});

		// Focus filter button (remains commented out)
		// ...

		// Event listeners
		this.registerDomEvent(this.filterInput, "input", () => {
			this.filterTasks(this.filterInput.value);
		});
	}

	private initializeVirtualList() {
		this.taskListObserver = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (
						entry.isIntersecting &&
						entry.target.classList.contains("task-load-marker")
					) {
						console.log(
							"Load marker intersecting, calling loadMoreTasks..."
						);
						// Target is the load marker, load more tasks
						this.loadMoreTasks();
					}
					// Optional: Could track visibility of actual task items here if needed
					// const taskId = entry.target.getAttribute("data-task-id");
					// if (taskId && taskId !== 'load-marker') { ... }
				});
			},
			{
				root: this.taskListEl, // Observe within the task list container
				threshold: 0.1, // Trigger when 10% of the marker is visible
			}
		);
	}

	private toggleViewMode() {
		this.isTreeView = !this.isTreeView;
		const viewToggleBtn = this.headerEl.querySelector(
			".view-toggle-btn"
		) as HTMLElement;
		if (viewToggleBtn) {
			setIcon(viewToggleBtn, this.isTreeView ? "git-branch" : "list");
		}
		this.refreshTaskList(); // Refresh list completely on view mode change
	}

	public setTasks(tasks: Task[]) {
		this.allTasks = tasks;
		this.applyFilters();
		this.refreshTaskList();
	}

	public setViewMode(mode: ViewMode, project?: string | null) {
		this.currentViewMode = mode;
		this.selectedProject = project === undefined ? null : project;

		// Update title based on mode and project
		let title = t(mode.charAt(0).toUpperCase() + mode.slice(1)); // Capitalize mode name
		if (mode === "projects" && this.selectedProject) {
			const projectName = this.selectedProject.split("/").pop();
			title = projectName || t("Project"); // Use project name or generic term
		} else if (mode === "tags" && this.selectedProject) {
			// Assuming selectedProject holds the tag in tag mode
			title = `#${this.selectedProject.replace("#", "")}`;
		}
		this.titleEl.setText(title);

		this.applyFilters();
		this.refreshTaskList();
	}

	private applyFilters() {
		// Start with all tasks
		let filtered = [...this.allTasks];

		// Apply view mode filter (Simplified from original, adjust as needed)
		switch (this.currentViewMode) {
			case "inbox":
				filtered = filtered.filter(
					(task) => !task.project && !task.completed
				);
				break;
			case "forecast": // Example: Needs specific Forecast logic if used here
				const todayStart = new Date();
				todayStart.setHours(0, 0, 0, 0);
				const todayEnd = new Date();
				todayEnd.setHours(23, 59, 59, 999);
				filtered = filtered.filter(
					(task) =>
						!task.completed &&
						task.dueDate &&
						task.dueDate >= todayStart.getTime() &&
						task.dueDate <= todayEnd.getTime()
				);
				break;
			case "projects":
				if (this.selectedProject) {
					filtered = filtered.filter(
						(task) => task.project === this.selectedProject
					);
				} else {
					// Maybe show nothing or all project tasks? Let's show none for now.
					filtered = [];
				}
				break;
			case "tags":
				if (this.selectedProject) {
					// Assuming selectedProject holds the tag
					const selectedTag = this.selectedProject;
					filtered = filtered.filter((task) =>
						task.tags?.includes(selectedTag)
					);
				} else {
					filtered = [];
				}
				break;
			// Add cases for other modes if needed ('flagged', 'review')
			case "flagged":
				// Flagged or high priority tasks
				filtered = filtered.filter(
					(task) =>
						!task.completed &&
						(task.priority === 3 || task.tags.includes("flagged"))
				);
				break;
			default:
				// // Filter for non-completed tasks by default?
				// filtered = filtered.filter((task) => !task.completed);
				break;
		}

		// Apply focus filter if set
		if (this.focusFilter) {
			// ... (focus filter logic) ...
		}

		// Apply text filter
		const textFilter = this.filterInput.value.toLowerCase();
		if (textFilter) {
			filtered = filtered.filter(
				(task) =>
					task.content.toLowerCase().includes(textFilter) ||
					task.project?.toLowerCase().includes(textFilter) ||
					task.context?.toLowerCase().includes(textFilter) ||
					task.tags?.some((tag) =>
						tag.toLowerCase().includes(textFilter)
					)
			);
		}

		// Sort tasks (Simplified example, use original if needed)
		filtered.sort((a, b) => {
			if (a.completed !== b.completed) return a.completed ? 1 : -1;
			const prioA = a.priority || 0;
			const prioB = b.priority || 0;
			if (prioA !== prioB) return prioB - prioA;
			const dueA = a.dueDate || Infinity;
			const dueB = b.dueDate || Infinity;
			if (dueA !== dueB) return dueA - dueB;
			return a.content.localeCompare(b.content);
		});

		this.filteredTasks = filtered;

		// Update the task count display
		this.countEl.setText(`${this.filteredTasks.length} ${t("tasks")}`);
	}

	private filterTasks(query: string) {
		this.applyFilters();
		this.refreshTaskList();
	}

	private cleanupComponents() {
		// Unload and clear previous components
		this.taskComponents.forEach((component) => this.removeChild(component));
		this.taskComponents = [];
		this.treeComponents.forEach((component) => this.removeChild(component));
		this.treeComponents = [];
		// Disconnect observer from any previous elements
		this.taskListObserver.disconnect();
		// Clear the container
		this.taskListEl.empty();
	}

	private refreshTaskList() {
		this.cleanupComponents(); // Clear previous state and components

		// Reset indices for lazy loading
		this.nextTaskIndex = 0;
		this.nextRootTaskIndex = 0;
		this.rootTasks = [];

		if (this.filteredTasks.length === 0) {
			this.addEmptyState(t("No tasks found."));
			return;
		}

		// Render based on view mode
		if (this.isTreeView) {
			const taskMap = new Map<string, Task>();
			this.filteredTasks.forEach((task) => taskMap.set(task.id, task));
			this.rootTasks = tasksToTree(this.filteredTasks); // Calculate root tasks
			this.loadRootTaskBatch(taskMap); // Load the first batch
		} else {
			this.loadTaskBatch(); // Load the first batch
		}

		// Add load marker if necessary
		this.checkAndAddLoadMarker();
	}

	private loadTaskBatch(): number {
		const fragment = document.createDocumentFragment();
		const countToLoad = this.taskPageSize;
		const start = this.nextTaskIndex;
		const end = Math.min(start + countToLoad, this.filteredTasks.length);

		console.log(`Loading list tasks from ${start} to ${end}`);

		for (let i = start; i < end; i++) {
			const task = this.filteredTasks[i];
			const taskComponent = new TaskListItemComponent(
				task,
				this.currentViewMode,
				this.app
			);

			// Attach event handlers
			taskComponent.onTaskSelected = this.selectTask.bind(this);
			taskComponent.onTaskCompleted = (t) => {
				if (this.onTaskCompleted) this.onTaskCompleted(t);
			};
			taskComponent.onTaskContextMenu = (e, t) => {
				if (this.onTaskContextMenu) this.onTaskContextMenu(e, t);
			};

			this.addChild(taskComponent); // Manage lifecycle
			taskComponent.load();
			fragment.appendChild(taskComponent.element);
			this.taskComponents.push(taskComponent); // Keep track of rendered components
		}

		this.taskListEl.appendChild(fragment);
		this.nextTaskIndex = end; // Update index for the next batch
		return end; // Return the new end index
	}

	private loadRootTaskBatch(taskMap: Map<string, Task>): number {
		const fragment = document.createDocumentFragment();
		const countToLoad = this.taskPageSize;
		const start = this.nextRootTaskIndex;
		const end = Math.min(start + countToLoad, this.rootTasks.length);

		console.log(`Loading tree tasks from ${start} to ${end}`);

		for (let i = start; i < end; i++) {
			const rootTask = this.rootTasks[i];
			const childTasks = this.filteredTasks.filter(
				(task) => task.parent === rootTask.id
			);

			const treeComponent = new TaskTreeItemComponent(
				rootTask,
				this.currentViewMode,
				this.app,
				0,
				childTasks,
				taskMap
			);

			// Attach event handlers
			treeComponent.onTaskSelected = this.selectTask.bind(this);
			treeComponent.onTaskCompleted = (t) => {
				if (this.onTaskCompleted) this.onTaskCompleted(t);
			};
			treeComponent.onTaskContextMenu = (e, t) => {
				if (this.onTaskContextMenu) this.onTaskContextMenu(e, t);
			};

			this.addChild(treeComponent); // Manage lifecycle
			treeComponent.load();
			fragment.appendChild(treeComponent.element);
			this.treeComponents.push(treeComponent); // Keep track of rendered components
		}

		this.taskListEl.appendChild(fragment);
		this.nextRootTaskIndex = end; // Update index for the next batch
		return end; // Return the new end index
	}

	private checkAndAddLoadMarker() {
		this.removeLoadMarker(); // Remove existing marker first

		const moreTasksExist = this.isTreeView
			? this.nextRootTaskIndex < this.rootTasks.length
			: this.nextTaskIndex < this.filteredTasks.length;

		console.log(
			`Check load marker: moreTasksExist = ${moreTasksExist} (Tree: ${this.nextRootTaskIndex}/${this.rootTasks.length}, List: ${this.nextTaskIndex}/${this.filteredTasks.length})`
		);

		if (moreTasksExist) {
			this.addLoadMarker();
		}
	}

	private addLoadMarker() {
		const loadMarker = this.taskListEl.createDiv({
			cls: "task-load-marker",
			attr: { "data-task-id": "load-marker" }, // Use data attribute for identification
		});
		loadMarker.setText(t("Loading more..."));
		console.log("Adding load marker and observing.");
		this.taskListObserver.observe(loadMarker); // Observe the marker
	}

	private removeLoadMarker() {
		const oldMarker = this.taskListEl.querySelector(".task-load-marker");
		if (oldMarker) {
			this.taskListObserver.unobserve(oldMarker); // Stop observing before removing
			oldMarker.remove();
		}
	}

	private loadMoreTasks() {
		console.log("Load more tasks triggered...");
		this.removeLoadMarker(); // Remove the current marker

		if (this.isTreeView) {
			if (this.nextRootTaskIndex < this.rootTasks.length) {
				console.log(
					`Loading more TREE tasks from index ${this.nextRootTaskIndex}`
				);
				const taskMap = new Map<string, Task>();
				this.filteredTasks.forEach((task) =>
					taskMap.set(task.id, task)
				);
				this.loadRootTaskBatch(taskMap);
			} else {
				console.log("No more TREE tasks to load.");
			}
		} else {
			if (this.nextTaskIndex < this.filteredTasks.length) {
				console.log(
					`Loading more LIST tasks from index ${this.nextTaskIndex}`
				);
				this.loadTaskBatch();
			} else {
				console.log("No more LIST tasks to load.");
			}
		}

		// Add the marker back if there are still more tasks after loading the batch
		this.checkAndAddLoadMarker();
	}

	private addEmptyState(message: string) {
		this.cleanupComponents(); // Ensure list is clean
		const emptyEl = this.taskListEl.createDiv({ cls: "task-empty-state" });
		emptyEl.setText(message);
	}

	private selectTask(task: Task | null) {
		if (this.selectedTask?.id === task?.id) {
			// Optional: Deselect if clicking the same task again
			// this.selectedTask = null;
			// console.log("Task deselected:", task?.id);
			// // Update visual state - Renderer doesn't directly support this yet
			// if(this.onTaskSelected) this.onTaskSelected(null);
			// return;
		}

		this.selectedTask = task;
		console.log("Task selected:", task?.id);

		// TODO: Update visual selection state via renderer/components if needed
		// Currently, components handle their own :active/:focus state.
		// Explicit selection state needs passing down or event bus.

		if (this.onTaskSelected) {
			this.onTaskSelected(task);
		}
	}

	public updateTask(updatedTask: Task) {
		// Update the task in the main data source
		const taskIndexAll = this.allTasks.findIndex(
			(t) => t.id === updatedTask.id
		);
		if (taskIndexAll !== -1) {
			this.allTasks[taskIndexAll] = { ...updatedTask };
		} else {
			this.allTasks.push(updatedTask); // Add if new
		}

		// Update selected task state if it was the one updated
		if (this.selectedTask && this.selectedTask.id === updatedTask.id) {
			this.selectedTask = { ...updatedTask };
		}

		// Option 1: Simple Refresh (loses scroll position, easiest)
		// this.applyFilters();
		// this.refreshTaskList();

		// Option 2: Update in place if rendered, otherwise wait for lazy load
		const filteredIndex = this.filteredTasks.findIndex(
			(t) => t.id === updatedTask.id
		);
		if (filteredIndex !== -1) {
			this.filteredTasks[filteredIndex] = updatedTask; // Update data in filtered list
		} else {
			// Task might have become visible due to filters changing, need full refresh
			this.applyFilters();
			this.refreshTaskList();
			return;
		}

		// Try to find and update the component only if it's currently rendered
		if (!this.isTreeView) {
			const component = this.taskComponents.find(
				(c) => c.getTask().id === updatedTask.id
			);
			component?.updateTask(updatedTask);
		} else {
			// For tree view, check root components and recursively search
			let updated = false;
			for (const rootComp of this.treeComponents) {
				if (rootComp.getTask().id === updatedTask.id) {
					rootComp.updateTask(updatedTask);
					updated = true;
					break;
				} else {
					if (rootComp.updateTaskRecursively(updatedTask)) {
						updated = true;
						break;
					}
				}
			}
			// If not found in currently rendered tree, a full refresh might be needed
			// Or we accept it won't update until scrolled into view.
			// console.log(`Task ${updatedTask.id} updated. Was rendered component updated? ${updated}`);
		}
		// Update count display as filteredTasks array was updated
		this.countEl.setText(`${this.filteredTasks.length} ${t("tasks")}`);
	}

	public getSelectedTask(): Task | null {
		return this.selectedTask;
	}

	onunload() {
		this.cleanupComponents(); // Use the cleanup method
		this.containerEl.empty(); // Extra safety
		this.containerEl.remove();
	}
}
