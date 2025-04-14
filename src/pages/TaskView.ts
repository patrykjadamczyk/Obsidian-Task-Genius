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
import { SidebarComponent } from "../components/task-view/sidebar";
import { ContentComponent } from "../components/task-view/content";
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
import {
	getViewSettingOrDefault,
	ViewMode,
	DEFAULT_SETTINGS,
} from "../common/setting-definition";
import { filterTasks } from "src/utils/taskFIlterUtils";

export const TASK_VIEW_TYPE = "task-genius-view";

export class TaskView extends ItemView {
	// Main container elements
	private rootContainerEl: HTMLElement;

	// Component references
	private sidebarComponent: SidebarComponent;
	private contentComponent: ContentComponent;
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
	private currentViewId: ViewMode = "inbox";
	private currentSelectedTaskId: string | null = null;
	private currentSelectedTaskDOM: HTMLElement | null = null;
	private lastToggleTimestamp: number = 0;

	// Data management
	tasks: Task[] = [];

	constructor(leaf: WorkspaceLeaf, private plugin: TaskProgressBarPlugin) {
		super(leaf);

		this.tasks = this.plugin.preloadedTasks;
	}

	getViewType(): string {
		return TASK_VIEW_TYPE;
	}

	getDisplayText(): string {
		const currentViewConfig = getViewSettingOrDefault(
			this.plugin,
			this.currentViewId
		);
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
		this.rootContainerEl = this.contentEl.createDiv({
			cls: "task-genius-container",
		});

		this.initializeComponents();

		const savedViewId = this.app.loadLocalStorage(
			"task-genius:view-mode"
		) as ViewMode;
		const initialViewId = this.plugin.settings.viewConfiguration.find(
			(v) => v.id === savedViewId && v.visible
		)
			? savedViewId
			: this.plugin.settings.viewConfiguration.find((v) => v.visible)
					?.id || "inbox";

		this.currentViewId = initialViewId;
		this.sidebarComponent.setViewMode(this.currentViewId);
		this.switchView(this.currentViewId);

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

		this.tasks = this.plugin.preloadedTasks;
		this.triggerViewUpdate();

		this.checkAndCollapseSidebar();

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
		} else {
		}
	}

	private initializeComponents() {
		this.sidebarComponent = new SidebarComponent(
			this.rootContainerEl,
			this.plugin
		);
		this.addChild(this.sidebarComponent);
		this.sidebarComponent.load();

		this.createSidebarToggle();

		this.contentComponent = new ContentComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin
		);
		this.addChild(this.contentComponent);
		this.contentComponent.load();

		this.forecastComponent = new ForecastComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin
		);
		this.addChild(this.forecastComponent);
		this.forecastComponent.load();
		this.forecastComponent.containerEl.hide();

		this.tagsComponent = new TagsComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin
		);
		this.addChild(this.tagsComponent);
		this.tagsComponent.load();
		this.tagsComponent.containerEl.hide();

		this.projectsComponent = new ProjectsComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin
		);
		this.addChild(this.projectsComponent);
		this.projectsComponent.load();
		this.projectsComponent.containerEl.hide();

		this.reviewComponent = new ReviewComponent(
			this.rootContainerEl,
			this.plugin.app,
			this.plugin
		);
		this.addChild(this.reviewComponent);
		this.reviewComponent.load();
		this.reviewComponent.containerEl.hide();

		this.detailsComponent = new TaskDetailsComponent(
			this.rootContainerEl,
			this.app,
			this.plugin
		);
		this.addChild(this.detailsComponent);
		this.detailsComponent.load();

		this.setupComponentEvents();
	}

	private createSidebarToggle() {
		const toggleContainer = (
			this.headerEl.find(".view-header-nav-buttons") as HTMLElement
		)?.createDiv({
			cls: "panel-toggle-container",
		});

		if (!toggleContainer) {
			console.error(
				"Could not find .view-header-nav-buttons to add sidebar toggle."
			);
			return;
		}

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
		this.detailsToggleBtn.toggleClass("is-active", this.isDetailsVisible);

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

		this.sidebarComponent.setCollapsed(this.isSidebarCollapsed);
	}

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
		this.contentComponent.onTaskSelected = (task: Task | null) => {
			this.handleTaskSelection(task);
		};

		this.contentComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		this.detailsComponent.onTaskToggleComplete = (task) => {
			this.toggleTaskCompletion(task);
		};

		this.detailsComponent.onTaskEdit = (task) => {
			this.editTask(task);
		};

		this.detailsComponent.onTaskUpdate = async (
			originalTask,
			updatedTask
		) => {
			await this.updateTask(originalTask, updatedTask);
		};

		this.detailsComponent.toggleDetailsVisibility = (visible: boolean) => {
			this.toggleDetailsVisibility(visible);
		};

		this.sidebarComponent.onProjectSelected = (project: string) => {
			this.switchView("projects", project);
		};

		this.sidebarComponent.onViewModeChanged = (viewId: ViewMode) => {
			this.switchView(viewId);
		};

		this.forecastComponent.onTaskSelected = (task: Task | null) => {
			this.handleTaskSelection(task);
		};

		this.forecastComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		this.tagsComponent.onTaskSelected = (task: Task | null) => {
			this.handleTaskSelection(task);
		};

		this.tagsComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		this.projectsComponent.onTaskSelected = (task: Task | null) => {
			this.handleTaskSelection(task);
		};

		this.projectsComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		this.reviewComponent.onTaskSelected = (task: Task | null) => {
			this.handleTaskSelection(task);
		};
		this.reviewComponent.onTaskCompleted = (task: Task) => {
			this.toggleTaskCompletion(task);
		};

		const componentsWithContextMenu = [
			this.contentComponent,
			this.forecastComponent,
			this.tagsComponent,
			this.projectsComponent,
			this.reviewComponent,
		];

		componentsWithContextMenu.forEach((comp) => {
			if (comp && typeof comp.onTaskContextMenu === "function") {
				comp.onTaskContextMenu = (event, task) => {
					this.handleTaskContextMenu(event, task);
				};
			}
		});
	}

	private switchView(viewId: ViewMode, project?: string | null) {
		this.currentViewId = viewId;
		const viewConfig = getViewSettingOrDefault(this.plugin, viewId);

		this.contentComponent.containerEl.hide();
		this.forecastComponent.containerEl.hide();
		this.tagsComponent.containerEl.hide();
		this.projectsComponent.containerEl.hide();
		this.reviewComponent.containerEl.hide();

		let targetComponent: any = null;
		let modeForComponent: ViewMode = viewId;

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
			case "inbox":
			case "flagged":
			default:
				targetComponent = this.contentComponent;
				modeForComponent = viewId;
				break;
		}

		if (targetComponent) {
			targetComponent.containerEl.show();
			if (typeof targetComponent.setTasks === "function") {
				targetComponent.setTasks(
					filterTasks(this.tasks, viewId, this.plugin)
				);
			}
			if (typeof targetComponent.setViewMode === "function") {
				targetComponent.setViewMode(modeForComponent, project);
			}
			if (
				viewId === "review" &&
				typeof targetComponent.refreshReviewSettings === "function"
			) {
				targetComponent.refreshReviewSettings();
			}
		}

		this.app.saveLocalStorage("task-genius:view-mode", viewId);
		this.updateHeaderDisplay();
	}

	private updateHeaderDisplay() {
		const config = getViewSettingOrDefault(this.plugin, this.currentViewId);
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

			if (timeSinceLastToggle > 150) {
				this.toggleDetailsVisibility(!this.isDetailsVisible);
				this.lastToggleTimestamp = now;
			}
		} else {
			this.toggleDetailsVisibility(false);
			this.currentSelectedTaskId = null;
		}
	}

	private async loadTasks() {
		const taskManager = (this.plugin as TaskProgressBarPlugin).taskManager;
		if (!taskManager) return;

		this.tasks = taskManager.getAllTasks();
		console.log("current tasks", this.tasks.length);
		await this.triggerViewUpdate();
	}

	public async triggerViewUpdate() {
		this.switchView(this.currentViewId);
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
				updatedTask.status = notStartedMark;
			}
		}

		const taskManager = (this.plugin as TaskProgressBarPlugin).taskManager;
		if (!taskManager) return;

		await taskManager.updateTask(updatedTask);
	}

	private async updateTask(originalTask: Task, updatedTask: Task) {
		const taskManager = (this.plugin as TaskProgressBarPlugin).taskManager;
		if (!taskManager) {
			throw new Error("Task manager not available");
		}
		await taskManager.updateTask(updatedTask);

		if (this.currentSelectedTaskId === updatedTask.id) {
			this.detailsComponent.showTaskDetails(updatedTask);
		}

		return updatedTask;
	}

	private getActiveViewComponent(): any {
		switch (this.currentViewId) {
			case "forecast":
				return this.forecastComponent;
			case "tags":
				return this.tagsComponent;
			case "projects":
				return this.projectsComponent;
			case "review":
				return this.reviewComponent;
			default:
				return this.contentComponent;
		}
	}

	private async editTask(task: Task) {
		const file = this.app.vault.getAbstractFileByPath(task.filePath);
		if (!(file instanceof TFile)) return;

		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file);

		const editor = this.app.workspace.activeEditor?.editor;
		if (editor) {
			const line = Math.max(
				0,
				Math.min(task.line, editor.lineCount() - 1)
			);
			editor.setCursor({ line: line, ch: 0 });
			editor.scrollIntoView(
				{ from: { line: line, ch: 0 }, to: { line: line, ch: 0 } },
				true
			);
			editor.focus();
		}
	}

	async onClose() {
		this.unload();
		this.rootContainerEl.empty();
		this.rootContainerEl.detach();
	}

	onSettingsUpdate() {
		console.log("TaskView received settings update notification.");
		if (typeof this.sidebarComponent.renderSidebarItems === "function") {
			this.sidebarComponent.renderSidebarItems();
		} else {
			console.warn(
				"TaskView: SidebarComponent does not have renderSidebarItems method."
			);
		}
		this.switchView(this.currentViewId);
		this.updateHeaderDisplay();
	}
}
