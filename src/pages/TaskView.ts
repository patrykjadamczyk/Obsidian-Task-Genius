import { ItemView, WorkspaceLeaf, TFile, Plugin, setIcon } from "obsidian";
import { Task } from "../utils/types/TaskIndex";
import { SidebarComponent, ViewMode } from "../components/task-view/sidebar";
import { ContentComponent } from "../components/task-view/content";
import { TaskDetailsComponent } from "../components/task-view/details";

export const TASK_VIEW_TYPE = "task-genius-view";

export class TaskView extends ItemView {
	// Main container elements
	private rootContainerEl: HTMLElement;

	// Component references
	private sidebarComponent: SidebarComponent;
	private contentComponent: ContentComponent;
	private detailsComponent: TaskDetailsComponent;

	// UI state management
	private isSidebarCollapsed: boolean = false;
	private isDetailsVisible: boolean = false;
	private sidebarToggleBtn: HTMLElement;
	private detailsToggleBtn: HTMLElement;

	// Data management
	private tasks: Task[] = [];

	constructor(leaf: WorkspaceLeaf, private plugin: Plugin) {
		super(leaf);
	}

	getViewType(): string {
		return TASK_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Task Genius";
	}

	async onOpen() {
		// Initialize the main container
		this.contentEl.toggleClass("task-genius-view", true);
		this.rootContainerEl = this.contentEl.createDiv({
			cls: "task-genius-container",
		});

		// Create the components
		this.initializeComponents();

		// Set up event listeners
		this.registerEvents();

		// Load initial data
		await this.loadTasks();

		// Set default view
		this.sidebarComponent.setViewMode("inbox");

		// Initially hide details panel since no task is selected
		this.toggleDetailsVisibility(false);
	}

	private initializeComponents() {
		// Create the sidebar component
		this.sidebarComponent = new SidebarComponent(
			this.rootContainerEl,
			this.plugin
		);
		this.addChild(this.sidebarComponent);
		this.sidebarComponent.load();

		// Add toggle button to sidebar
		this.createSidebarToggle();

		// Create the content component
		this.contentComponent = new ContentComponent(this.rootContainerEl);
		this.addChild(this.contentComponent);
		this.contentComponent.load();

		// Create the details component
		this.detailsComponent = new TaskDetailsComponent(
			this.rootContainerEl,
			this.app
		);
		this.addChild(this.detailsComponent);
		this.detailsComponent.load();

		// Add toggle button to details
		this.createDetailsToggle();

		// Set up component events
		this.setupComponentEvents();
	}

	private createSidebarToggle() {
		// Create toggle button for sidebar
		const toggleContainer = this.sidebarComponent.containerEl.createDiv({
			cls: "panel-toggle-container",
		});

		this.sidebarToggleBtn = toggleContainer.createDiv({
			cls: "panel-toggle-btn",
		});
		setIcon(this.sidebarToggleBtn, "chevron-left");

		this.registerDomEvent(this.sidebarToggleBtn, "click", () => {
			this.toggleSidebar();
		});
	}

	private createDetailsToggle() {
		// Create toggle button for details panel
		const toggleContainer = this.detailsComponent.containerEl.createDiv({
			cls: "panel-toggle-container",
		});

		this.detailsToggleBtn = toggleContainer.createDiv({
			cls: "panel-toggle-btn",
		});
		setIcon(this.detailsToggleBtn, "chevron-right");

		this.registerDomEvent(this.detailsToggleBtn, "click", () => {
			this.toggleDetailsVisibility(!this.isDetailsVisible);
		});
	}

	private toggleSidebar() {
		this.isSidebarCollapsed = !this.isSidebarCollapsed;
		this.rootContainerEl.toggleClass(
			"sidebar-collapsed",
			this.isSidebarCollapsed
		);

		// Update sidebar component state
		this.sidebarComponent.setCollapsed(this.isSidebarCollapsed);

		// Update toggle button icon
		setIcon(
			this.sidebarToggleBtn,
			this.isSidebarCollapsed ? "chevron-right" : "chevron-left"
		);
	}

	private toggleDetailsVisibility(visible: boolean) {
		this.isDetailsVisible = visible;
		this.rootContainerEl.toggleClass("details-visible", visible);
		this.rootContainerEl.toggleClass("details-hidden", !visible);

		// Update details component state
		this.detailsComponent.setVisible(visible);

		// Update toggle button icon
		setIcon(
			this.detailsToggleBtn,
			visible ? "chevron-right" : "chevron-left"
		);
	}

	private setupComponentEvents() {
		// Sidebar events
		this.sidebarComponent.onViewModeChanged = (mode: ViewMode) => {
			this.contentComponent.setViewMode(
				mode,
				mode === "projects"
					? this.sidebarComponent.getSelectedProject()
					: null
			);

			// Hide details panel when view mode changes
			this.toggleDetailsVisibility(false);
		};

		this.sidebarComponent.onProjectSelected = (project: string) => {
			this.contentComponent.setViewMode("projects", project);

			// Hide details panel when project is selected
			this.toggleDetailsVisibility(false);
		};

		// Content events
		this.contentComponent.onTaskSelected = (task: Task) => {
			this.detailsComponent.showTaskDetails(task);

			// Show details panel when task is selected
			this.toggleDetailsVisibility(true);
		};

		this.contentComponent.onTaskCompleted = async (task: Task) => {
			await this.toggleTaskCompletion(task);
		};

		// Details events
		this.detailsComponent.onTaskEdit = async (task: Task) => {
			await this.editTask(task);
		};

		this.detailsComponent.onTaskToggleComplete = async (task: Task) => {
			await this.toggleTaskCompletion(task);
		};
	}

	private async loadTasks() {
		// Get active task manager from plugin
		const taskManager = (this.plugin as any).taskManager;
		if (!taskManager) return;

		// Get all tasks
		this.tasks = taskManager.getAllTasks();

		// Initialize the sidebar project tree
		await this.sidebarComponent.initializeProjectTree(this.tasks);

		// Set tasks in content component
		this.contentComponent.setTasks(this.tasks);
	}

	private async toggleTaskCompletion(task: Task) {
		// Clone the task to avoid direct mutation
		const updatedTask = { ...task, completed: !task.completed };

		if (updatedTask.completed) {
			updatedTask.completedDate = Date.now();
		} else {
			updatedTask.completedDate = undefined;
		}

		// Get active task manager from plugin
		const taskManager = (this.plugin as any).taskManager;
		if (!taskManager) return;

		// Update the task
		await taskManager.updateTask(updatedTask);

		// Update the task in our content component
		this.contentComponent.updateTask(updatedTask);

		// If this is the currently selected task, update details
		const selectedTask = this.contentComponent.getSelectedTask();
		if (selectedTask && selectedTask.id === updatedTask.id) {
			this.detailsComponent.showTaskDetails(updatedTask);
		}
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

	private registerEvents() {
		// Re-filter tasks when task cache is updated
		this.registerEvent(
			this.app.workspace.on(
				"task-genius:task-cache-updated",
				async () => {
					await this.loadTasks();
				}
			)
		);
	}

	async onClose() {
		// Clean up
		this.rootContainerEl.empty();
	}
}
