import { App, Component } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import { TaskListItemComponent } from "./listItem";
import { TaskTreeItemComponent } from "./treeItem";
import { tasksToTree } from "../../utils/treeViewUtil";
import { t } from "../../translations/helper";

export class TaskListRendererComponent extends Component {
	private taskComponents: TaskListItemComponent[] = [];
	private treeComponents: TaskTreeItemComponent[] = [];

	// Event handlers to be set by the parent component
	public onTaskSelected: (task: Task) => void;
	public onTaskCompleted: (task: Task) => void;
	public onTaskContextMenu: (event: MouseEvent, task: Task) => void;

	constructor(
		private parent: Component, // Parent component to manage child lifecycle
		private containerEl: HTMLElement, // The HTML element to render tasks into
		private app: App,
		private context: string // Context identifier (e.g., "projects", "review")
	) {
		super();
		// Add this renderer as a child of the parent component
		parent.addChild(this);
	}

	/**
	 * Renders the list of tasks, clearing previous content by default.
	 * Can optionally append tasks instead of clearing.
	 * @param tasks - The list of tasks to render.
	 * @param isTreeView - Whether to render as a tree or a flat list.
	 * @param emptyMessage - Message to display if tasks array is empty.
	 * @param append - If true, appends tasks without clearing existing ones. Defaults to false.
	 */
	public renderTasks(
		tasks: Task[],
		isTreeView: boolean,
		emptyMessage: string = t("No tasks found."),
		append: boolean = false
	) {
		if (!append) {
			this.cleanupComponents();
			this.containerEl.empty();
		}

		if (tasks.length === 0 && !append) {
			// Only show empty state if not appending and tasks are empty
			this.renderEmptyState(emptyMessage);
			return;
		}

		if (isTreeView) {
			this.renderTreeView(tasks);
		} else {
			this.renderListView(tasks);
		}
	}

	private renderListView(tasks: Task[]) {
		const fragment = document.createDocumentFragment();
		tasks.forEach((task) => {
			const taskComponent = new TaskListItemComponent(
				task,
				this.context,
				this.app
			);

			// Set up event handlers
			taskComponent.onTaskSelected = (selectedTask) => {
				if (this.onTaskSelected) {
					this.onTaskSelected(selectedTask);
				}
			};
			taskComponent.onTaskCompleted = (completedTask) => {
				if (this.onTaskCompleted) {
					this.onTaskCompleted(completedTask);
				}
			};
			taskComponent.onTaskContextMenu = (event, task) => {
				if (this.onTaskContextMenu) {
					this.onTaskContextMenu(event, task);
				}
			};

			// Load component and add to parent's children
			this.parent.addChild(taskComponent);
			taskComponent.load();

			// Add element to fragment
			fragment.appendChild(taskComponent.element);

			// Store for later cleanup
			this.taskComponents.push(taskComponent);
		});
		this.containerEl.appendChild(fragment);
	}

	private renderTreeView(tasks: Task[]) {
		const fragment = document.createDocumentFragment();
		const rootTasks = tasksToTree(tasks);
		const taskMap = new Map<string, Task>();
		tasks.forEach((task) => taskMap.set(task.id, task));

		rootTasks.forEach((rootTask) => {
			// Find direct children using the provided tasks array
			const childTasks = tasks.filter(
				(task) => task.parent === rootTask.id
			);

			const treeComponent = new TaskTreeItemComponent(
				rootTask,
				this.context,
				this.app,
				0, // Initial level
				childTasks, // Direct children relevant to the current filtered view
				taskMap // Map of all tasks in the current filtered view for lookup
			);

			// Set up event handlers
			treeComponent.onTaskSelected = (selectedTask) => {
				if (this.onTaskSelected) {
					this.onTaskSelected(selectedTask);
				}
			};
			treeComponent.onTaskCompleted = (task) => {
				if (this.onTaskCompleted) {
					this.onTaskCompleted(task);
				}
			};
			treeComponent.onTaskContextMenu = (event, task) => {
				if (this.onTaskContextMenu) {
					this.onTaskContextMenu(event, task);
				}
			};

			// Load component and add to parent's children
			this.parent.addChild(treeComponent);
			treeComponent.load();

			// Add element to fragment
			fragment.appendChild(treeComponent.element);

			// Store for later cleanup
			this.treeComponents.push(treeComponent);
		});
		this.containerEl.appendChild(fragment);
	}

	private renderEmptyState(message: string) {
		this.containerEl.empty(); // Ensure container is empty
		const emptyEl = this.containerEl.createDiv({
			cls: `${this.context}-empty-state`, // Generic and specific class
		});
		emptyEl.setText(message);
	}

	/**
	 * Updates a specific task's visual representation if it's currently rendered.
	 * @param updatedTask - The task data that has changed.
	 */
	public updateTask(updatedTask: Task) {
		// Try updating in list view components
		const listItemComponent = this.taskComponents.find(
			(c) => c.getTask().id === updatedTask.id
		);
		if (listItemComponent) {
			listItemComponent.updateTask(updatedTask);
			return; // Found and updated
		}

		// Try updating in tree view components
		// Iterate through root tree components
		for (const treeComp of this.treeComponents) {
			// Check if the root itself matches
			if (treeComp.getTask().id === updatedTask.id) {
				treeComp.updateTask(updatedTask);
				return; // Found and updated root
			} else {
				// If not the root, try to find and update within its children
				// This requires TaskTreeItemComponent to expose a method for this.
				const updatedInChildren =
					treeComp.updateTaskRecursively?.(updatedTask);
				if (updatedInChildren) {
					return; // Found and updated within children
				}
			}
		}
	}

	/**
	 * Cleans up all rendered task components (list and tree).
	 * Should be called before rendering new tasks (unless appending).
	 */
	public cleanupComponents() {
		this.taskComponents.forEach((component) => {
			this.parent.removeChild(component); // Use parent's removeChild
		});
		this.taskComponents = [];

		this.treeComponents.forEach((component) => {
			this.parent.removeChild(component); // Use parent's removeChild
		});
		this.treeComponents = [];
	}

	onunload() {
		// Cleanup components when the renderer itself is unloaded
		this.cleanupComponents();
		// The containerEl is managed by the parent component, so we don't remove it here.
	}
}
