import { App, Component, Modal, Notice, setIcon } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import { TaskListItemComponent } from "./listItem";
import { t } from "../../translations/helper";
import { ProjectReviewSetting } from "../../common/setting-definition";
import TaskProgressBarPlugin from "../../index"; // Path used in TaskView.ts
import "../../styles/review-view.css"; // Assuming styles will be added here

interface SelectedReviewProject {
	project: string | null;
	tasks: Task[];
	setting: ProjectReviewSetting | null;
}

class ReviewConfigureModal extends Modal {
	private projectName: string;
	private frequency: string = "";
	private existingSetting: ProjectReviewSetting | null;
	private plugin: TaskProgressBarPlugin;
	private onSave: (setting: ProjectReviewSetting) => void;

	private frequencyOptions = [
		"daily",
		"weekly",
		"every 2 weeks",
		"monthly",
		"quarterly",
		"every 6 months",
		"yearly",
	];

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		projectName: string,
		existingSetting: ProjectReviewSetting | null,
		onSave: (setting: ProjectReviewSetting) => void
	) {
		super(app);
		this.projectName = projectName;
		this.existingSetting = existingSetting;
		this.plugin = plugin;
		this.onSave = onSave;

		// Initialize with existing setting if present
		if (existingSetting && existingSetting.frequency) {
			this.frequency = existingSetting.frequency;
		} else {
			this.frequency = "weekly"; // Default value
		}
	}

	async onOpen() {
		const { contentEl } = this;

		// Add title
		contentEl.createEl("h2", {
			text: t("Configure Review for") + ` "${this.projectName}"`,
			cls: "review-modal-title",
		});

		// Create form container
		const formContainer = contentEl.createDiv({
			cls: "review-modal-form",
		});

		// Frequency selection
		const frequencyContainer = formContainer.createDiv({
			cls: "review-modal-field",
		});

		// Label
		frequencyContainer.createEl("label", {
			text: t("Review Frequency"),
			cls: "review-modal-label",
			attr: { for: "review-frequency" },
		});

		// Description
		frequencyContainer.createEl("div", {
			text: t("How often should this project be reviewed"),
			cls: "review-modal-description",
		});

		// Create dropdown for frequency
		const frequencySelect = frequencyContainer.createEl("select", {
			cls: "review-modal-select",
			attr: { id: "review-frequency" },
		});

		// Add frequency options
		this.frequencyOptions.forEach((option) => {
			const optionEl = frequencySelect.createEl("option", {
				text: option,
				value: option,
			});

			if (option === this.frequency) {
				optionEl.selected = true;
			}
		});

		// Custom frequency option
		const customOption = frequencySelect.createEl("option", {
			text: t("Custom..."),
			value: "custom",
		});

		// Custom frequency input (initially hidden)
		const customFrequencyContainer = frequencyContainer.createDiv({
			cls: "review-modal-custom-frequency",
		});
		customFrequencyContainer.style.display = "none";

		const customFrequencyInput = customFrequencyContainer.createEl(
			"input",
			{
				cls: "review-modal-input",
				attr: {
					type: "text",
					placeholder: t("e.g., every 3 months"),
				},
			}
		);

		// Show/hide custom input based on dropdown selection
		frequencySelect.addEventListener("change", (e) => {
			const value = (e.target as HTMLSelectElement).value;
			if (value === "custom") {
				customFrequencyContainer.style.display = "block";
				customFrequencyInput.focus();
				this.frequency = ""; // Reset frequency when switching to custom
			} else {
				customFrequencyContainer.style.display = "none";
				this.frequency = value;
			}
		});

		// Update frequency when typing in custom input
		customFrequencyInput.addEventListener("input", (e) => {
			this.frequency = (e.target as HTMLInputElement).value;
		});

		// If existing setting has a custom frequency that's not in the dropdown,
		// select the custom option and show the custom input
		if (this.frequency && !this.frequencyOptions.includes(this.frequency)) {
			customOption.selected = true;
			customFrequencyContainer.style.display = "block";
			customFrequencyInput.value = this.frequency;
		}

		// Last reviewed information
		const lastReviewedInfo = formContainer.createDiv({
			cls: "review-modal-field",
		});

		lastReviewedInfo.createEl("label", {
			text: t("Last Reviewed"),
			cls: "review-modal-label",
		});

		const lastReviewedText = this.existingSetting?.lastReviewed
			? new Date(this.existingSetting.lastReviewed).toLocaleString()
			: "Never";

		lastReviewedInfo.createEl("div", {
			text: lastReviewedText,
			cls: "review-modal-last-reviewed",
		});

		// Buttons
		const buttonContainer = contentEl.createDiv({
			cls: "review-modal-buttons",
		});

		// Cancel button
		const cancelButton = buttonContainer.createEl("button", {
			text: t("Cancel"),
			cls: "review-modal-button review-modal-button-cancel",
		});

		cancelButton.addEventListener("click", () => {
			this.close();
		});

		// Save button
		const saveButton = buttonContainer.createEl("button", {
			text: t("Save"),
			cls: "review-modal-button review-modal-button-save",
		});

		saveButton.addEventListener("click", () => {
			this.saveSettings();
		});
	}

	private validateFrequency(): boolean {
		if (!this.frequency || this.frequency.trim() === "") {
			new Notice(t("Please specify a review frequency"));
			return false;
		}
		return true;
	}

	private async saveSettings() {
		if (!this.validateFrequency()) {
			return;
		}

		// Create or update setting
		const updatedSetting: ProjectReviewSetting = {
			projectName: this.projectName,
			frequency: this.frequency,
			lastReviewed: this.existingSetting?.lastReviewed || null,
			reviewedTasks: this.existingSetting?.reviewedTasks || [],
		};

		// Update plugin settings
		this.plugin.settings.reviewSettings[this.projectName] = updatedSetting;
		await this.plugin.saveSettings();

		// Notify parent component
		this.onSave(updatedSetting);

		// Show confirmation and close
		new Notice(t("Review schedule updated for") + ` ${this.projectName}`);
		this.close();
	}

	async onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class ReviewComponent extends Component {
	// UI Elements
	public containerEl: HTMLElement;
	private projectsListEl: HTMLElement;
	private taskContainerEl: HTMLElement;
	private taskListContainerEl: HTMLElement;
	private taskHeaderEl: HTMLElement; // To hold title, last reviewed date, frequency

	// Child components
	private taskComponents: TaskListItemComponent[] = [];

	// State
	private allTasks: Task[] = [];
	private reviewableProjects: Map<string, ProjectReviewSetting> = new Map(); // project -> settings
	private selectedProject: SelectedReviewProject = {
		project: null,
		tasks: [],
		setting: null,
	};
	private showAllTasks: boolean = false; // Default to filtered view

	// Events
	public onTaskSelected: (task: Task) => void;
	public onTaskCompleted: (task: Task) => void;

	constructor(
		private parentEl: HTMLElement,
		private app: App,
		private plugin: TaskProgressBarPlugin // Reference to the main plugin
	) {
		super();
	}

	onload() {
		// Create main container
		this.containerEl = this.parentEl.createDiv({
			cls: "review-container", // Use a unique class for review
		});

		// Create content container for columns
		const contentContainer = this.containerEl.createDiv({
			cls: "review-content",
		});

		// Left column: create projects list
		this.createLeftColumn(contentContainer);

		// Right column: create task list for selected project
		this.createRightColumn(contentContainer);

		// Load initial data
		this.loadReviewSettings();
	}

	private createLeftColumn(parentEl: HTMLElement) {
		const leftColumnEl = parentEl.createDiv({
			cls: "review-left-column", // Specific class
		});

		// Header for the projects section
		const headerEl = leftColumnEl.createDiv({
			cls: "review-sidebar-header",
		});

		const headerTitle = headerEl.createDiv({
			cls: "review-sidebar-title",
			text: t("Review Projects"), // Title specific to review
		});

		// TODO: Add button to configure review settings?

		// Projects list container
		this.projectsListEl = leftColumnEl.createDiv({
			cls: "review-sidebar-list",
		});
	}

	private createRightColumn(parentEl: HTMLElement) {
		this.taskContainerEl = parentEl.createDiv({
			cls: "review-right-column", // Specific class
		});

		// Task list header - will be populated when a project is selected
		this.taskHeaderEl = this.taskContainerEl.createDiv({
			cls: "review-task-header",
		});

		// Task list container
		this.taskListContainerEl = this.taskContainerEl.createDiv({
			cls: "review-task-list",
		});
	}

	private loadReviewSettings() {
		this.reviewableProjects.clear();
		const settings = this.plugin.settings.reviewSettings;

		// Get all unique projects from tasks
		const allProjects = new Set<string>();
		this.allTasks.forEach((task) => {
			if (task.project) {
				allProjects.add(task.project);
			}
		});

		// Add all projects to the sidebar, marking ones with review settings
		for (const projectName of allProjects) {
			// If the project has review settings, use them
			if (settings[projectName]) {
				this.reviewableProjects.set(projectName, settings[projectName]);
			} else {
				// For projects without review settings, add with a placeholder setting
				// We'll render these differently in the UI
				const placeholderSetting: ProjectReviewSetting = {
					projectName: projectName,
					frequency: "",
					lastReviewed: null,
					reviewedTasks: [],
				};
				this.reviewableProjects.set(projectName, placeholderSetting);
			}
		}

		console.log("Loaded Projects:", this.reviewableProjects);
		this.renderProjectsList();

		// If a project is currently selected but no longer available, clear the selection
		if (
			this.selectedProject.project &&
			!this.allTasks.some(
				(t) => t.project === this.selectedProject.project
			)
		) {
			this.clearSelection();
		} else if (this.selectedProject.project) {
			// If a project is already selected and still valid, refresh its view
			this.selectProject(this.selectedProject.project);
		} else {
			// No project selected, show empty state
			this.renderEmptyTaskList(
				t("Select a project to review its tasks.")
			);
		}
	}

	/**
	 * Clear the current project selection
	 */
	private clearSelection() {
		this.selectedProject = { project: null, tasks: [], setting: null };

		// Update UI to remove selection highlight
		const projectItems = this.projectsListEl.querySelectorAll(
			".review-project-item"
		);
		projectItems.forEach((item) => item.classList.remove("selected"));

		// Show empty task list
		this.renderEmptyTaskList(t("Select a project to review its tasks."));
	}

	public setTasks(tasks: Task[]) {
		this.allTasks = tasks;
		// Reload settings potentially, in case a project relevant to settings was added/removed
		// Or just filter existing settings based on current tasks
		this.loadReviewSettings(); // Reload and filter settings based on potentially new tasks
		// Note: loadReviewSettings already handles re-selecting or selecting the first project
	}

	private renderProjectsList() {
		this.projectsListEl.empty();
		const sortedProjects = Array.from(
			this.reviewableProjects.keys()
		).sort();

		// First display projects with review settings
		const projectsWithSettings = sortedProjects.filter((projectName) => {
			const setting = this.reviewableProjects.get(projectName);
			return setting && setting.frequency;
		});

		// Then display projects without review settings
		const projectsWithoutSettings = sortedProjects.filter((projectName) => {
			const setting = this.reviewableProjects.get(projectName);
			return !setting || !setting.frequency;
		});

		// Helper function to render a project item
		const renderProjectItem = (projectName: string) => {
			const projectSetting = this.reviewableProjects.get(projectName);
			if (!projectSetting) return; // Should not happen

			const projectItem = this.projectsListEl.createDiv({
				cls: "review-project-item", // Specific class
			});
			projectItem.dataset.project = projectName; // Store project name

			// Add class if the project has review settings configured
			if (projectSetting.frequency) {
				projectItem.addClass("has-review-settings");
			}

			// Icon
			const iconEl = projectItem.createDiv({
				cls: "review-project-icon",
			});
			// Use different icon based on whether project has review settings
			setIcon(
				iconEl,
				projectSetting.frequency ? "folder-check" : "folder"
			);

			// Name
			const nameEl = projectItem.createDiv({
				cls: "review-project-name",
			});
			nameEl.setText(projectName);

			// Highlight if selected
			if (this.selectedProject.project === projectName) {
				projectItem.addClass("selected");
			}

			// Click handler
			this.registerDomEvent(projectItem, "click", () => {
				this.selectProject(projectName);
			});
		};

		// If there are projects with settings, add a header
		if (projectsWithSettings.length > 0) {
			const withSettingsHeader = this.projectsListEl.createDiv({
				cls: "review-projects-group-header",
			});
			withSettingsHeader.setText(t("Configured for Review"));

			// Render projects with review settings
			projectsWithSettings.forEach(renderProjectItem);
		}

		// If there are projects without settings, add a header
		if (projectsWithoutSettings.length > 0) {
			const withoutSettingsHeader = this.projectsListEl.createDiv({
				cls: "review-projects-group-header",
			});
			withoutSettingsHeader.setText(t("Not Configured"));

			// Render projects without review settings
			projectsWithoutSettings.forEach(renderProjectItem);
		}

		if (sortedProjects.length === 0) {
			const emptyEl = this.projectsListEl.createDiv({
				cls: "review-empty-state", // Use a specific class if needed
			});
			emptyEl.setText(t("No projects available."));
		}
	}

	private selectProject(projectName: string | null) {
		// Handle deselection or selecting non-existent project
		if (!projectName || !this.reviewableProjects.has(projectName)) {
			this.selectedProject = { project: null, tasks: [], setting: null };
			this.renderEmptyTaskList(t("Select a project to review."));
			// Update UI to remove selection highlight
			const projectItems = this.projectsListEl.querySelectorAll(
				".review-project-item"
			);
			projectItems.forEach((item) => item.classList.remove("selected"));
			return;
		}

		const setting = this.reviewableProjects.get(projectName);
		if (!setting) return; // Should be caught above, but safety check

		this.selectedProject.project = projectName;
		this.selectedProject.setting = setting;

		// Update UI highlighting
		const projectItems = this.projectsListEl.querySelectorAll(
			".review-project-item"
		);
		projectItems.forEach((item) => {
			if (item.getAttribute("data-project") === projectName) {
				item.classList.add("selected");
			} else {
				item.classList.remove("selected");
			}
		});

		// Load and render tasks for this project
		this.updateSelectedProjectTasks();
	}

	private updateSelectedProjectTasks() {
		if (!this.selectedProject.project) {
			this.renderEmptyTaskList(
				t("Select a project to review its tasks.")
			);
			return;
		}

		// Filter tasks for the selected project
		const allProjectTasks = this.allTasks.filter(
			(task) => task.project === this.selectedProject.project
		);

		// Get review settings for the selected project
		const reviewSetting = this.selectedProject.setting;

		// Array to store filtered tasks that should be displayed
		let filteredTasks: Task[] = [];

		// Clear any existing filter info
		const taskHeaderContent = this.taskHeaderEl.querySelector(
			".review-header-content"
		);
		const existingFilterInfo = taskHeaderContent?.querySelector(
			".review-filter-info"
		);
		if (existingFilterInfo) {
			existingFilterInfo.remove();
		}

		if (reviewSetting && reviewSetting.lastReviewed && !this.showAllTasks) {
			// If project has been reviewed before and we're not showing all tasks, filter the tasks
			const lastReviewDate = reviewSetting.lastReviewed;
			const reviewedTaskIds = new Set(reviewSetting.reviewedTasks || []);

			// Filter tasks to only show:
			// 1. Tasks that were created after the last review date
			// 2. Tasks that existed during last review but weren't completed then and still aren't completed
			// 3. Tasks that are in progress (might have been modified since last review)
			filteredTasks = allProjectTasks.filter((task) => {
				// Always include incomplete new tasks (created after last review)
				if (task.createdDate && task.createdDate > lastReviewDate) {
					return true;
				}

				// If task was already reviewed in previous review and is now completed, exclude it
				if (reviewedTaskIds.has(task.id) && task.completed) {
					return false;
				}

				// Include tasks that were reviewed before but aren't completed yet
				if (reviewedTaskIds.has(task.id) && !task.completed) {
					return true;
				}

				// Include tasks that weren't reviewed before (they might be older tasks
				// that were added to this project after the last review)
				if (!reviewedTaskIds.has(task.id)) {
					return true;
				}

				return false;
			});

			// Add a message about filtered tasks if some were filtered out
			if (
				filteredTasks.length < allProjectTasks.length &&
				taskHeaderContent
			) {
				const filterInfo = taskHeaderContent.createDiv({
					cls: "review-filter-info",
				});

				const hiddenTasks =
					allProjectTasks.length - filteredTasks.length;
				const filterText = filterInfo.createSpan({
					text: t(
						`Showing new and in-progress tasks only. ${hiddenTasks} completed tasks from previous reviews are hidden.`
					),
				});

				// Add toggle link
				const toggleLink = filterInfo.createSpan({
					cls: "review-filter-toggle",
					text: t("Show all tasks"),
				});

				this.registerDomEvent(toggleLink, "click", () => {
					this.toggleShowAllTasks();
				});
			}
		} else {
			// If the project has never been reviewed or we're showing all tasks
			filteredTasks = allProjectTasks;

			// If we're explicitly showing all tasks, display this info
			if (
				this.showAllTasks &&
				taskHeaderContent &&
				reviewSetting?.lastReviewed
			) {
				const filterInfo = taskHeaderContent.createDiv({
					cls: "review-filter-info",
				});

				const filterText = filterInfo.createSpan({
					text: t(
						"Showing all tasks, including completed tasks from previous reviews."
					),
				});

				// Add toggle link
				const toggleLink = filterInfo.createSpan({
					cls: "review-filter-toggle",
					text: t("Show only new and in-progress tasks"),
				});

				this.registerDomEvent(toggleLink, "click", () => {
					this.toggleShowAllTasks();
				});
			}
		}

		// Update the selected project's tasks
		this.selectedProject.tasks = filteredTasks;

		// Sort tasks (example: by due date, then priority)
		this.selectedProject.tasks.sort((a, b) => {
			// First by completion status (incomplete first)
			if (a.completed !== b.completed) {
				return a.completed ? 1 : -1;
			}
			// Then by due date (early to late, nulls last)
			const dueDateA = a.dueDate
				? new Date(a.dueDate).getTime()
				: Number.MAX_SAFE_INTEGER;
			const dueDateB = b.dueDate
				? new Date(b.dueDate).getTime()
				: Number.MAX_SAFE_INTEGER;
			if (dueDateA !== dueDateB) {
				return dueDateA - dueDateB;
			}
			// Then by priority (high to low, 0 is lowest)
			const priorityA = a.priority || 0;
			const priorityB = b.priority || 0;
			return priorityB - priorityA;
		});

		this.renderTaskList();
	}

	/**
	 * Toggle between showing all tasks or only new and in-progress tasks
	 */
	private toggleShowAllTasks() {
		this.showAllTasks = !this.showAllTasks;
		this.updateSelectedProjectTasks();
	}

	private renderTaskList() {
		// Clean up existing task components
		this.taskComponents.forEach((component) => component.unload());
		this.taskComponents = [];
		this.taskListContainerEl.empty();
		this.taskHeaderEl.empty(); // Clear previous header

		if (!this.selectedProject.project || !this.selectedProject.setting) {
			this.renderEmptyTaskList(
				t("Select a project to review its tasks.")
			);
			return;
		}

		// --- Render Header --- Render header based on selected project
		this.renderReviewHeader(
			this.selectedProject.project,
			this.selectedProject.setting
		);

		// --- Render Tasks --- If no tasks, show specific empty state
		if (this.selectedProject.tasks.length === 0) {
			this.renderEmptyTaskList(t("No tasks found for this project."));
			return;
		}

		// Render the filtered and sorted tasks
		this.selectedProject.tasks.forEach((task) => {
			const taskComponent = new TaskListItemComponent(
				task,
				"review", // Context identifier
				this.app
			);

			taskComponent.onTaskSelected = (selectedTask) => {
				if (this.onTaskSelected) this.onTaskSelected(selectedTask);
			};
			taskComponent.onTaskCompleted = (completedTask) => {
				if (this.onTaskCompleted) this.onTaskCompleted(completedTask);
				// TODO: Add logic to potentially mark review as complete?
			};

			this.addChild(taskComponent);
			taskComponent.load();
			this.taskListContainerEl.appendChild(taskComponent.element);
			this.taskComponents.push(taskComponent);
		});
	}

	private renderReviewHeader(
		projectName: string,
		setting: ProjectReviewSetting
	) {
		this.taskHeaderEl.empty(); // Clear previous header content
		const headerContent = this.taskHeaderEl.createDiv({
			cls: "review-header-content",
		});

		// Project Title
		headerContent.createEl("h3", { text: projectName });

		// Review Info Line (Frequency and Last Reviewed Date)
		const reviewInfoEl = headerContent.createDiv({ cls: "review-info" });

		// Display different content based on whether project has review settings
		if (setting.frequency) {
			// Frequency Text
			const frequencyText = `${t("Review every")} ${setting.frequency}`;
			reviewInfoEl.createSpan(
				{
					cls: "review-frequency",
					text: frequencyText,
				},
				(el) => {
					this.registerDomEvent(el, "click", () => {
						this.openConfigureModal(projectName, setting);
					});
				}
			);

			// Separator
			reviewInfoEl.createSpan({ cls: "review-separator", text: "•" });

			// Last Reviewed Date Text
			const lastReviewedDate = setting.lastReviewed
				? new Date(setting.lastReviewed).toLocaleDateString()
				: t("never");
			reviewInfoEl.createSpan({
				cls: "review-last-date",
				text: `${t("Last reviewed")}: ${lastReviewedDate}`,
			});

			// Add "Mark as Reviewed" button
			const reviewButtonContainer = headerContent.createDiv({
				cls: "review-button-container",
			});
			const reviewButton = reviewButtonContainer.createEl("button", {
				cls: "review-complete-btn",
				text: t("Mark as Reviewed"),
			});
			this.registerDomEvent(reviewButton, "click", () => {
				this.markProjectAsReviewed(projectName);
			});
		} else {
			// No review settings configured message
			reviewInfoEl.createSpan({
				cls: "review-no-settings",
				text: t("No review schedule configured for this project"),
			});

			// Add "Configure Review" button
			const reviewButtonContainer = headerContent.createDiv({
				cls: "review-button-container",
			});
			const configureButton = reviewButtonContainer.createEl("button", {
				cls: "review-configure-btn",
				text: t("Configure Review Schedule"),
			});
			this.registerDomEvent(configureButton, "click", () => {
				this.openConfigureModal(projectName, setting);
			});
		}
	}

	/**
	 * Open the configure review modal for a project
	 */
	private openConfigureModal(
		projectName: string,
		existingSetting: ProjectReviewSetting
	) {
		const modal = new ReviewConfigureModal(
			this.app,
			this.plugin,
			projectName,
			existingSetting,
			(updatedSetting: ProjectReviewSetting) => {
				// Update the local state
				if (this.selectedProject.project === projectName) {
					this.selectedProject.setting = updatedSetting;
					this.renderReviewHeader(projectName, updatedSetting);
				}

				// Refresh the projects list to update the styling
				this.loadReviewSettings();
			}
		);

		modal.open();
	}

	/**
	 * Mark a project as reviewed, updating the last reviewed timestamp
	 * and recording the IDs of current tasks that have been reviewed
	 */
	private async markProjectAsReviewed(projectName: string) {
		console.log(`Marking ${projectName} as reviewed...`);
		const now = Date.now();
		const currentSettings = this.plugin.settings.reviewSettings;

		// Get all current tasks for this project
		const projectTasks = this.allTasks.filter(
			(task) => task.project === projectName
		);
		const taskIds = projectTasks.map((task) => task.id);

		if (currentSettings[projectName]) {
			// Update the last reviewed timestamp and record current task IDs
			currentSettings[projectName].lastReviewed = now;
			currentSettings[projectName].reviewedTasks = taskIds;

			// Save settings via plugin
			await this.plugin.saveSettings();

			// Update local state
			this.selectedProject.setting = currentSettings[projectName];

			// Show notice
			new Notice(
				t(
					`${projectName} marked as reviewed with ${taskIds.length} tasks`
				)
			);

			// Update UI - need to refresh task list since we'll now filter out reviewed tasks
			this.renderReviewHeader(projectName, currentSettings[projectName]);
			this.updateSelectedProjectTasks();
		} else {
			// If the project doesn't have settings yet, create them
			const newSetting: ProjectReviewSetting = {
				projectName: projectName,
				frequency: "weekly", // Default frequency
				lastReviewed: now,
				reviewedTasks: taskIds,
			};

			// Save the new settings
			currentSettings[projectName] = newSetting;
			await this.plugin.saveSettings();

			// Update local state
			this.selectedProject.setting = newSetting;
			this.reviewableProjects.set(projectName, newSetting);

			// Show notice
			new Notice(
				t(
					`${projectName} marked as reviewed with ${taskIds.length} tasks`
				)
			);

			// Update UI
			this.renderReviewHeader(projectName, newSetting);
			this.renderProjectsList(); // Also refresh the project list to update styling
			this.updateSelectedProjectTasks();
		}
	}

	private renderEmptyTaskList(message: string) {
		// Clean up task components and clear list container
		this.taskComponents.forEach((component) => component.unload());
		this.taskComponents = [];
		this.taskListContainerEl.empty();

		// Display the message
		const emptyEl = this.taskListContainerEl.createDiv({
			cls: "review-empty-state", // Use a specific class if needed
		});
		emptyEl.setText(message);

		// Clear or set a default header state when the list is empty
		if (!this.selectedProject.project) {
			this.taskHeaderEl.empty();
			const defaultHeader = this.taskHeaderEl.createDiv({
				cls: "review-header-content",
			});
			defaultHeader.createEl("h3", { text: t("Project Review") });
			const infoEl = defaultHeader.createDiv({
				cls: "review-info",
				text: t(
					"Select a project from the left sidebar to review its tasks."
				),
			});
		}
		// If a project *is* selected but has no tasks, the header is already rendered by renderTaskList,
		// so we don't need to clear it here, just show the 'no tasks' message.
	}

	public updateTask(updatedTask: Task) {
		console.log(
			"ReviewComponent received task update:",
			updatedTask.id,
			updatedTask.project
		);
		let needsUIRefresh = false;

		// Update in allTasks list
		const taskIndexAll = this.allTasks.findIndex(
			(t) => t.id === updatedTask.id
		);
		if (taskIndexAll !== -1) {
			const oldTask = this.allTasks[taskIndexAll];
			// Check if the project changed
			if (oldTask.project !== updatedTask.project) {
				console.log("Task project changed, might affect review list.");
				// Re-evaluate reviewable projects and potentially update left list
				this.loadReviewSettings(); // This might change the selected project
				needsUIRefresh = true; // Need full refresh as left list might change
			}
			this.allTasks[taskIndexAll] = updatedTask;
		} else {
			// Task might be new
			this.allTasks.push(updatedTask);
			// Check if its project is in review settings
			if (
				updatedTask.project &&
				this.plugin.settings.reviewSettings[updatedTask.project]
			) {
				this.loadReviewSettings(); // New task belongs to a reviewed project
				needsUIRefresh = true;
			}
		}

		// If a full refresh is needed (due to project change affecting review list),
		// loadReviewSettings already handles updating the view.
		if (needsUIRefresh) {
			return; // Exit early, UI is handled by loadReviewSettings/selectProject
		}

		// If the updated task belongs to the currently selected project,
		// update the task list directly.
		if (this.selectedProject.project === updatedTask.project) {
			// Check if task should be in the current filtered view
			let shouldBeInFilteredView = true;

			// Apply filtering logic if we're not showing all tasks
			if (
				!this.showAllTasks &&
				this.selectedProject.setting?.lastReviewed
			) {
				const lastReviewDate =
					this.selectedProject.setting.lastReviewed;
				const reviewedTaskIds = new Set(
					this.selectedProject.setting.reviewedTasks || []
				);

				// Use the same filtering logic as in updateSelectedProjectTasks
				// New task since last review
				if (
					updatedTask.createdDate &&
					updatedTask.createdDate > lastReviewDate
				) {
					shouldBeInFilteredView = true;
				}
				// Existing task that was completed
				else if (
					reviewedTaskIds.has(updatedTask.id) &&
					updatedTask.completed
				) {
					shouldBeInFilteredView = false;
				}
				// Existing incomplete task
				else if (
					reviewedTaskIds.has(updatedTask.id) &&
					!updatedTask.completed
				) {
					shouldBeInFilteredView = true;
				}
				// Task not in last review
				else if (!reviewedTaskIds.has(updatedTask.id)) {
					shouldBeInFilteredView = true;
				}
			}

			const taskIndexSelected = this.selectedProject.tasks.findIndex(
				(t) => t.id === updatedTask.id
			);

			if (taskIndexSelected !== -1) {
				// Task exists in the current view
				if (shouldBeInFilteredView) {
					// Update it if it should still be visible
					this.selectedProject.tasks[taskIndexSelected] = updatedTask;
					// Find and update the specific component
					const component = this.taskComponents.find(
						(c) => c.getTask().id === updatedTask.id
					);
					if (component) {
						component.updateTask(updatedTask);
					} else {
						// Component not found? Should not happen if task was in list.
						this.updateSelectedProjectTasks();
					}
				} else {
					// Task should no longer be visible, refresh the list
					this.updateSelectedProjectTasks();
				}
			} else if (shouldBeInFilteredView) {
				// Task wasn't in the list before but should be now, refresh list
				this.updateSelectedProjectTasks();
			}
		}
	}

	public refreshReviewSettings() {
		console.log("Explicitly refreshing review settings...");
		this.loadReviewSettings();
	}

	onunload() {
		this.taskComponents.forEach((component) => component.unload());
		this.containerEl?.remove();
	}
}
