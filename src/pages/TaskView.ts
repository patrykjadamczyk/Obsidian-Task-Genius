import {
	ItemView,
	WorkspaceLeaf,
	TFile,
	Plugin,
	setIcon,
	ExtraButtonComponent,
	ButtonComponent,
	Menu,
} from "obsidian";
import { Task } from "../utils/types/TaskIndex";
import { SidebarComponent, ViewMode } from "../components/task-view/sidebar";
import { InboxComponent } from "../components/task-view/inbox";
import { ForecastComponent } from "../components/task-view/forecast";
import { TagsComponent } from "../components/task-view/tags";
import { ProjectsComponent } from "../components/task-view/projects";
import { ReviewComponent } from "../components/task-view/review";
import {
	createTaskCheckbox,
	TaskDetailsComponent,
} from "../components/task-view/details";
import "../styles/view.css";
import TaskProgressBarPlugin from "../index";
import { QuickCaptureModal } from "src/components/QuickCaptureModal";
import { t } from "../translations/helper";
export const TASK_VIEW_TYPE = "task-genius-view";

export class TaskView extends ItemView {
	// Main container elements
	private rootContainerEl: HTMLElement;

	// Component references
	private sidebarComponent: SidebarComponent;
	private contentComponent: InboxComponent;
	private forecastComponent: ForecastComponent;
	private tagsComponent: TagsComponent;
	private projectsComponent: ProjectsComponent;
	private reviewComponent: ReviewComponent;
	private detailsComponent: TaskDetailsComponent;

	// UI state management
	private isSidebarCollapsed: boolean = false;
	private isDetailsVisible: boolean = false;
	private sidebarToggleBtn: HTMLElement;
	private detailsToggleBtn: HTMLElement;
	private currentViewMode: ViewMode = "inbox";
	private currentSelectedTaskId: string | null = null;
	private currentSelectedTaskDOM: HTMLElement | null = null;
	private lastToggleTimestamp: number = 0;

	// Data management
	private tasks: Task[] = [];

	constructor(leaf: WorkspaceLeaf, private plugin: TaskProgressBarPlugin) {
		super(leaf);

		this.tasks = this.plugin.preloadedTasks;
	}

	getViewType(): string {
		return TASK_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t("Task Genius View");
	}

	getIcon(): string {
		return "list-checks";
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

		// Set default view
		this.sidebarComponent.setViewMode(
			(this.app.loadLocalStorage("task-genius:view-mode") as ViewMode) ||
				"inbox"
		);

		// Initially hide details panel since no task is selected
		this.toggleDetailsVisibility(false);

		this.createActionButtons();

		(this.leaf.tabHeaderStatusContainerEl as HTMLElement).empty();
		(this.leaf.tabHeaderStatusContainerEl as HTMLElement).createEl(
			"span",
			{
				cls: "task-genius-action-btn",
			},
			(el: HTMLElement) => {
				new ExtraButtonComponent(el)
					.setIcon("check-square")
					.setTooltip(t("Capture"))
					.onClick(() => {
						const modal = new QuickCaptureModal(
							this.plugin.app,
							this.plugin,
							{},
							true
						);
						modal.open();
					});
			}
		);

		this.triggerViewUpdate();

		this.checkAndCollapseSidebar();
	}

	onResize(): void {
		this.checkAndCollapseSidebar();
	}

	checkAndCollapseSidebar() {
		if (this.leaf.width === 0 || this.leaf.height === 0) {
			return;
		}

		if (this.leaf.width < 768) {
			this.isSidebarCollapsed = true;
			this.sidebarComponent.setCollapsed(true);
			this.detailsComponent.setVisible(false);
		}
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
		this.contentComponent = new InboxComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin
		);
		this.addChild(this.contentComponent);
		this.contentComponent.load();

		// Create the forecast component (initially hidden)
		this.forecastComponent = new ForecastComponent(
			this.rootContainerEl,
			this.plugin.app
		);
		this.addChild(this.forecastComponent);
		this.forecastComponent.load();
		this.forecastComponent.containerEl.hide();

		// Create the tags component (initially hidden)
		this.tagsComponent = new TagsComponent(
			this.rootContainerEl,
			this.plugin.app
		);
		this.addChild(this.tagsComponent);
		this.tagsComponent.load();
		this.tagsComponent.containerEl.hide();

		// Create the projects component (initially hidden)
		this.projectsComponent = new ProjectsComponent(
			this.rootContainerEl,
			this.plugin.app
		);
		this.addChild(this.projectsComponent);
		this.projectsComponent.load();
		this.projectsComponent.containerEl.hide();

		// Create the review component (initially hidden)
		this.reviewComponent = new ReviewComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin
		);
		this.addChild(this.reviewComponent);
		this.reviewComponent.load();
		this.reviewComponent.containerEl.hide();

		// Create the details component
		this.detailsComponent = new TaskDetailsComponent(
			this.rootContainerEl,
			this.app,
			this.plugin
		);
		this.addChild(this.detailsComponent);
		this.detailsComponent.load();

		// Add toggle button to details

		// Set up component events
		this.setupComponentEvents();
	}

	private createSidebarToggle() {
		// Create toggle button for sidebar
		const toggleContainer = (
			this.headerEl.find(".view-header-nav-buttons") as HTMLElement
		)?.createDiv({
			cls: "panel-toggle-container",
		});

		this.sidebarToggleBtn = toggleContainer.createDiv({
			cls: "panel-toggle-btn",
		});
		new ButtonComponent(this.sidebarToggleBtn)
			.setIcon("panel-left-dashed")
			.setTooltip(t("Toggle Sidebar"))
			.setClass("clickable-icon")
			.onClick(() => {
				this.toggleSidebar();
			});
	}

	private createActionButtons() {
		this.detailsToggleBtn = this.addAction(
			"panel-right-dashed",
			t("Details"),
			() => {
				this.toggleDetailsVisibility(!this.isDetailsVisible);
			}
		);

		this.detailsToggleBtn.toggleClass("panel-toggle-btn", true);

		this.addAction("check-square", t("Capture"), () => {
			const modal = new QuickCaptureModal(
				this.plugin.app,
				this.plugin,
				{},
				true
			);
			modal.open();
		});
	}

	onPaneMenu(menu: Menu) {
		menu.addItem((item) => {
			item.setTitle("Settings");
			item.setIcon("gear");
			item.onClick(() => {
				this.app.setting.open();
				this.app.setting.openTabById(this.plugin.manifest.id);
			});
		});

		return menu;
	}

	private toggleSidebar() {
		this.isSidebarCollapsed = !this.isSidebarCollapsed;
		this.rootContainerEl.toggleClass(
			"sidebar-collapsed",
			this.isSidebarCollapsed
		);

		// Update sidebar component state
		this.sidebarComponent.setCollapsed(this.isSidebarCollapsed);
	}

	private toggleDetailsVisibility(visible: boolean) {
		this.isDetailsVisible = visible;
		this.rootContainerEl.toggleClass("details-visible", visible);
		this.rootContainerEl.toggleClass("details-hidden", !visible);

		// Update details component state
		this.detailsComponent.setVisible(visible);

		// Clear selected task ID if panel is hidden
		if (!visible) {
			this.currentSelectedTaskId = null;
		}
	}

	private setupComponentEvents() {
		// Handle task selection from content area
		this.contentComponent.onTaskSelected = (task: Task) => {
			this.handleTaskSelection(task);
		};

		this.contentComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		// Handle task completion toggle from details panel
		this.detailsComponent.onTaskToggleComplete = (task) => {
			this.toggleTaskCompletion(task);
		};

		// Handle task edit from details panel
		this.detailsComponent.onTaskEdit = (task) => {
			this.editTask(task);
		};

		// Handle task updates from the details panel
		this.detailsComponent.onTaskUpdate = async (
			originalTask,
			updatedTask
		) => {
			await this.updateTask(originalTask, updatedTask);
		};

		// Handle project selection from sidebar
		this.sidebarComponent.onProjectSelected = (project: string) => {
			// Set projects view mode with the selected project
			this.currentViewMode = "projects";
			// Hide other components and show projects component
			this.contentComponent.containerEl.hide();
			this.forecastComponent.containerEl.hide();
			this.tagsComponent.containerEl.hide();
			this.projectsComponent.containerEl.show();
			// Initialize projects component with the selected project
			this.projectsComponent.setTasks(this.tasks);
			// Manually select the project
			const projectItems =
				this.projectsComponent.containerEl.querySelectorAll(
					".project-list-item"
				);
			projectItems.forEach((item) => {
				const itemProject = item.getAttribute("data-project");
				if (itemProject === project) {
					// Simulate a click on the project item
					item.dispatchEvent(new MouseEvent("click"));
				}
			});
		};

		// Handle view mode changes from sidebar
		this.sidebarComponent.onViewModeChanged = (viewMode: ViewMode) => {
			this.currentViewMode = viewMode;

			// Hide all content components first
			this.contentComponent.containerEl.hide();
			this.forecastComponent.containerEl.hide();
			this.tagsComponent.containerEl.hide();
			this.projectsComponent.containerEl.hide();
			this.reviewComponent.containerEl.hide();

			// Toggle visibility of components based on view mode
			if (viewMode === "forecast") {
				this.forecastComponent.containerEl.show();
				this.forecastComponent.setTasks(this.tasks);
			} else if (viewMode === "tags") {
				this.tagsComponent.containerEl.show();
				this.tagsComponent.setTasks(this.tasks);
			} else if (viewMode === "projects") {
				this.projectsComponent.containerEl.show();
				this.projectsComponent.setTasks(this.tasks);
			} else if (viewMode === "review") {
				this.reviewComponent.containerEl.show();
				this.reviewComponent.setTasks(this.tasks);
				this.reviewComponent.refreshReviewSettings();
			} else {
				this.contentComponent.containerEl.show();
				this.contentComponent.setViewMode(viewMode);
			}

			this.app.saveLocalStorage("task-genius:view-mode", viewMode);
		};

		// Handle task selection from forecast view
		this.forecastComponent.onTaskSelected = (task: Task) => {
			this.handleTaskSelection(task);
		};

		// Handle task completion toggle from forecast view
		this.forecastComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		// Handle task selection from tags view
		this.tagsComponent.onTaskSelected = (task: Task) => {
			this.handleTaskSelection(task);
		};

		// Handle task completion toggle from tags view
		this.tagsComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		// Handle task selection from projects view
		this.projectsComponent.onTaskSelected = (task: Task) => {
			this.handleTaskSelection(task);
		};

		// Handle task completion toggle from projects view
		this.projectsComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		// Added event handlers for ReviewComponent
		this.reviewComponent.onTaskSelected = (task: Task) => {
			this.handleTaskSelection(task);
		};
		this.reviewComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		this.reviewComponent.onTaskContextMenu = (event, task) => {
			this.handleTaskContextMenu(event, task, this.currentViewMode);
		};

		this.tagsComponent.onTaskContextMenu = (event, task) => {
			this.handleTaskContextMenu(event, task, this.currentViewMode);
		};

		this.projectsComponent.onTaskContextMenu = (event, task) => {
			this.handleTaskContextMenu(event, task, this.currentViewMode);
		};

		this.forecastComponent.onTaskContextMenu = (event, task) => {
			this.handleTaskContextMenu(event, task, this.currentViewMode);
		};

		this.contentComponent.onTaskContextMenu = (event, task) => {
			this.handleTaskContextMenu(event, task, this.currentViewMode);
		};
	}

	private handleTaskContextMenu(
		event: MouseEvent,
		task: Task,
		viewMode: ViewMode
	) {
		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle(t("Complete"));
			item.setIcon("check-square");
			item.onClick(() => {
				this.toggleTaskCompletion(task);
			});
		})
			.addItem((item) => {
				item.setIcon("square-pen");
				item.setTitle(t("Switch status"));
				const submenu = item.setSubmenu();

				for (const status of Object.keys(
					this.plugin.settings.taskStatusMarks
				)) {
					const mark =
						this.plugin.settings.taskStatusMarks[
							status as keyof typeof this.plugin.settings.taskStatusMarks
						];
					submenu.addItem((item) => {
						item.titleEl.createEl(
							"span",
							{
								cls: "status-option-checkbox",
							},
							(el) => {
								createTaskCheckbox(mark, task, el);
							}
						);
						item.titleEl.createEl("span", {
							cls: "status-option",
							text: status,
						});
						item.onClick(() => {
							console.log("status", status, mark);
							this.updateTask(task, {
								...task,
								status: mark,
							});
						});
					});
				}
			})
			.addSeparator()
			.addItem((item) => {
				item.setTitle(t("Edit"));
				item.setIcon("pencil");
				item.onClick(() => {
					this.handleTaskSelection(task);
				});
			})
			.addItem((item) => {
				item.setTitle(t("Edit in File"));
				item.setIcon("pencil");
				item.onClick(() => {
					this.editTask(task);
				});
			});

		menu.showAtMouseEvent(event);
	}

	private handleTaskSelection(task: Task) {
		if (task) {
			const now = Date.now();
			const timeSinceLastToggle = now - this.lastToggleTimestamp;

			if (this.currentSelectedTaskId !== task.id) {
				this.currentSelectedTaskId = task.id;
				this.detailsComponent.showTaskDetails(task);
				this.toggleDetailsVisibility(true);
				this.lastToggleTimestamp = now; // Record timestamp for show
				return;
			}

			// If the same task is clicked and details are visible, hide details
			if (
				this.isDetailsVisible &&
				this.currentSelectedTaskId === task.id
			) {
				// Only hide if sufficient time has passed since the last toggle action
				// to prevent immediate closure after opening due to potential double events.
				if (timeSinceLastToggle > 100) {
					// 100ms threshold
					this.toggleDetailsVisibility(false);
					this.lastToggleTimestamp = now; // Record timestamp for hide
				} else {
					// Optional: Log ignored event for debugging
					// console.log("Ignoring rapid toggle-off event.");
				}
			} else {
				// Store the selected task ID *before* potentially showing the panel
				const previousSelectedTaskId = this.currentSelectedTaskId;
				this.currentSelectedTaskId = task.id;

				// Show details for the clicked task
				this.detailsComponent.showTaskDetails(task);

				// Toggle visibility to true if it wasn't already visible
				if (!this.isDetailsVisible) {
					this.toggleDetailsVisibility(true);
					this.lastToggleTimestamp = now; // Record timestamp for show
				} else if (previousSelectedTaskId !== task.id) {
					// Optional: Update timestamp if different task selected while visible
					// this.lastToggleTimestamp = now;
				}
			}
		}
	}

	private async loadTasks() {
		// Get active task manager from plugin
		const taskManager = (this.plugin as TaskProgressBarPlugin).taskManager;
		if (!taskManager) return;

		// Get all tasks
		this.tasks = taskManager.getAllTasks();
		this.triggerViewUpdate();
	}

	private async triggerViewUpdate() {
		this.contentComponent.setTasks(this.tasks);
		this.forecastComponent.setTasks(this.tasks);
		this.tagsComponent.setTasks(this.tasks);
		this.projectsComponent.setTasks(this.tasks);
		this.reviewComponent.setTasks(this.tasks);

		// Refresh review settings if the review view is currently active
		// (or maybe always refresh settings data?)
		if (this.currentViewMode === "review") {
			this.reviewComponent.refreshReviewSettings();
		}
	}

	private async toggleTaskCompletion(task: Task) {
		// Clone the task to avoid direct mutation
		const updatedTask = { ...task, completed: !task.completed };

		if (updatedTask.completed) {
			updatedTask.completedDate = Date.now();
		} else {
			updatedTask.completedDate = undefined;
		}

		console.log("toggleTaskCompletion", updatedTask);

		// Get active task manager from plugin
		const taskManager = (this.plugin as TaskProgressBarPlugin).taskManager;
		console.log("taskManager", taskManager);
		if (!taskManager) return;

		// Update the task
		await taskManager.updateTask(updatedTask);

		// Update the task in all components
		this.contentComponent.updateTask(updatedTask);
		switch (this.currentViewMode) {
			case "inbox":
				this.contentComponent.updateTask(updatedTask);
				break;
			case "forecast":
				this.forecastComponent.updateTask(updatedTask);
				break;
			case "projects":
				this.projectsComponent.updateTask(updatedTask);
				break;
			case "review":
				this.reviewComponent.updateTask(updatedTask);
				break;
		}
		// If this is the currently selected task, update details
		const selectedTask = this.contentComponent.getSelectedTask();
		if (selectedTask && selectedTask.id === updatedTask.id) {
			this.detailsComponent.showTaskDetails(updatedTask);
		}
	}

	private async updateTask(originalTask: Task, updatedTask: Task) {
		// Get active task manager from plugin
		const taskManager = (this.plugin as TaskProgressBarPlugin).taskManager;
		if (!taskManager) {
			throw new Error("Task manager not available");
		}

		console.log("updateTask", originalTask, updatedTask);

		// Update the task
		await taskManager.updateTask(updatedTask);

		// Update the task in all components
		this.contentComponent.updateTask(updatedTask);
		switch (this.currentViewMode) {
			case "inbox":
				this.contentComponent.updateTask(updatedTask);
				break;
			case "forecast":
				this.forecastComponent.updateTask(updatedTask);
				break;
			case "projects":
				this.projectsComponent.updateTask(updatedTask);
				break;
			case "review":
				this.reviewComponent.updateTask(updatedTask);
				break;
		}

		return updatedTask;
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
