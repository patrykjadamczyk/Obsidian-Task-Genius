import { ItemView, WorkspaceLeaf, TFile, Plugin } from "obsidian";
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
	}

	private initializeComponents() {
		// Create the sidebar component
		this.sidebarComponent = new SidebarComponent(
			this.rootContainerEl,
			this.plugin
		);
		this.addChild(this.sidebarComponent);
		this.sidebarComponent.load();

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

		// Set up component events
		this.setupComponentEvents();
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
		};

		this.sidebarComponent.onProjectSelected = (project: string) => {
			this.contentComponent.setViewMode("projects", project);
		};

		// Content events
		this.contentComponent.onTaskSelected = (task: Task) => {
			this.detailsComponent.showTaskDetails(task);
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
