import { App, Component, setIcon } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import { formatDate } from "../../utils/dateUtil";
import "../../styles/tree-view.css";
import { MarkdownRendererComponent } from "../MarkdownRenderer";
import { createTaskCheckbox } from "./details";
import {
	TaskProgressBarSettings,
	getViewSettingOrDefault,
	ViewMode,
} from "../../common/setting-definition";
import { getRelativeTimeString } from "../../utils/dateUtil";
import { t } from "../../translations/helper";
import TaskProgressBarPlugin from "../../index";

export class TaskTreeItemComponent extends Component {
	public element: HTMLElement;
	private task: Task;
	private isSelected: boolean = false;
	private isExpanded: boolean = true;
	private viewMode: string;
	private indentLevel: number = 0;
	private parentContainer: HTMLElement;
	private childrenContainer: HTMLElement;
	private childComponents: TaskTreeItemComponent[] = [];

	private toggleEl: HTMLElement;

	// Events
	public onTaskSelected: (task: Task) => void;
	public onTaskCompleted: (task: Task) => void;
	public onToggleExpand: (taskId: string, isExpanded: boolean) => void;

	public onTaskContextMenu: (event: MouseEvent, task: Task) => void;

	private markdownRenderer: MarkdownRendererComponent;
	private contentEl: HTMLElement;
	private taskMap: Map<string, Task>;

	constructor(
		task: Task,
		viewMode: string,
		private app: App,
		indentLevel: number = 0,
		private childTasks: Task[] = [],
		taskMap: Map<string, Task>,
		private plugin: TaskProgressBarPlugin
	) {
		super();
		this.task = task;
		this.viewMode = viewMode;
		this.indentLevel = indentLevel;
		this.taskMap = taskMap;
	}

	onload() {
		// Create task item container
		this.element = createDiv({
			cls: ["task-item", "tree-task-item"],
			attr: {
				"data-task-id": this.task.id,
			},
		});

		this.registerDomEvent(this.element, "contextmenu", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (this.onTaskContextMenu) {
				this.onTaskContextMenu(e, this.task);
			}
		});

		// Create parent container
		this.parentContainer = this.element.createDiv({
			cls: "task-parent-container",
		});

		// Create task content
		this.renderTaskContent();

		// Create container for child tasks
		this.childrenContainer = this.element.createDiv({
			cls: "task-children-container",
		});

		// Render child tasks
		this.renderChildTasks();

		// Register click handler for selection
		this.registerDomEvent(this.parentContainer, "click", (e) => {
			// Only trigger if clicking on the task itself, not children
			if (
				e.target === this.parentContainer ||
				this.parentContainer.contains(e.target as Node)
			) {
				const isCheckbox = (e.target as HTMLElement).classList.contains(
					"task-checkbox"
				);

				if (isCheckbox) {
					e.stopPropagation();
					this.toggleTaskCompletion();
				} else if (
					(e.target as HTMLElement).classList.contains(
						"task-expand-toggle"
					)
				) {
					e.stopPropagation();
				} else {
					this.selectTask();
				}
			}
		});
	}

	private renderTaskContent() {
		// Clear existing content
		this.parentContainer.empty();
		this.parentContainer.classList.toggle("completed", this.task.completed);
		this.parentContainer.classList.toggle("selected", this.isSelected);

		// Indentation based on level
		if (this.indentLevel > 0) {
			const indentEl = this.parentContainer.createDiv({
				cls: "task-indent",
			});
			indentEl.style.width = `${this.indentLevel * 30}px`;
		}

		// Expand/collapse toggle for tasks with children
		if (this.task.children && this.task.children.length > 0) {
			this.toggleEl = this.parentContainer.createDiv({
				cls: "task-expand-toggle",
			});
			setIcon(
				this.toggleEl,
				this.isExpanded ? "chevron-down" : "chevron-right"
			);

			// Register toggle event
			this.registerDomEvent(this.toggleEl, "click", (e) => {
				e.stopPropagation();
				this.toggleExpand();
			});
		}

		// Checkbox
		const checkboxEl = this.parentContainer.createDiv(
			{
				cls: "task-checkbox",
			},
			(el) => {
				const checkbox = createTaskCheckbox(
					this.task.status,
					this.task,
					el
				);

				this.registerDomEvent(checkbox, "click", (event) => {
					event.stopPropagation();

					if (this.onTaskCompleted) {
						this.onTaskCompleted(this.task);
					}

					if (this.task.status === " ") {
						checkbox.checked = true;
						checkbox.dataset.task = "x";
					}
				});
			}
		);

		const taskItemContainer = this.parentContainer.createDiv({
			cls: "task-item-container",
		});

		// Task content with markdown rendering
		this.contentEl = taskItemContainer.createDiv({
			cls: "task-item-content",
		});

		this.renderMarkdown();

		// Metadata container
		const metadataEl = taskItemContainer.createDiv({
			cls: "task-metadata",
		});

		// Display dates based on task completion status
		if (!this.task.completed) {
			// Due date if available
			if (this.task.dueDate) {
				const dueEl = metadataEl.createEl("div", {
					cls: ["task-date", "task-due-date"],
				});
				const dueDate = new Date(this.task.dueDate);

				const today = new Date();
				today.setHours(0, 0, 0, 0);

				const tomorrow = new Date(today);
				tomorrow.setDate(tomorrow.getDate() + 1);

				// Format date
				let dateText = "";
				if (dueDate.getTime() < today.getTime()) {
					dateText =
						t("Overdue") +
						(this.plugin.settings?.useRelativeTimeForDate
							? " | " + getRelativeTimeString(dueDate)
							: "");
					dueEl.classList.add("task-overdue");
				} else if (dueDate.getTime() === today.getTime()) {
					dateText = this.plugin.settings?.useRelativeTimeForDate
						? getRelativeTimeString(dueDate) || "Today"
						: "Today";
					dueEl.classList.add("task-due-today");
				} else if (dueDate.getTime() === tomorrow.getTime()) {
					dateText = this.plugin.settings?.useRelativeTimeForDate
						? getRelativeTimeString(dueDate) || "Tomorrow"
						: "Tomorrow";
					dueEl.classList.add("task-due-tomorrow");
				} else {
					dateText = dueDate.toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					});
				}

				dueEl.textContent = dateText;
				dueEl.setAttribute("aria-label", dueDate.toLocaleDateString());
			}

			// Scheduled date if available
			if (this.task.scheduledDate) {
				const scheduledEl = metadataEl.createEl("div", {
					cls: ["task-date", "task-scheduled-date"],
				});
				const scheduledDate = new Date(this.task.scheduledDate);

				scheduledEl.textContent = this.plugin.settings
					?.useRelativeTimeForDate
					? getRelativeTimeString(scheduledDate)
					: scheduledDate.toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
					  });
				scheduledEl.setAttribute(
					"aria-label",
					scheduledDate.toLocaleDateString()
				);
			}

			// Start date if available
			if (this.task.startDate) {
				const startEl = metadataEl.createEl("div", {
					cls: ["task-date", "task-start-date"],
				});
				const startDate = new Date(this.task.startDate);

				startEl.textContent = this.plugin.settings
					?.useRelativeTimeForDate
					? getRelativeTimeString(startDate)
					: startDate.toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
					  });
				startEl.setAttribute(
					"aria-label",
					startDate.toLocaleDateString()
				);
			}

			// Recurrence if available
			if (this.task.recurrence) {
				const recurrenceEl = metadataEl.createEl("div", {
					cls: "task-date task-recurrence",
				});
				recurrenceEl.textContent = this.task.recurrence;
			}
		} else {
			// For completed tasks, show completion date
			if (this.task.completedDate) {
				const completedEl = metadataEl.createEl("div", {
					cls: ["task-date", "task-done-date"],
				});
				const completedDate = new Date(this.task.completedDate);

				completedEl.textContent = this.plugin.settings
					?.useRelativeTimeForDate
					? getRelativeTimeString(completedDate)
					: completedDate.toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
					  });
				completedEl.setAttribute(
					"aria-label",
					completedDate.toLocaleDateString()
				);
			}

			// Created date if available
			if (this.task.createdDate) {
				const createdEl = metadataEl.createEl("div", {
					cls: ["task-date", "task-created-date"],
				});
				const createdDate = new Date(this.task.createdDate);

				createdEl.textContent = this.plugin.settings
					?.useRelativeTimeForDate
					? getRelativeTimeString(createdDate)
					: createdDate.toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
					  });
				createdEl.setAttribute(
					"aria-label",
					createdDate.toLocaleDateString()
				);
			}
		}

		// Project badge if available and not in project view
		if (this.task.project && this.viewMode !== "projects") {
			const projectEl = metadataEl.createEl("div", {
				cls: "task-project",
			});
			projectEl.textContent =
				this.task.project.split("/").pop() || this.task.project;
		}

		if (this.task.tags && this.task.tags.length > 0) {
			const tagsContainer = metadataEl.createEl("div", {
				cls: "task-tags-container",
			});

			this.task.tags
				.filter((tag) => !tag.startsWith("#project"))
				.forEach((tag) => {
					const tagEl = tagsContainer.createEl("span", {
						cls: "task-tag",
						text: tag.startsWith("#") ? tag : `#${tag}`,
					});
				});
		}

		// Priority indicator if available
		if (this.task.priority) {
			const priorityEl = createDiv({
				cls: ["task-priority", `priority-${this.task.priority}`],
			});

			// Priority icon based on level
			let icon = "•";
			icon = "!".repeat(this.task.priority);

			priorityEl.textContent = icon;
			this.parentContainer.appendChild(priorityEl);
		}
	}

	private renderMarkdown() {
		// Clear existing content if needed
		if (this.markdownRenderer) {
			this.removeChild(this.markdownRenderer);
		}

		// Create new renderer
		this.markdownRenderer = new MarkdownRendererComponent(
			this.app,
			this.contentEl,
			this.task.filePath
		);
		this.addChild(this.markdownRenderer);

		// Render the markdown content
		this.markdownRenderer.render(this.task.originalMarkdown);
	}

	private renderChildTasks() {
		// Clear existing child components
		this.childComponents.forEach((component) => {
			component.unload();
		});
		this.childComponents = [];

		// Clear child container
		this.childrenContainer.empty();

		// Set visibility based on expanded state
		this.isExpanded
			? this.childrenContainer.show()
			: this.childrenContainer.hide();

		// Get view configuration to check if we should hide completed and abandoned tasks
		const viewConfig = getViewSettingOrDefault(
			this.plugin,
			this.viewMode as ViewMode
		);
		const abandonedStatus =
			this.plugin.settings.taskStatuses.abandoned.split("|");
		const completedStatus =
			this.plugin.settings.taskStatuses.completed.split("|");

		// Filter child tasks based on view configuration
		let tasksToRender = this.childTasks;
		if (viewConfig.hideCompletedAndAbandonedTasks) {
			tasksToRender = this.childTasks.filter((task) => {
				return (
					!task.completed &&
					!abandonedStatus.includes(task.status.toLowerCase()) &&
					!completedStatus.includes(task.status.toLowerCase())
				);
			});
		}

		// Render each filtered child task
		tasksToRender.forEach((childTask) => {
			// Find *grandchildren* by looking up children of the current childTask in the *full* taskMap
			const grandchildren: Task[] = [];
			this.taskMap.forEach((potentialGrandchild) => {
				if (potentialGrandchild.parent === childTask.id) {
					grandchildren.push(potentialGrandchild);
				}
			});

			const childComponent = new TaskTreeItemComponent(
				childTask,
				this.viewMode,
				this.app,
				this.indentLevel + 1,
				grandchildren, // Pass the correctly found grandchildren
				this.taskMap, // Pass the map down recursively
				this.plugin // Pass the plugin down
			);

			// Pass up events
			childComponent.onTaskSelected = (task) => {
				if (this.onTaskSelected) {
					this.onTaskSelected(task);
				}
			};

			childComponent.onTaskCompleted = (task) => {
				if (this.onTaskCompleted) {
					this.onTaskCompleted(task);
				}
			};

			childComponent.onToggleExpand = (taskId, isExpanded) => {
				if (this.onToggleExpand) {
					this.onToggleExpand(taskId, isExpanded);
				}
			};

			childComponent.onTaskContextMenu = (event, task) => {
				if (this.onTaskContextMenu) {
					this.onTaskContextMenu(event, task);
				}
			};

			// Load component
			this.addChild(childComponent);
			childComponent.load();

			// Add to DOM
			this.childrenContainer.appendChild(childComponent.element);

			// Store for later cleanup
			this.childComponents.push(childComponent);
		});
	}

	public updateChildTasks(childTasks: Task[]) {
		this.childTasks = childTasks;
		this.renderChildTasks();
	}

	private selectTask() {
		if (this.onTaskSelected) {
			this.onTaskSelected(this.task);
		}
	}

	private toggleTaskCompletion() {
		// Create a copy of the task with toggled completion
		const updatedTask: Task = {
			...this.task,
			completed: !this.task.completed,
			completedDate: !this.task.completed ? Date.now() : undefined,
		};

		if (this.onTaskCompleted) {
			this.onTaskCompleted(updatedTask);
		}
	}

	private toggleExpand() {
		this.isExpanded = !this.isExpanded;

		if (this.toggleEl instanceof HTMLElement) {
			setIcon(
				this.toggleEl,
				this.isExpanded ? "chevron-down" : "chevron-right"
			);
		}

		// Show/hide children
		this.isExpanded
			? this.childrenContainer.show()
			: this.childrenContainer.hide();

		// Notify parent
		if (this.onToggleExpand) {
			this.onToggleExpand(this.task.id, this.isExpanded);
		}
	}

	public setSelected(selected: boolean) {
		this.isSelected = selected;
		this.element.classList.toggle("selected", selected);
	}

	public updateTask(task: Task) {
		const oldTask = this.task;
		this.task = task;
		this.renderTaskContent();

		// Update completion status
		if (oldTask.completed !== task.completed) {
			if (task.completed) {
				this.element.classList.add("task-completed");
			} else {
				this.element.classList.remove("task-completed");
			}
		}

		// If only the content changed, just update the markdown
		if (oldTask.originalMarkdown !== task.originalMarkdown) {
			// Just re-render the markdown content
			this.contentEl.empty();
			this.renderMarkdown();
		} else {
			// Full refresh needed for other changes
			this.element.empty();
			this.onload();
		}
	}

	/**
	 * Attempts to find and update a task within this component's children.
	 * @param updatedTask The task data to update.
	 * @returns True if the task was found and updated in the subtree, false otherwise.
	 */
	public updateTaskRecursively(updatedTask: Task): boolean {
		// Iterate through the direct child components of this item
		for (const childComp of this.childComponents) {
			// Check if the direct child is the task we're looking for
			if (childComp.getTask().id === updatedTask.id) {
				childComp.updateTask(updatedTask); // Update the child directly
				return true; // Task found and updated
			} else {
				// If not a direct child, ask this child to check its own children recursively
				const foundInChildren =
					childComp.updateTaskRecursively(updatedTask);
				if (foundInChildren) {
					return true; // Task was found deeper in this child's subtree
				}
			}
		}
		// If the loop finishes, the task was not found in this component's subtree
		return false;
	}

	public getTask(): Task {
		return this.task;
	}

	/**
	 * Updates the visual selection state of this component and its children.
	 * @param selectedId The ID of the task that should be marked as selected, or null to deselect all.
	 */
	public updateSelectionVisuals(selectedId: string | null) {
		const isNowSelected = this.task.id === selectedId;
		if (this.isSelected !== isNowSelected) {
			this.isSelected = isNowSelected;
			// Use the existing element reference if available, otherwise querySelector
			const elementToToggle =
				this.element ||
				this.parentContainer?.closest(".tree-task-item");
			if (elementToToggle) {
				elementToToggle.classList.toggle(
					"is-selected",
					this.isSelected
				);
				// Also ensure the parent container reflects selection if separate element
				if (this.parentContainer) {
					this.parentContainer.classList.toggle(
						"selected",
						this.isSelected
					);
				}
			} else {
				console.warn(
					"Could not find element to toggle selection class for task:",
					this.task.id
				);
			}
		}

		// Recursively update children
		this.childComponents.forEach((child) =>
			child.updateSelectionVisuals(selectedId)
		);
	}

	public setExpanded(expanded: boolean) {
		if (this.isExpanded !== expanded) {
			this.isExpanded = expanded;

			// Update icon
			if (this.toggleEl instanceof HTMLElement) {
				setIcon(
					this.toggleEl,
					this.isExpanded ? "chevron-down" : "chevron-right"
				);
			}

			// Show/hide children
			this.isExpanded
				? this.childrenContainer.show()
				: this.childrenContainer.hide();
		}
	}

	onunload() {
		// Clean up child components
		this.childComponents.forEach((component) => {
			component.unload();
		});

		// Remove element from DOM if it exists
		if (this.element && this.element.parentNode) {
			this.element.remove();
		}
	}
}
