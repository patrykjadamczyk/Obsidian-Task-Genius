import {
	ItemView,
	WorkspaceLeaf,
	TFile,
	Plugin,
	setIcon,
	ExtraButtonComponent,
	ButtonComponent,
	Menu,
	Scope,
	// FrontmatterCache,
} from "obsidian";
import { Task } from "../utils/types/TaskIndex";
// Removed SidebarComponent import
import { ContentComponent } from "../components/task-view/content";
import { ForecastComponent } from "../components/task-view/forecast";
import { TagsComponent } from "../components/task-view/tags";
import { ProjectsComponent } from "../components/task-view/projects";
import { ReviewComponent } from "../components/task-view/review";
import {
	TaskDetailsComponent,
	createTaskCheckbox,
} from "../components/task-view/details";
import "../styles/view.css";
import TaskProgressBarPlugin from "../index";
import { QuickCaptureModal } from "../components/QuickCaptureModal";
import { t } from "../translations/helper";
import {
	getViewSettingOrDefault,
	ViewMode,
	DEFAULT_SETTINGS,
	TwoColumnSpecificConfig,
} from "../common/setting-definition";
import { filterTasks } from "../utils/TaskFilterUtils";
import { CalendarComponent, CalendarEvent } from "../components/calendar";
import { KanbanComponent } from "../components/kanban/kanban";
import { GanttComponent } from "../components/gantt/gantt";
import { TaskPropertyTwoColumnView } from "../components/task-view/TaskPropertyTwoColumnView";

export const TASK_SPECIFIC_VIEW_TYPE = "task-genius-specific-view";

interface TaskSpecificViewState {
	viewId: ViewMode;
	project?: string | null;
}

export class TaskSpecificView extends ItemView {
	// Main container elements
	private rootContainerEl: HTMLElement;

	// Component references (Sidebar removed)
	private contentComponent: ContentComponent;
	private forecastComponent: ForecastComponent;
	private tagsComponent: TagsComponent;
	private projectsComponent: ProjectsComponent;
	private reviewComponent: ReviewComponent;
	private detailsComponent: TaskDetailsComponent;
	private calendarComponent: CalendarComponent;
	private kanbanComponent: KanbanComponent;
	private ganttComponent: GanttComponent;
	// Custom view components by view ID
	private twoColumnViewComponents: Map<string, TaskPropertyTwoColumnView> =
		new Map();
	// UI state management (Sidebar state removed)
	private isDetailsVisible: boolean = false;
	private detailsToggleBtn: HTMLElement;
	private currentViewId: ViewMode = "inbox"; // Default or loaded from state
	private currentProject?: string | null;
	private currentSelectedTaskId: string | null = null;
	private currentSelectedTaskDOM: HTMLElement | null = null;
	private lastToggleTimestamp: number = 0;

	private tabActionButton: HTMLElement;

	// Data management
	tasks: Task[] = [];

	constructor(leaf: WorkspaceLeaf, private plugin: TaskProgressBarPlugin) {
		super(leaf);

		this.tasks = this.plugin.preloadedTasks;

		this.scope = new Scope(this.app.scope);

		this.scope?.register(null, "escape", (e) => {
			e.preventDefault();
			e.stopPropagation();
		});
	}

	// New State Management Methods
	getState(): Record<string, unknown> {
		const state = super.getState();
		return {
			...state,
			viewId: this.currentViewId,
			project: this.currentProject,
		};
	}

	async setState(state: unknown, result: any) {
		await super.setState(state, result);

		if (state && typeof state === "object") {
			const specificState = state as TaskSpecificViewState;

			this.currentViewId = specificState?.viewId || "inbox";
			this.currentProject = specificState?.project;
			console.log("TaskSpecificView setState:", specificState);

			if (!this.rootContainerEl) {
				this.app.workspace.onLayoutReady(() => {
					if (this.currentViewId) {
						this.switchView(
							this.currentViewId,
							this.currentProject
						);
					}
				});
			} else if (this.currentViewId) {
				this.switchView(this.currentViewId, this.currentProject);
			}
		}
	}

	getViewType(): string {
		return TASK_SPECIFIC_VIEW_TYPE;
	}

	getDisplayText(): string {
		const currentViewConfig = getViewSettingOrDefault(
			this.plugin,
			this.currentViewId
		);
		// Potentially add project name if relevant for 'projects' view?
		return currentViewConfig.name;
	}

	getIcon(): string {
		const currentViewConfig = getViewSettingOrDefault(
			this.plugin,
			this.currentViewId
		);
		return currentViewConfig.icon;
	}

	async onOpen() {
		this.contentEl.toggleClass("task-genius-view", true);
		this.contentEl.toggleClass("task-genius-specific-view", true);
		this.rootContainerEl = this.contentEl.createDiv({
			cls: "task-genius-container no-sidebar",
		});

		// Load tasks first
		this.tasks = this.plugin.preloadedTasks;

		this.initializeComponents();

		// Retrieve initial view state
		const state = this.leaf.getViewState().state as any;
		const specificState = state as unknown as TaskSpecificViewState;
		console.log("TaskSpecificView initial state:", specificState);
		this.currentViewId = specificState?.viewId || "inbox"; // Fallback if state is missing
		this.currentProject = specificState?.project;

		// Initial view switch based on state
		this.switchView(this.currentViewId, this.currentProject);

		this.toggleDetailsVisibility(false);

		this.createActionButtons(); // Keep details toggle and quick capture

		// Header modifications (if needed, similar to TaskView)
		(this.leaf.tabHeaderStatusContainerEl as HTMLElement)?.empty();
		(this.leaf.tabHeaderEl as HTMLElement)?.toggleClass(
			"task-genius-tab-header",
			true
		);
		this.tabActionButton = (
			this.leaf.tabHeaderStatusContainerEl as HTMLElement
		)?.createEl(
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

		if (this.tabActionButton) {
			this.register(() => {
				this.tabActionButton.detach();
			});
		}

		this.triggerViewUpdate(); // Load tasks into the active view

		// No sidebar check needed
		// this.checkAndCollapseSidebar();

		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.workspace.on(
					"task-genius:task-cache-updated",
					async () => {
						await this.loadTasks();
					}
				)
			);
		});

		// No command registration needed as this view is opened programmatically
	}

	// Removed onResize and checkAndCollapseSidebar methods

	private initializeComponents() {
		// No SidebarComponent initialization
		// No createSidebarToggle call

		this.contentComponent = new ContentComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin,
			{
				onTaskSelected: (task: Task | null) => {
					this.handleTaskSelection(task);
				},
				onTaskCompleted: (task: Task) => {
					this.toggleTaskCompletion(task);
				},
				onTaskContextMenu: (event: MouseEvent, task: Task) => {
					this.handleTaskContextMenu(event, task);
				},
			}
		);
		this.addChild(this.contentComponent);
		this.contentComponent.load();

		this.forecastComponent = new ForecastComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin,
			{
				onTaskSelected: (task: Task | null) => {
					this.handleTaskSelection(task);
				},
				onTaskCompleted: (task: Task) => {
					this.toggleTaskCompletion(task);
				},
				onTaskContextMenu: (event: MouseEvent, task: Task) => {
					this.handleTaskContextMenu(event, task);
				},
			}
		);
		this.addChild(this.forecastComponent);
		this.forecastComponent.load();
		this.forecastComponent.containerEl.hide();

		this.tagsComponent = new TagsComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin,
			{
				onTaskSelected: (task: Task | null) => {
					this.handleTaskSelection(task);
				},
				onTaskCompleted: (task: Task) => {
					this.toggleTaskCompletion(task);
				},
				onTaskContextMenu: (event: MouseEvent, task: Task) => {
					this.handleTaskContextMenu(event, task);
				},
			}
		);
		this.addChild(this.tagsComponent);
		this.tagsComponent.load();
		this.tagsComponent.containerEl.hide();

		this.projectsComponent = new ProjectsComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin,
			{
				onTaskSelected: (task: Task | null) => {
					this.handleTaskSelection(task);
				},
				onTaskCompleted: (task: Task) => {
					this.toggleTaskCompletion(task);
				},
				onTaskContextMenu: (event: MouseEvent, task: Task) => {
					this.handleTaskContextMenu(event, task);
				},
			}
		);
		this.addChild(this.projectsComponent);
		this.projectsComponent.load();
		this.projectsComponent.containerEl.hide();

		this.reviewComponent = new ReviewComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin,
			{
				onTaskSelected: (task: Task | null) => {
					this.handleTaskSelection(task);
				},
				onTaskCompleted: (task: Task) => {
					this.toggleTaskCompletion(task);
				},
				onTaskContextMenu: (event: MouseEvent, task: Task) => {
					this.handleTaskContextMenu(event, task);
				},
			}
		);
		this.addChild(this.reviewComponent);
		this.reviewComponent.load();
		this.reviewComponent.containerEl.hide();

		this.calendarComponent = new CalendarComponent(
			this.plugin.app,
			this.plugin,
			this.rootContainerEl,
			this.tasks,
			{
				onTaskSelected: (task: Task | null) => {
					this.handleTaskSelection(task);
				},
				onTaskCompleted: (task: Task) => {
					this.toggleTaskCompletion(task);
				},
				onEventContextMenu: (ev: MouseEvent, event: CalendarEvent) => {
					this.handleTaskContextMenu(ev, event);
				},
			}
		);
		this.addChild(this.calendarComponent);
		this.calendarComponent.load();
		this.calendarComponent.containerEl.hide();

		// Initialize KanbanComponent
		this.kanbanComponent = new KanbanComponent(
			this.app,
			this.plugin,
			this.rootContainerEl,
			this.tasks || [],
			{
				onTaskStatusUpdate:
					this.handleKanbanTaskStatusUpdate.bind(this),
				onTaskSelected: this.handleTaskSelection.bind(this),
				onTaskCompleted: this.toggleTaskCompletion.bind(this),
				onTaskContextMenu: this.handleTaskContextMenu.bind(this),
			}
		);
		this.addChild(this.kanbanComponent);
		this.kanbanComponent.containerEl.hide();

		this.ganttComponent = new GanttComponent(
			this.plugin,
			this.rootContainerEl,
			{
				onTaskSelected: this.handleTaskSelection.bind(this),
				onTaskCompleted: this.toggleTaskCompletion.bind(this),
				onTaskContextMenu: this.handleTaskContextMenu.bind(this),
			}
		);
		this.addChild(this.ganttComponent);
		this.ganttComponent.containerEl.hide();

		this.detailsComponent = new TaskDetailsComponent(
			this.rootContainerEl,
			this.app,
			this.plugin
		);
		this.addChild(this.detailsComponent);
		this.detailsComponent.load();

		this.setupComponentEvents();
	}

	// Removed createSidebarToggle

	private createActionButtons() {
		this.detailsToggleBtn = this.addAction(
			"panel-right-dashed",
			t("Details"),
			() => {
				this.toggleDetailsVisibility(!this.isDetailsVisible);
			}
		);

		this.detailsToggleBtn.toggleClass("panel-toggle-btn", true);
		this.detailsToggleBtn.toggleClass("is-active", this.isDetailsVisible);

		// Keep quick capture button
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
		// Keep settings item
		menu.addItem((item) => {
			item.setTitle(t("Settings"));
			item.setIcon("gear");
			item.onClick(() => {
				this.app.setting.open();
				this.app.setting.openTabById(this.plugin.manifest.id);

				this.plugin.settingTab.openTab("view-settings");
			});
		});
		// Add specific view actions if needed in the future
		return menu;
	}

	// Removed toggleSidebar

	private toggleDetailsVisibility(visible: boolean) {
		this.isDetailsVisible = visible;
		this.rootContainerEl.toggleClass("details-visible", visible);
		this.rootContainerEl.toggleClass("details-hidden", !visible);

		this.detailsComponent.setVisible(visible);
		if (this.detailsToggleBtn) {
			this.detailsToggleBtn.toggleClass("is-active", visible);
			this.detailsToggleBtn.setAttribute(
				"aria-label",
				visible ? t("Hide Details") : t("Show Details")
			);
		}

		if (!visible) {
			this.currentSelectedTaskId = null;
		}
	}

	private setupComponentEvents() {
		// No sidebar event handlers
		this.detailsComponent.onTaskToggleComplete = (task: Task) =>
			this.toggleTaskCompletion(task);

		// Details component handlers
		this.detailsComponent.onTaskEdit = (task: Task) => this.editTask(task);
		this.detailsComponent.onTaskUpdate = async (
			originalTask: Task,
			updatedTask: Task
		) => {
			await this.updateTask(originalTask, updatedTask);
		};
		this.detailsComponent.toggleDetailsVisibility = (visible: boolean) => {
			this.toggleDetailsVisibility(visible);
		};

		// No sidebar component handlers needed
	}

	private switchView(viewId: ViewMode, project?: string | null) {
		// Hide all components first
		this.contentComponent.containerEl.hide();
		this.forecastComponent.containerEl.hide();
		this.tagsComponent.containerEl.hide();
		this.projectsComponent.containerEl.hide();
		this.reviewComponent.containerEl.hide();
		// Hide any visible TwoColumnView components
		this.twoColumnViewComponents.forEach((component) => {
			component.containerEl.hide();
		});

		this.calendarComponent.containerEl.hide();
		this.kanbanComponent.containerEl.hide();
		this.ganttComponent.containerEl.hide();

		let targetComponent: any = null;
		let modeForComponent: ViewMode = viewId;

		// Get view configuration to check for specific view types
		const viewConfig = getViewSettingOrDefault(this.plugin, viewId);

		// Handle TwoColumn views
		if (viewConfig.specificConfig?.viewType === "twocolumn") {
			// Get or create TwoColumnView component
			if (!this.twoColumnViewComponents.has(viewId)) {
				// Create a new TwoColumnView component
				const twoColumnConfig =
					viewConfig.specificConfig as TwoColumnSpecificConfig;
				const twoColumnComponent = new TaskPropertyTwoColumnView(
					this.rootContainerEl,
					this.app,
					this.plugin,
					twoColumnConfig,
					viewId
				);
				this.addChild(twoColumnComponent);

				// Set up event handlers
				twoColumnComponent.onTaskSelected = (task) => {
					this.handleTaskSelection(task);
				};
				twoColumnComponent.onTaskCompleted = (task) => {
					this.toggleTaskCompletion(task);
				};
				twoColumnComponent.onTaskContextMenu = (event, task) => {
					this.handleTaskContextMenu(event, task);
				};

				// Store for later use
				this.twoColumnViewComponents.set(viewId, twoColumnComponent);
			}

			// Get the component to display
			targetComponent = this.twoColumnViewComponents.get(viewId);
		} else {
			// Standard view types
			switch (viewId) {
				case "forecast":
					targetComponent = this.forecastComponent;
					break;
				case "tags":
					targetComponent = this.tagsComponent;
					break;
				case "projects":
					targetComponent = this.projectsComponent;
					break;
				case "review":
					targetComponent = this.reviewComponent;
					break;
				case "calendar":
					targetComponent = this.calendarComponent;
					break;
				case "kanban":
					targetComponent = this.kanbanComponent;
					break;
				case "gantt":
					targetComponent = this.ganttComponent;
					break;
				case "inbox":
				case "flagged":
				default:
					targetComponent = this.contentComponent;
					modeForComponent = viewId;
					break;
			}
		}

		if (targetComponent) {
			console.log(
				`TaskSpecificView activating component for view ${viewId}`,
				targetComponent.constructor.name
			);
			targetComponent.containerEl.show();

			// Ensure tasks are loaded/filtered for the specific view
			const filteredTasks = filterTasks(this.tasks, viewId, this.plugin);
			if (typeof targetComponent.setTasks === "function") {
				targetComponent.setTasks(filteredTasks);
			}

			if (typeof targetComponent.setViewMode === "function") {
				console.log(
					`TaskSpecificView setting view mode for ${viewId} to ${modeForComponent} with project ${project}`
				);
				targetComponent.setViewMode(modeForComponent, project);
			}

			// Handle TwoColumnView task update specifically
			this.twoColumnViewComponents.forEach((component, id) => {
				if (
					id === viewId && // Only update the *current* two-column view
					component &&
					typeof component.setTasks === "function"
				) {
					component.setTasks(
						filterTasks(
							this.tasks,
							component.getViewId(),
							this.plugin
						)
					);
				}
			});

			if (
				viewId === "review" &&
				typeof targetComponent.refreshReviewSettings === "function"
			) {
				targetComponent.refreshReviewSettings();
			}
		} else {
			console.warn(
				`TaskSpecificView: No target component found for viewId: ${viewId}`
			);
		}

		// Don't save to local storage as state is managed by the leaf
		// this.app.saveLocalStorage("task-genius:view-mode", viewId);

		this.updateHeaderDisplay();
		this.handleTaskSelection(null); // Deselect task on view switch

		// Update tab icon/title
		if (this.leaf.tabHeaderInnerIconEl) {
			setIcon(this.leaf.tabHeaderInnerIconEl, this.getIcon());
		}
		if (this.leaf.tabHeaderInnerTitleEl) {
			this.leaf.tabHeaderInnerTitleEl.setText(this.getDisplayText());
		}
		if (this.titleEl) {
			// Also update the view title element itself
			this.titleEl.setText(this.getDisplayText());
		}
	}

	private updateHeaderDisplay() {
		const config = getViewSettingOrDefault(this.plugin, this.currentViewId);
		// Use the actual currentViewId for the header
		this.leaf.setEphemeralState({ title: config.name, icon: config.icon });
	}

	private handleTaskContextMenu(event: MouseEvent, task: Task) {
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
							if (!task.completed && mark.toLowerCase() === "x") {
								task.completedDate = Date.now();
							} else {
								task.completedDate = undefined;
							}
							this.updateTask(task, {
								...task,
								status: mark,
								completed:
									mark.toLowerCase() === "x" ? true : false,
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
					this.handleTaskSelection(task); // Open details view for editing
				});
			})
			.addItem((item) => {
				item.setTitle(t("Edit in File"));
				item.setIcon("file-edit"); // Changed icon slightly
				item.onClick(() => {
					this.editTask(task);
				});
			});

		menu.showAtMouseEvent(event);
	}

	private handleTaskSelection(task: Task | null) {
		if (task) {
			const now = Date.now();
			const timeSinceLastToggle = now - this.lastToggleTimestamp;

			if (this.currentSelectedTaskId !== task.id) {
				this.currentSelectedTaskId = task.id;
				this.detailsComponent.showTaskDetails(task);
				if (!this.isDetailsVisible) {
					this.toggleDetailsVisibility(true);
				}
				this.lastToggleTimestamp = now;
				return;
			}

			// Toggle details visibility on double-click/re-click
			if (timeSinceLastToggle > 150) {
				// Debounce slightly
				this.toggleDetailsVisibility(!this.isDetailsVisible);
				this.lastToggleTimestamp = now;
			}
		} else {
			// Deselecting task explicitly
			this.toggleDetailsVisibility(false);
			this.currentSelectedTaskId = null;
		}
	}

	private async loadTasks() {
		const taskManager = this.plugin.taskManager;
		if (!taskManager) return;

		this.tasks = taskManager.getAllTasks();
		console.log(`TaskSpecificView loaded ${this.tasks.length} tasks`);
		await this.triggerViewUpdate();
	}

	public async triggerViewUpdate() {
		// Simplified: just switch to the current view again to refresh tasks
		if (this.currentViewId) {
			this.switchView(this.currentViewId, this.currentProject);
		} else {
			console.warn(
				"TaskSpecificView: Cannot trigger update, currentViewId is not set."
			);
		}
	}

	private async toggleTaskCompletion(task: Task) {
		const updatedTask = { ...task, completed: !task.completed };

		if (updatedTask.completed) {
			updatedTask.completedDate = Date.now();
			const completedMark = (
				this.plugin.settings.taskStatuses.completed || "x"
			).split("|")[0];
			if (updatedTask.status !== completedMark) {
				updatedTask.status = completedMark;
			}
		} else {
			updatedTask.completedDate = undefined;
			const notStartedMark =
				this.plugin.settings.taskStatuses.notStarted || " ";
			if (updatedTask.status.toLowerCase() === "x") {
				// Only revert if it was the completed mark
				updatedTask.status = notStartedMark;
			}
		}

		const taskManager = this.plugin.taskManager;
		if (!taskManager) return;

		await taskManager.updateTask(updatedTask);
		// Task cache listener will trigger loadTasks -> triggerViewUpdate
	}

	private async updateTask(
		originalTask: Task,
		updatedTask: Task
	): Promise<Task> {
		const taskManager = this.plugin.taskManager;
		if (!taskManager) {
			console.error("Task manager not available for updateTask");
			throw new Error("Task manager not available");
		}
		try {
			await taskManager.updateTask(updatedTask);
			console.log(`Task ${updatedTask.id} updated successfully.`);

			// Update task in local list immediately for responsiveness
			const index = this.tasks.findIndex((t) => t.id === originalTask.id);
			if (index !== -1) {
				this.tasks[index] = updatedTask;
			} else {
				console.warn(
					"Updated task not found in local list, might reload fully later."
				);
				// Optionally force a full reload if this happens often
				// await this.loadTasks();
				// return updatedTask; // Return early if we reloaded
			}

			// If the updated task is the currently selected one, refresh details view
			if (this.currentSelectedTaskId === updatedTask.id) {
				this.detailsComponent.showTaskDetails(updatedTask);
			}

			// Re-filter and update the current view component
			this.triggerViewUpdate();

			return updatedTask;
		} catch (error) {
			console.error(`Failed to update task ${originalTask.id}:`, error);
			// Potentially add user notification here
			throw error;
		}
	}

	private async editTask(task: Task) {
		const file = this.app.vault.getAbstractFileByPath(task.filePath);
		if (!(file instanceof TFile)) return;

		// Prefer activating existing leaf if file is open
		const existingLeaf = this.app.workspace
			.getLeavesOfType("markdown")
			.find(
				(leaf) => (leaf.view as any).file === file // Type assertion needed here
			);

		const leafToUse = existingLeaf || this.app.workspace.getLeaf("tab"); // Open in new tab if not open

		await leafToUse.openFile(file, {
			active: true, // Ensure the leaf becomes active
			eState: {
				line: task.line,
			},
		});
		// Focus the editor after opening
		this.app.workspace.setActiveLeaf(leafToUse, { focus: true });
	}

	async onClose() {
		// Cleanup TwoColumnView components
		this.twoColumnViewComponents.forEach((component) => {
			this.removeChild(component);
		});
		this.twoColumnViewComponents.clear();

		this.unload(); // This callsremoveChild on all direct children automatically
		if (this.rootContainerEl) {
			this.rootContainerEl.empty();
			this.rootContainerEl.detach();
		}
		console.log("TaskSpecificView closed");
	}

	onSettingsUpdate() {
		console.log("TaskSpecificView received settings update notification.");
		// No sidebar to update
		// Re-trigger view update to reflect potential setting changes (e.g., filters, status marks)
		this.triggerViewUpdate();
		this.updateHeaderDisplay(); // Update icon/title if changed
	}

	// Method to handle status updates originating from Kanban drag-and-drop
	private handleKanbanTaskStatusUpdate = async (
		taskId: string,
		newStatusMark: string
	) => {
		console.log(
			`TaskSpecificView handling Kanban status update request for ${taskId} to mark ${newStatusMark}`
		);
		const taskToUpdate = this.tasks.find((t) => t.id === taskId);

		if (taskToUpdate) {
			const isCompleted =
				newStatusMark.toLowerCase() ===
				(this.plugin.settings.taskStatuses.completed || "x")
					.split("|")[0]
					.toLowerCase();
			const completedDate = isCompleted ? Date.now() : undefined;

			if (
				taskToUpdate.status !== newStatusMark ||
				taskToUpdate.completed !== isCompleted
			) {
				try {
					// Use updateTask to ensure consistency and UI updates
					await this.updateTask(taskToUpdate, {
						...taskToUpdate,
						status: newStatusMark,
						completed: isCompleted,
						completedDate: completedDate,
					});
					console.log(
						`Task ${taskId} status update processed by TaskSpecificView.`
					);
				} catch (error) {
					console.error(
						`TaskSpecificView failed to update task status from Kanban callback for task ${taskId}:`,
						error
					);
				}
			} else {
				console.log(
					`Task ${taskId} status (${newStatusMark}) already matches, no update needed.`
				);
			}
		} else {
			console.warn(
				`TaskSpecificView could not find task with ID ${taskId} for Kanban status update.`
			);
		}
	};
}
