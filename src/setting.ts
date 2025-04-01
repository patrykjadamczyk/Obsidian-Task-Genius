import {
	App,
	PluginSettingTab,
	Setting,
	Modal,
	DropdownComponent,
} from "obsidian";
import TaskProgressBarPlugin from ".";
import { allStatusCollections } from "./task-status";
import {
	TaskFilterOptions,
	migrateOldFilterOptions,
} from "./editor-ext/filterTasks";
import { t } from "./translations/helper";
import { WorkflowDefinition, WorkflowStage } from "./editor-ext/workflow";

export interface TaskProgressBarSettings {
	showProgressBar: boolean;
	addTaskProgressBarToHeading: boolean;
	addProgressBarToNonTaskBullet: boolean;
	enableHeadingProgressBar: boolean;
	addNumberToProgressBar: boolean;
	showPercentage: boolean;

	progressRanges: Array<{
		min: number;
		max: number;
		text: string;
	}>;

	autoCompleteParent: boolean;
	supportHoverToShowProgressInfo: boolean;
	markParentInProgressWhenPartiallyComplete: boolean;
	countSubLevel: boolean;
	hideProgressBarBasedOnConditions: boolean;
	hideProgressBarTags: string;
	hideProgressBarFolders: string;
	hideProgressBarMetadata: string;

	// Task state settings
	taskStatuses: {
		completed: string;
		inProgress: string;
		abandoned: string;
		notStarted: string;
		planned: string;
	};

	countOtherStatusesAs: string;

	// Control which tasks to count
	excludeTaskMarks: string;
	useOnlyCountMarks: boolean;
	onlyCountTaskMarks: string;

	// Progress range text customization
	customizeProgressRanges: boolean;

	// Task status switcher settings
	enableTaskStatusSwitcher: boolean;
	enableCustomTaskMarks: boolean;
	taskStatusCycle: string[];
	taskStatusMarks: Record<string, string>;
	excludeMarksFromCycle: string[];

	// Priority picker settings
	enablePriorityPicker: boolean;
	enablePriorityKeyboardShortcuts: boolean;

	// Date picker settings
	enableDatePicker: boolean;
	dateMark: string;
	// Cycle complete status settings
	enableCycleCompleteStatus: boolean;
	alwaysCycleNewTasks: boolean;

	// Workflow settings
	workflow: {
		enableWorkflow: boolean;
		autoAddTimestamp: boolean;
		autoAddNextTask: boolean;
		definitions: WorkflowDefinition[];
		autoRemoveLastStageMarker: boolean;
	};

	// Completed task mover settings
	completedTaskMover: {
		enableCompletedTaskMover: boolean;
		taskMarkerType: "version" | "date" | "custom";
		versionMarker: string;
		dateMarker: string;
		customMarker: string;
		completeAllMovedTasks: boolean;
		treatAbandonedAsCompleted: boolean;
		withCurrentFileLink: boolean;
	};

	// Quick capture settings
	quickCapture: {
		enableQuickCapture: boolean;
		targetFile: string;
		placeholder: string;
		appendToFile: "append" | "prepend" | "replace";
	};

	// Task filter settings
	taskFilter: {
		enableTaskFilter: boolean;
		keyboardShortcut: string;
		presetTaskFilters: Array<{
			id: string;
			name: string;
			options: TaskFilterOptions;
		}>;
	};
}

export const DEFAULT_SETTINGS: TaskProgressBarSettings = {
	showProgressBar: false,
	addTaskProgressBarToHeading: false,
	addProgressBarToNonTaskBullet: false,
	enableHeadingProgressBar: false,
	addNumberToProgressBar: false,
	autoCompleteParent: false,
	supportHoverToShowProgressInfo: false,
	markParentInProgressWhenPartiallyComplete: false,
	showPercentage: false,
	countSubLevel: true,
	hideProgressBarBasedOnConditions: false,
	hideProgressBarTags: "no-progress-bar",
	hideProgressBarFolders: "",
	hideProgressBarMetadata: "hide-progress-bar",

	// Default task statuses
	taskStatuses: {
		completed: "x|X",
		inProgress: ">|/",
		abandoned: "-",
		notStarted: " ",
		planned: "?",
	},

	countOtherStatusesAs: "notStarted",

	// Control which tasks to count
	excludeTaskMarks: "",
	onlyCountTaskMarks: "x|X",
	useOnlyCountMarks: false,

	// Progress range text customization
	customizeProgressRanges: false,
	progressRanges: [
		{ min: 0, max: 20, text: t("Just started {{PROGRESS}}%") },
		{ min: 20, max: 40, text: t("Making progress {{PROGRESS}}%") },
		{ min: 40, max: 60, text: t("Half way {{PROGRESS}}%") },
		{ min: 60, max: 80, text: t("Good progress {{PROGRESS}}%") },
		{ min: 80, max: 100, text: t("Almost there {{PROGRESS}}%") },
	],

	// Task status switcher settings
	enableTaskStatusSwitcher: false,
	enableCustomTaskMarks: false,
	taskStatusCycle: ["TODO", "DOING", "IN-PROGRESS", "DONE"],
	taskStatusMarks: {
		TODO: " ",
		DOING: "-",
		"IN-PROGRESS": ">",
		DONE: "x",
	},
	excludeMarksFromCycle: [],

	// Priority picker settings
	enablePriorityPicker: false,
	enablePriorityKeyboardShortcuts: false,

	// Date picker settings
	enableDatePicker: false,
	dateMark: "📅,📆,⏳,🛫",
	// Cycle complete status settings
	enableCycleCompleteStatus: true,
	alwaysCycleNewTasks: false,

	// Workflow settings
	workflow: {
		enableWorkflow: false,
		autoAddTimestamp: true,
		autoAddNextTask: false,
		autoRemoveLastStageMarker: false,
		definitions: [
			{
				id: "project_workflow",
				name: "Project Workflow",
				description: "Standard project management workflow",
				stages: [
					{
						id: "planning",
						name: "Planning",
						type: "linear",
						next: "in_progress",
					},
					{
						id: "in_progress",
						name: "In Progress",
						type: "cycle",
						subStages: [
							{
								id: "development",
								name: "Development",
								next: "testing",
							},
							{
								id: "testing",
								name: "Testing",
								next: "development",
							},
						],
						canProceedTo: ["review", "cancelled"],
					},
					{
						id: "review",
						name: "Review",
						type: "cycle",
						canProceedTo: ["in_progress", "completed"],
					},
					{
						id: "completed",
						name: "Completed",
						type: "terminal",
					},
					{
						id: "cancelled",
						name: "Cancelled",
						type: "terminal",
					},
				],
				metadata: {
					version: "1.0",
					created: "2024-03-20",
					lastModified: "2024-03-20",
				},
			},
		],
	},

	// Completed task mover settings
	completedTaskMover: {
		enableCompletedTaskMover: false,
		taskMarkerType: "version",
		versionMarker: "version 1.0",
		dateMarker: "archived on {{date}}",
		customMarker: "moved {{DATE:YYYY-MM-DD HH:mm}}",
		completeAllMovedTasks: false,
		treatAbandonedAsCompleted: false,
		withCurrentFileLink: false,
	},

	// Quick capture settings
	quickCapture: {
		enableQuickCapture: false,
		targetFile: "Quick Capture.md",
		placeholder: "Capture thoughts, tasks, or ideas...",
		appendToFile: "append",
	},

	// Task filter settings
	taskFilter: {
		enableTaskFilter: true,
		keyboardShortcut: "Alt-f",
		presetTaskFilters: [],
	},
};

export class TaskProgressBarSettingTab extends PluginSettingTab {
	plugin: TaskProgressBarPlugin;
	private applyDebounceTimer: number = 0;

	constructor(app: App, plugin: TaskProgressBarPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	applySettingsUpdate() {
		clearTimeout(this.applyDebounceTimer);
		const plugin = this.plugin;
		this.applyDebounceTimer = window.setTimeout(() => {
			plugin.saveSettings();
		}, 100);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Task Genius")
			.setDesc(
				t(
					"Comprehensive task management plugin for Obsidian with progress bars, task status cycling, and advanced task tracking features."
				)
			)
			.setHeading();

		new Setting(containerEl)
			.setName(t("Progress bar"))
			.setDesc(
				t(
					"You can customize the progress bar behind the parent task(usually at the end of the task). You can also customize the progress bar for the task below the heading."
				)
			)
			.setHeading();

		new Setting(containerEl)
			.setName(t("Show progress bar"))
			.setDesc(t("Toggle this to show the progress bar."))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showProgressBar)
					.onChange(async (value) => {
						this.plugin.settings.showProgressBar = value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (this.plugin.settings.showProgressBar) {
			new Setting(containerEl)
				.setName(t("Support hover to show progress info"))
				.setDesc(
					t(
						"Toggle this to allow this plugin to show progress info when hovering over the progress bar."
					)
				)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.supportHoverToShowProgressInfo
						)
						.onChange(async (value) => {
							this.plugin.settings.supportHoverToShowProgressInfo =
								value;
							this.applySettingsUpdate();
						})
				);

			new Setting(containerEl)
				.setName(t("Add progress bar to non-task bullet"))
				.setDesc(
					t(
						"Toggle this to allow adding progress bars to regular list items (non-task bullets)."
					)
				)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.addProgressBarToNonTaskBullet
						)
						.onChange(async (value) => {
							this.plugin.settings.addProgressBarToNonTaskBullet =
								value;
							this.applySettingsUpdate();
						})
				);

			new Setting(containerEl)
				.setName(t("Add progress bar to Heading"))
				.setDesc(
					t(
						"Toggle this to allow this plugin to add progress bar for Task below the headings."
					)
				)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings.addTaskProgressBarToHeading
						)
						.onChange(async (value) => {
							this.plugin.settings.addTaskProgressBarToHeading =
								value;
							this.applySettingsUpdate();
						})
				);

			new Setting(containerEl)
				.setName(t("Enable heading progress bars"))
				.setDesc(
					t(
						"Add progress bars to headings to show progress of all tasks under that heading."
					)
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.enableHeadingProgressBar)
						.onChange(async (value) => {
							this.plugin.settings.enableHeadingProgressBar =
								value;
							this.applySettingsUpdate();
						})
				);

			this.showNumberToProgressbar();

			new Setting(containerEl)
				.setName(t("Count sub children level of current Task"))
				.setDesc(
					t("Toggle this to allow this plugin to count sub tasks.")
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.countSubLevel)
						.onChange(async (value) => {
							this.plugin.settings.countSubLevel = value;
							this.applySettingsUpdate();
						})
				);
			new Setting(containerEl)
				.setName(t("Hide progress bars"))
				.setHeading();

			new Setting(containerEl)
				.setName(t("Hide progress bars based on conditions"))
				.setDesc(
					t(
						"Toggle this to enable hiding progress bars based on tags, folders, or metadata."
					)
				)
				.addToggle((toggle) =>
					toggle
						.setValue(
							this.plugin.settings
								.hideProgressBarBasedOnConditions
						)
						.onChange(async (value) => {
							this.plugin.settings.hideProgressBarBasedOnConditions =
								value;
							this.applySettingsUpdate();

							setTimeout(() => {
								this.display();
							}, 200);
						})
				);
		}

		if (this.plugin.settings.hideProgressBarBasedOnConditions) {
			new Setting(containerEl)
				.setName(t("Hide by tags"))
				.setDesc(
					t(
						'Specify tags that will hide progress bars (comma-separated, without #). Example: "no-progress-bar,hide-progress"'
					)
				)
				.addText((text) =>
					text
						.setPlaceholder(DEFAULT_SETTINGS.hideProgressBarTags)
						.setValue(this.plugin.settings.hideProgressBarTags)
						.onChange(async (value) => {
							this.plugin.settings.hideProgressBarTags = value;
							this.applySettingsUpdate();
						})
				);

			new Setting(containerEl)
				.setName(t("Hide by folders"))
				.setDesc(
					t(
						'Specify folder paths that will hide progress bars (comma-separated). Example: "Daily Notes,Projects/Hidden"'
					)
				)
				.addText((text) =>
					text
						.setPlaceholder("folder1,folder2/subfolder")
						.setValue(this.plugin.settings.hideProgressBarFolders)
						.onChange(async (value) => {
							this.plugin.settings.hideProgressBarFolders = value;
							this.applySettingsUpdate();
						})
				);

			new Setting(containerEl)
				.setName(t("Hide by metadata"))
				.setDesc(
					t(
						'Specify frontmatter metadata that will hide progress bars. Example: "hide-progress-bar: true"'
					)
				)
				.addText((text) =>
					text
						.setPlaceholder(
							DEFAULT_SETTINGS.hideProgressBarMetadata
						)
						.setValue(this.plugin.settings.hideProgressBarMetadata)
						.onChange(async (value) => {
							this.plugin.settings.hideProgressBarMetadata =
								value;
							this.applySettingsUpdate();
						})
				);
		}

		new Setting(containerEl)
			.setName(t("Parent task changer"))
			.setDesc(t("Change the parent task of the current task."))
			.setHeading();

		new Setting(containerEl)
			.setName(t("Auto complete parent task"))
			.setDesc(
				t(
					"Toggle this to allow this plugin to auto complete parent task when all child tasks are completed."
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoCompleteParent)
					.onChange(async (value) => {
						this.plugin.settings.autoCompleteParent = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("Mark parent as 'In Progress' when partially complete"))
			.setDesc(
				t(
					"When some but not all child tasks are completed, mark the parent task as 'In Progress'. Only works when 'Auto complete parent' is enabled."
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings
							.markParentInProgressWhenPartiallyComplete
					)
					.onChange(async (value) => {
						this.plugin.settings.markParentInProgressWhenPartiallyComplete =
							value;
						this.applySettingsUpdate();
					})
			);

		// Task Status Settings
		new Setting(containerEl)
			.setName(t("Task Status Settings"))
			.setDesc(
				t(
					"Select a predefined task status collection or customize your own"
				)
			)
			.setHeading()
			.addDropdown((dropdown) => {
				dropdown.addOption("custom", "Custom");
				for (const statusCollection of allStatusCollections) {
					dropdown.addOption(statusCollection, statusCollection);
				}

				// Set default value to custom
				dropdown.setValue("custom");

				dropdown.onChange(async (value) => {
					if (value === "custom") {
						return;
					}

					// Confirm before applying the theme
					const modal = new Modal(this.app);
					modal.titleEl.setText(`Apply ${value} Theme?`);

					const content = modal.contentEl.createDiv();
					content.setText(
						`This will override your current task status settings with the ${value} theme. Do you want to continue?`
					);

					const buttonContainer = modal.contentEl.createDiv();
					buttonContainer.addClass("modal-button-container");

					const cancelButton = buttonContainer.createEl("button");
					cancelButton.setText("Cancel");
					cancelButton.addEventListener("click", () => {
						dropdown.setValue("custom");
						modal.close();
					});

					const confirmButton = buttonContainer.createEl("button");
					confirmButton.setText("Apply Theme");
					confirmButton.addClass("mod-cta");
					confirmButton.addEventListener("click", async () => {
						modal.close();

						// Apply the selected theme's task statuses
						try {
							// Import the function dynamically based on the selected theme
							const functionName =
								value.toLowerCase() + "SupportedStatuses";
							const statusesModule = await import(
								"./task-status"
							);

							// Use type assertion for the dynamic function access
							const getStatuses = (statusesModule as any)[
								functionName
							];

							if (typeof getStatuses === "function") {
								const statuses = getStatuses();

								// Create a map to collect all statuses of each type
								const statusMap: Record<string, string[]> = {
									completed: [],
									inProgress: [],
									abandoned: [],
									notStarted: [],
									planned: [],
								};

								// Group statuses by their type
								for (const [symbol, _, type] of statuses) {
									if (type in statusMap) {
										statusMap[
											type as keyof typeof statusMap
										].push(symbol);
									}
								}

								// Update the settings with the collected statuses
								for (const type of Object.keys(
									this.plugin.settings.taskStatuses
								)) {
									if (
										statusMap[type] &&
										statusMap[type].length > 0
									) {
										(
											this.plugin.settings
												.taskStatuses as Record<
												string,
												string
											>
										)[type] = statusMap[type].join("|");
									}
								}

								// Save settings and refresh the display
								this.applySettingsUpdate();
								this.display();
							}
						} catch (error) {
							console.error(
								"Failed to apply task status theme:",
								error
							);
						}
					});

					modal.open();
				});
			});

		new Setting(containerEl)
			.setName(t("Completed task markers"))
			.setDesc(
				t(
					'Characters in square brackets that represent completed tasks. Example: "x|X"'
				)
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.completed)
					.setValue(this.plugin.settings.taskStatuses.completed)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.completed =
							value || DEFAULT_SETTINGS.taskStatuses.completed;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("Planned task markers"))
			.setDesc(
				t(
					'Characters in square brackets that represent planned tasks. Example: "?"'
				)
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.planned)
					.setValue(this.plugin.settings.taskStatuses.planned)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.planned =
							value || DEFAULT_SETTINGS.taskStatuses.planned;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("In progress task markers"))
			.setDesc(
				t(
					'Characters in square brackets that represent tasks in progress. Example: ">|/"'
				)
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.inProgress)
					.setValue(this.plugin.settings.taskStatuses.inProgress)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.inProgress =
							value || DEFAULT_SETTINGS.taskStatuses.inProgress;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("Abandoned task markers"))
			.setDesc(
				t(
					'Characters in square brackets that represent abandoned tasks. Example: "-"'
				)
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.abandoned)
					.setValue(this.plugin.settings.taskStatuses.abandoned)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.abandoned =
							value || DEFAULT_SETTINGS.taskStatuses.abandoned;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName("Not started task markers")
			.setDesc(
				t(
					'Characters in square brackets that represent not started tasks. Default is space " "'
				)
			)
			.addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.taskStatuses.notStarted)
					.setValue(this.plugin.settings.taskStatuses.notStarted)
					.onChange(async (value) => {
						this.plugin.settings.taskStatuses.notStarted =
							value || DEFAULT_SETTINGS.taskStatuses.notStarted;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("Count other statuses as"))
			.setDesc(
				t(
					'Select the status to count other statuses as. Default is "Not Started".'
				)
			)
			.addDropdown((dropdown) => {
				dropdown.addOption("notStarted", "Not Started");
				dropdown.addOption("abandoned", "Abandoned");
				dropdown.addOption("planned", "Planned");
				dropdown.addOption("completed", "Completed");
				dropdown.addOption("inProgress", "In Progress");
			});

		// Task Counting Settings
		new Setting(containerEl)
			.setName(t("Task Counting Settings"))
			.setDesc(t("Toggle this to allow this plugin to count sub tasks."))
			.setHeading();

		new Setting(containerEl)
			.setName(t("Exclude specific task markers"))
			.setDesc(
				t(
					'Specify task markers to exclude from counting. Example: "?|/"'
				)
			)
			.addText((text) =>
				text
					.setPlaceholder("")
					.setValue(this.plugin.settings.excludeTaskMarks)
					.onChange(async (value) => {
						this.plugin.settings.excludeTaskMarks = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("Only count specific task markers"))
			.setDesc(t("Toggle this to only count specific task markers"))
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.useOnlyCountMarks)
					.onChange(async (value) => {
						this.plugin.settings.useOnlyCountMarks = value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (this.plugin.settings.useOnlyCountMarks) {
			new Setting(containerEl)
				.setName(t("Specific task markers to count"))
				.setDesc(
					t('Specify which task markers to count. Example: "x|X|>|/"')
				)
				.addText((text) =>
					text
						.setPlaceholder(DEFAULT_SETTINGS.onlyCountTaskMarks)
						.setValue(this.plugin.settings.onlyCountTaskMarks)
						.onChange(async (value) => {
							if (value.length === 0) {
								this.plugin.settings.onlyCountTaskMarks =
									DEFAULT_SETTINGS.onlyCountTaskMarks;
							} else {
								this.plugin.settings.onlyCountTaskMarks = value;
							}
							this.applySettingsUpdate();
						})
				);
		}

		new Setting(containerEl)
			.setName(t("Task Status Switcher"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("Enable task status switcher"))
			.setDesc(
				t(
					"Enable/disable the ability to cycle through task states by clicking."
				)
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableTaskStatusSwitcher)
					.onChange(async (value) => {
						this.plugin.settings.enableTaskStatusSwitcher = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName(t("Enable custom task marks"))
			.setDesc(
				t(
					"Replace default checkboxes with styled text marks that follow your task status cycle when clicked."
				)
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableCustomTaskMarks)
					.onChange(async (value) => {
						this.plugin.settings.enableCustomTaskMarks = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName(t("Enable cycle complete status"))
			.setDesc(
				t(
					"Enable/disable the ability to automatically cycle through task states when pressing a mark."
				)
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.enableCycleCompleteStatus)
					.onChange(async (value) => {
						this.plugin.settings.enableCycleCompleteStatus = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName(t("Always cycle new tasks"))
			.setDesc(
				t(
					"When enabled, newly inserted tasks will immediately cycle to the next status. When disabled, newly inserted tasks with valid marks will keep their original mark."
				)
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.alwaysCycleNewTasks)
					.onChange(async (value) => {
						this.plugin.settings.alwaysCycleNewTasks = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName(t("Task Status Cycle and Marks"))
			.setDesc(
				t(
					"Define task states and their corresponding marks. The order from top to bottom defines the cycling sequence."
				)
			);

		// Create a container for the task states list
		const taskStatesContainer = containerEl.createDiv({
			cls: "task-states-container",
		});

		// Function to refresh the task states list
		const refreshTaskStatesList = () => {
			// Clear the container
			taskStatesContainer.empty();

			// Get current cycle and marks
			const cycle = this.plugin.settings.taskStatusCycle;
			const marks = this.plugin.settings.taskStatusMarks;

			// Initialize excludeMarksFromCycle if it doesn't exist
			if (!this.plugin.settings.excludeMarksFromCycle) {
				this.plugin.settings.excludeMarksFromCycle = [];
			}

			// Add each status in the cycle
			cycle.forEach((state, index) => {
				const stateRow = taskStatesContainer.createDiv({
					cls: "task-state-row",
				});

				// Create the setting
				const stateSetting = new Setting(stateRow)
					.setName(`Status #${index + 1}`)
					.addText((text) => {
						text.setValue(state)
							.setPlaceholder("Status name")
							.onChange((value) => {
								// Update the state name in both cycle and marks
								const oldState = cycle[index];
								cycle[index] = value;

								// If the old state had a mark, preserve it with the new name
								if (oldState in marks) {
									marks[value] = marks[oldState];
									delete marks[oldState];
								}

								this.applySettingsUpdate();
							});
					})
					.addText((text) => {
						text.setValue(marks[state] || " ")
							.setPlaceholder("Mark")
							.onChange((value) => {
								// Only use the first character
								const mark = value.trim().charAt(0) || " ";
								marks[state] = mark;
								this.applySettingsUpdate();
							});
						text.inputEl.maxLength = 1;
						text.inputEl.style.width = "40px";
					});

				// Add toggle for including in cycle
				stateSetting.addToggle((toggle) => {
					toggle
						.setTooltip("Include in cycle")
						.setValue(
							!this.plugin.settings.excludeMarksFromCycle.includes(
								state
							)
						)
						.onChange((value) => {
							if (!value) {
								// Add to exclude list if not already there
								if (
									!this.plugin.settings.excludeMarksFromCycle.includes(
										state
									)
								) {
									this.plugin.settings.excludeMarksFromCycle.push(
										state
									);
								}
							} else {
								// Remove from exclude list
								this.plugin.settings.excludeMarksFromCycle =
									this.plugin.settings.excludeMarksFromCycle.filter(
										(s) => s !== state
									);
							}
							this.applySettingsUpdate();
						});
				});

				// Add buttons for moving up/down and removing
				stateSetting.addExtraButton((button) => {
					button
						.setIcon("arrow-up")
						.setTooltip("Move up")
						.onClick(() => {
							if (index > 0) {
								// Swap with the previous item
								[cycle[index - 1], cycle[index]] = [
									cycle[index],
									cycle[index - 1],
								];
								this.applySettingsUpdate();
								refreshTaskStatesList();
							}
						});
					button.extraSettingsEl.style.marginRight = "0";
				});

				stateSetting.addExtraButton((button) => {
					button
						.setIcon("arrow-down")
						.setTooltip("Move down")
						.onClick(() => {
							if (index < cycle.length - 1) {
								// Swap with the next item
								[cycle[index], cycle[index + 1]] = [
									cycle[index + 1],
									cycle[index],
								];
								this.applySettingsUpdate();
								refreshTaskStatesList();
							}
						});
					button.extraSettingsEl.style.marginRight = "0";
				});

				stateSetting.addExtraButton((button) => {
					button
						.setIcon("trash")
						.setTooltip("Remove")
						.onClick(() => {
							// Remove from cycle
							cycle.splice(index, 1);
							// Don't remove from marks to preserve settings
							this.applySettingsUpdate();
							refreshTaskStatesList();
						});
					button.extraSettingsEl.style.marginRight = "0";
				});
			});

			// Add button to add new status
			const addButtonContainer = taskStatesContainer.createDiv();
			new Setting(addButtonContainer).addButton((button) => {
				button
					.setButtonText(t("Add Status"))
					.setCta()
					.onClick(() => {
						// Add a new status to the cycle with a default mark
						const newStatus = `STATUS_${cycle.length + 1}`;
						cycle.push(newStatus);
						marks[newStatus] = " ";
						this.applySettingsUpdate();
						refreshTaskStatesList();
					});
			});
		};

		// Initial render of the task states list
		refreshTaskStatesList();

		this.addPriorityPickerSettings();
		this.addDatePickerSettings();
		this.addQuickCaptureSettings();

		// Add Completed Task Mover settings
		new Setting(containerEl)
			.setName(t("Completed Task Mover"))
			.setHeading();

		new Setting(containerEl)
			.setName(t("Enable completed task mover"))
			.setDesc(
				t(
					"Toggle this to enable commands for moving completed tasks to another file."
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.completedTaskMover
							.enableCompletedTaskMover
					)
					.onChange(async (value) => {
						this.plugin.settings.completedTaskMover.enableCompletedTaskMover =
							value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (this.plugin.settings.completedTaskMover.enableCompletedTaskMover) {
			new Setting(containerEl)
				.setName(t("Task marker type"))
				.setDesc(t("Choose what type of marker to add to moved tasks"))
				.addDropdown((dropdown) => {
					dropdown
						.addOption("version", "Version marker")
						.addOption("date", "Date marker")
						.addOption("custom", "Custom marker")
						.setValue(
							this.plugin.settings.completedTaskMover
								.taskMarkerType
						)
						.onChange(
							async (value: "version" | "date" | "custom") => {
								this.plugin.settings.completedTaskMover.taskMarkerType =
									value;
								this.applySettingsUpdate();

								setTimeout(() => {
									this.display();
								}, 200);
							}
						);
				});

			// Show specific settings based on marker type
			const markerType =
				this.plugin.settings.completedTaskMover.taskMarkerType;

			if (markerType === "version") {
				new Setting(containerEl)
					.setName(t("Version marker text"))
					.setDesc(
						t(
							"Text to append to tasks when moved (e.g., 'version 1.0')"
						)
					)
					.addText((text) =>
						text
							.setPlaceholder("version 1.0")
							.setValue(
								this.plugin.settings.completedTaskMover
									.versionMarker
							)
							.onChange(async (value) => {
								this.plugin.settings.completedTaskMover.versionMarker =
									value;
								this.applySettingsUpdate();
							})
					);
			} else if (markerType === "date") {
				new Setting(containerEl)
					.setName(t("Date marker text"))
					.setDesc(
						t(
							"Text to append to tasks when moved (e.g., 'archived on 2023-12-31')"
						)
					)
					.addText((text) =>
						text
							.setPlaceholder("archived on {{date}}")
							.setValue(
								this.plugin.settings.completedTaskMover
									.dateMarker
							)
							.onChange(async (value) => {
								this.plugin.settings.completedTaskMover.dateMarker =
									value;
								this.applySettingsUpdate();
							})
					);
			} else if (markerType === "custom") {
				new Setting(containerEl)
					.setName(t("Custom marker text"))
					.setDesc(
						t(
							"Use {{DATE:format}} for date formatting (e.g., {{DATE:YYYY-MM-DD}}"
						)
					)
					.addText((text) =>
						text
							.setPlaceholder("moved {{DATE:YYYY-MM-DD HH:mm}}")
							.setValue(
								this.plugin.settings.completedTaskMover
									.customMarker
							)
							.onChange(async (value) => {
								this.plugin.settings.completedTaskMover.customMarker =
									value;
								this.applySettingsUpdate();
							})
					);
			}

			new Setting(containerEl)
				.setName(t("Treat abandoned tasks as completed"))
				.setDesc(
					t(
						"If enabled, abandoned tasks will be treated as completed."
					)
				)
				.addToggle((toggle) => {
					toggle.setValue(
						this.plugin.settings.completedTaskMover
							.treatAbandonedAsCompleted
					);
					toggle.onChange((value) => {
						this.plugin.settings.completedTaskMover.treatAbandonedAsCompleted =
							value;
						this.applySettingsUpdate();
					});
				});

			new Setting(containerEl)
				.setName(t("Complete all moved tasks"))
				.setDesc(
					t(
						"If enabled, all moved tasks will be marked as completed."
					)
				)
				.addToggle((toggle) => {
					toggle.setValue(
						this.plugin.settings.completedTaskMover
							.completeAllMovedTasks
					);
					toggle.onChange((value) => {
						this.plugin.settings.completedTaskMover.completeAllMovedTasks =
							value;
						this.applySettingsUpdate();
					});
				});

			new Setting(containerEl)
				.setName(t("With current file link"))
				.setDesc(
					t(
						"A link to the current file will be added to the parent task of the moved tasks."
					)
				)
				.addToggle((toggle) => {
					toggle.setValue(
						this.plugin.settings.completedTaskMover
							.withCurrentFileLink
					);
					toggle.onChange((value) => {
						this.plugin.settings.completedTaskMover.withCurrentFileLink =
							value;
						this.applySettingsUpdate();
					});
				});
		}

		// Add task filter settings
		this.addTaskFilterSettings();

		// Add workflow settings
		this.addWorkflowSettings();

		new Setting(containerEl).setName(t("Say Thank You")).setHeading();

		new Setting(containerEl)
			.setName(t("Donate"))
			.setDesc(
				t(
					"If you like this plugin, consider donating to support continued development:"
				)
			)
			.addButton((bt) => {
				bt.buttonEl.outerHTML = `<a href="https://www.buymeacoffee.com/boninall"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=boninall&button_colour=6495ED&font_colour=ffffff&font_family=Inter&outline_colour=000000&coffee_colour=FFDD00"></a>`;
			});
	}

	showNumberToProgressbar() {
		new Setting(this.containerEl)
			.setName(t("Add number to the Progress Bar"))
			.setDesc(
				t(
					"Toggle this to allow this plugin to add tasks number to progress bar."
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.addNumberToProgressBar)
					.onChange(async (value) => {
						this.plugin.settings.addNumberToProgressBar = value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (this.plugin.settings.addNumberToProgressBar) {
			new Setting(this.containerEl)
				.setName(t("Show percentage"))
				.setDesc(
					t(
						"Toggle this to allow this plugin to show percentage in the progress bar."
					)
				)
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings.showPercentage)
						.onChange(async (value) => {
							this.plugin.settings.showPercentage = value;
							this.applySettingsUpdate();

							setTimeout(() => {
								this.display();
							}, 200);
						})
				);

			if (this.plugin.settings.showPercentage) {
				new Setting(this.containerEl)
					.setName(t("Customize progress text"))
					.setDesc(
						t(
							"Toggle this to customize text representation for different progress percentage ranges."
						)
					)
					.addToggle((toggle) =>
						toggle
							.setValue(
								this.plugin.settings.customizeProgressRanges
							)
							.onChange(async (value) => {
								this.plugin.settings.customizeProgressRanges =
									value;
								this.applySettingsUpdate();

								setTimeout(() => {
									this.display();
								}, 200);
							})
					);

				if (this.plugin.settings.customizeProgressRanges) {
					this.addProgressRangesSettings();
				}
			}
		}
	}

	addProgressRangesSettings() {
		new Setting(this.containerEl)
			.setName(t("Progress Ranges"))
			.setDesc(
				t(
					"Define progress ranges and their corresponding text representations."
				)
			)
			.setHeading();

		// Display existing ranges
		this.plugin.settings.progressRanges.forEach((range, index) => {
			new Setting(this.containerEl)
				.setName(`Range ${index + 1}: ${range.min}%-${range.max}%`)
				.setDesc(
					`Use {{PROGRESS}} as a placeholder for the percentage value`
				)
				.addText((text) =>
					text
						.setPlaceholder(
							"Template text with {{PROGRESS}} placeholder"
						)
						.setValue(range.text)
						.onChange(async (value) => {
							this.plugin.settings.progressRanges[index].text =
								value;
							this.applySettingsUpdate();
						})
				)
				.addButton((button) => {
					button.setButtonText("Delete").onClick(async () => {
						this.plugin.settings.progressRanges.splice(index, 1);
						this.applySettingsUpdate();
						this.display();
					});
				});
		});

		new Setting(this.containerEl)
			.setName(t("Add new range"))
			.setDesc(t("Add a new progress percentage range with custom text"));

		// Add a new range
		const newRangeSetting = new Setting(this.containerEl);
		newRangeSetting.infoEl.detach();

		newRangeSetting
			.addText((text) =>
				text
					.setPlaceholder(t("Min percentage (0-100)"))
					.setValue("")
					.onChange(async (value) => {
						// This will be handled when the user clicks the Add button
					})
			)
			.addText((text) =>
				text
					.setPlaceholder(t("Max percentage (0-100)"))
					.setValue("")
					.onChange(async (value) => {
						// This will be handled when the user clicks the Add button
					})
			)
			.addText((text) =>
				text
					.setPlaceholder(t("Text template (use {{PROGRESS}})"))
					.setValue("")
					.onChange(async (value) => {
						// This will be handled when the user clicks the Add button
					})
			)
			.addButton((button) => {
				button.setButtonText("Add").onClick(async () => {
					const settingsContainer = button.buttonEl.parentElement;
					if (!settingsContainer) return;

					const inputs = settingsContainer.querySelectorAll("input");
					if (inputs.length < 3) return;

					const min = parseInt(inputs[0].value);
					const max = parseInt(inputs[1].value);
					const text = inputs[2].value;

					if (isNaN(min) || isNaN(max) || !text) {
						return;
					}

					this.plugin.settings.progressRanges.push({
						min,
						max,
						text,
					});

					// Clear inputs
					inputs[0].value = "";
					inputs[1].value = "";
					inputs[2].value = "";

					this.applySettingsUpdate();
					this.display();
				});
			});

		// Reset to defaults
		new Setting(this.containerEl)
			.setName(t("Reset to defaults"))
			.setDesc(t("Reset progress ranges to default values"))
			.addButton((button) => {
				button.setButtonText(t("Reset")).onClick(async () => {
					this.plugin.settings.progressRanges = [
						{
							min: 0,
							max: 20,
							text: t("Just started {{PROGRESS}}%"),
						},
						{
							min: 20,
							max: 40,
							text: t("Making progress {{PROGRESS}}%"),
						},
						{ min: 40, max: 60, text: t("Half way {{PROGRESS}}%") },
						{
							min: 60,
							max: 80,
							text: t("Good progress {{PROGRESS}}%"),
						},
						{
							min: 80,
							max: 100,
							text: t("Almost there {{PROGRESS}}%"),
						},
					];
					this.applySettingsUpdate();
					this.display();
				});
			});
	}

	addPriorityPickerSettings() {
		const { containerEl } = this;

		new Setting(containerEl)
			.setName(t("Priority Picker Settings"))
			.setDesc(
				t(
					"Toggle to enable priority picker dropdown for emoji and letter format priorities."
				)
			)
			.setHeading();

		new Setting(containerEl)
			.setName(t("Enable priority picker"))
			.setDesc(
				t(
					"Toggle to enable priority picker dropdown for emoji and letter format priorities."
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enablePriorityPicker)
					.onChange(async (value) => {
						this.plugin.settings.enablePriorityPicker = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("Enable priority keyboard shortcuts"))
			.setDesc(
				t(
					"Toggle to enable keyboard shortcuts for setting task priorities."
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.enablePriorityKeyboardShortcuts
					)
					.onChange(async (value) => {
						this.plugin.settings.enablePriorityKeyboardShortcuts =
							value;
						this.applySettingsUpdate();
					})
			);
	}

	addDatePickerSettings() {
		new Setting(this.containerEl).setName(t("Date picker")).setHeading();

		new Setting(this.containerEl)
			.setName(t("Enable date picker"))
			.setDesc(
				t(
					"Toggle this to enable date picker for tasks. This will add a calendar icon near your tasks which you can click to select a date."
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableDatePicker)
					.onChange(async (value) => {
						this.plugin.settings.enableDatePicker = value;
						this.applySettingsUpdate();
					})
			);

		// Date mark setting
		new Setting(this.containerEl)
			.setName(t("Date mark"))
			.setDesc(
				t(
					"Emoji mark to identify dates. You can use multiple emoji separated by commas."
				)
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.dateMark)
					.onChange(async (value) => {
						this.plugin.settings.dateMark = value;
						this.applySettingsUpdate();
					})
			);
	}

	addQuickCaptureSettings() {
		new Setting(this.containerEl).setName(t("Quick capture")).setHeading();

		new Setting(this.containerEl)
			.setName(t("Enable quick capture"))
			.setDesc(
				t(
					"Toggle this to enable Org-mode style quick capture panel. Press Alt+C to open the capture panel."
				)
			)
			.addToggle((toggle) =>
				toggle
					.setValue(
						this.plugin.settings.quickCapture.enableQuickCapture
					)
					.onChange(async (value) => {
						this.plugin.settings.quickCapture.enableQuickCapture =
							value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					})
			);

		if (!this.plugin.settings.quickCapture.enableQuickCapture) return;

		new Setting(this.containerEl)
			.setName(t("Target file"))
			.setDesc(
				t(
					"The file where captured text will be saved. You can include a path, e.g., 'folder/Quick Capture.md'"
				)
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.quickCapture.targetFile)
					.onChange(async (value) => {
						this.plugin.settings.quickCapture.targetFile = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(this.containerEl)
			.setName(t("Placeholder text"))
			.setDesc(t("Placeholder text to display in the capture panel"))
			.addText((text) =>
				text
					.setValue(this.plugin.settings.quickCapture.placeholder)
					.onChange(async (value) => {
						this.plugin.settings.quickCapture.placeholder = value;
						this.applySettingsUpdate();
					})
			);

		new Setting(this.containerEl)
			.setName(t("Append to file"))
			.setDesc(
				t(
					"If enabled, captured text will be appended to the target file. If disabled, it will replace the file content."
				)
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOption("append", "Append")
					.addOption("prepend", "Prepend")
					.addOption("replace", "Replace")
					.setValue(this.plugin.settings.quickCapture.appendToFile)
					.onChange(async (value) => {
						this.plugin.settings.quickCapture.appendToFile =
							value as "append" | "prepend" | "replace";
						this.applySettingsUpdate();
					})
			);
	}

	addTaskFilterSettings() {
		const containerEl = this.containerEl;

		new Setting(containerEl).setName(t("Task Filter")).setHeading();

		new Setting(containerEl)
			.setName(t("Enable Task Filter"))
			.setDesc(t("Toggle this to enable the task filter panel"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.taskFilter.enableTaskFilter)
					.onChange(async (value) => {
						this.plugin.settings.taskFilter.enableTaskFilter =
							value;
						this.applySettingsUpdate();
					});
			});

		// Preset filters section
		new Setting(containerEl)
			.setName(t("Preset Filters"))
			.setDesc(
				t(
					"Create and manage preset filters for quick access to commonly used task filters."
				)
			);

		// Add a container for the preset filters
		const presetFiltersContainer = containerEl.createDiv({
			cls: "preset-filters-container",
		});

		// Function to refresh the preset filters list
		const refreshPresetFiltersList = () => {
			// Clear the container
			presetFiltersContainer.empty();

			// Get current preset filters
			const presetFilters =
				this.plugin.settings.taskFilter.presetTaskFilters;

			if (presetFilters.length === 0) {
				presetFiltersContainer.createEl("div", {
					cls: "no-presets-message",
					text: t(
						"No preset filters created yet. Click 'Add New Preset' to create one."
					),
				});
			}

			// Add each preset filter in the list
			presetFilters.forEach((preset, index) => {
				const presetRow = presetFiltersContainer.createDiv({
					cls: "preset-filter-row",
				});

				// Create the setting
				const presetSetting = new Setting(presetRow)
					.setName(`Preset #${index + 1}`)
					.addText((text) => {
						text.setValue(preset.name)
							.setPlaceholder("Preset name")
							.onChange((value) => {
								preset.name = value;
								this.applySettingsUpdate();
							});
					});

				// Add buttons for editing, removing
				presetSetting.addExtraButton((button) => {
					button
						.setIcon("pencil")
						.setTooltip("Edit Filter")
						.onClick(() => {
							// Show modal to edit filter options
							new PresetFilterModal(this.app, preset, () => {
								this.applySettingsUpdate();
								refreshPresetFiltersList();
							}).open();
						});
				});

				presetSetting.addExtraButton((button) => {
					button
						.setIcon("trash")
						.setTooltip("Remove")
						.onClick(() => {
							// Remove the preset
							presetFilters.splice(index, 1);
							this.applySettingsUpdate();
							refreshPresetFiltersList();
						});
				});
			});

			// Add button to add new preset
			const addButtonContainer = presetFiltersContainer.createDiv();
			new Setting(addButtonContainer)
				.addButton((button) => {
					button
						.setButtonText("Add New Preset")
						.setCta()
						.onClick(() => {
							// Add a new preset with default options
							const newPreset = {
								id: this.generateUniqueId(),
								name: "New Filter",
								options: {
									includeCompleted: true,
									includeInProgress: true,
									includeAbandoned: true,
									includeNotStarted: true,
									includePlanned: true,
									includeParentTasks: true,
									includeChildTasks: true,
									includeSiblingTasks: false,
									advancedFilterQuery: "",
									filterMode: "INCLUDE" as
										| "INCLUDE"
										| "EXCLUDE",
								},
							};

							this.plugin.settings.taskFilter.presetTaskFilters.push(
								newPreset
							);
							this.applySettingsUpdate();

							// Open the edit modal for the new preset
							new PresetFilterModal(this.app, newPreset, () => {
								this.applySettingsUpdate();
								refreshPresetFiltersList();
							}).open();

							refreshPresetFiltersList();
						});
				})
				.addButton((button) => {
					button
						.setButtonText("Reset to Default Presets")
						.onClick(() => {
							// Show confirmation modal
							const modal = new Modal(this.app);
							modal.titleEl.setText("Reset to Default Presets");

							const content = modal.contentEl.createDiv();
							content.setText(
								"This will replace all your current presets with the default set. Are you sure?"
							);

							const buttonContainer = modal.contentEl.createDiv();
							buttonContainer.addClass("modal-button-container");

							const cancelButton =
								buttonContainer.createEl("button");
							cancelButton.setText("Cancel");
							cancelButton.addEventListener("click", () => {
								modal.close();
							});

							const confirmButton =
								buttonContainer.createEl("button");
							confirmButton.setText("Reset");
							confirmButton.addClass("mod-warning");
							confirmButton.addEventListener("click", () => {
								this.createDefaultPresetFilters();
								refreshPresetFiltersList();
								modal.close();
							});

							modal.open();
						});
				});
		};

		// Initial render of the preset filters list
		refreshPresetFiltersList();
	}

	// Generate a unique ID for preset filters
	generateUniqueId(): string {
		return Date.now().toString() + Math.random().toString(36).substr(2, 9);
	}

	// Create default preset filters
	createDefaultPresetFilters() {
		// Clear existing presets if any
		this.plugin.settings.taskFilter.presetTaskFilters = [];

		// Add default presets
		const defaultPresets = [
			{
				id: this.generateUniqueId(),
				name: "Incomplete Tasks",
				options: {
					includeCompleted: false,
					includeInProgress: true,
					includeAbandoned: false,
					includeNotStarted: true,
					includePlanned: true,
					includeParentTasks: true,
					includeChildTasks: true,
					includeSiblingTasks: false,
					advancedFilterQuery: "",
					filterMode: "INCLUDE" as "INCLUDE" | "EXCLUDE",
				},
			},
			{
				id: this.generateUniqueId(),
				name: "In Progress Tasks",
				options: {
					includeCompleted: false,
					includeInProgress: true,
					includeAbandoned: false,
					includeNotStarted: false,
					includePlanned: false,
					includeParentTasks: true,
					includeChildTasks: true,
					includeSiblingTasks: false,
					advancedFilterQuery: "",
					filterMode: "INCLUDE" as "INCLUDE" | "EXCLUDE",
				},
			},
			{
				id: this.generateUniqueId(),
				name: "Completed Tasks",
				options: {
					includeCompleted: true,
					includeInProgress: false,
					includeAbandoned: false,
					includeNotStarted: false,
					includePlanned: false,
					includeParentTasks: false,
					includeChildTasks: true,
					includeSiblingTasks: false,
					advancedFilterQuery: "",
					filterMode: "INCLUDE" as "INCLUDE" | "EXCLUDE",
				},
			},
			{
				id: this.generateUniqueId(),
				name: "All Tasks",
				options: {
					includeCompleted: true,
					includeInProgress: true,
					includeAbandoned: true,
					includeNotStarted: true,
					includePlanned: true,
					includeParentTasks: true,
					includeChildTasks: true,
					includeSiblingTasks: true,
					advancedFilterQuery: "",
					filterMode: "INCLUDE" as "INCLUDE" | "EXCLUDE",
				},
			},
		];

		// Add default presets to settings
		this.plugin.settings.taskFilter.presetTaskFilters = defaultPresets;
		this.applySettingsUpdate();
	}

	// Add new method for workflow settings
	addWorkflowSettings() {
		const containerEl = this.containerEl;

		new Setting(containerEl)
			.setName(t("Workflow"))
			.setDesc(
				t("Configure task workflows for project and process management")
			)
			.setHeading();

		new Setting(containerEl)
			.setName(t("Enable workflow"))
			.setDesc(t("Toggle to enable the workflow system for tasks"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.workflow.enableWorkflow)
					.onChange(async (value) => {
						this.plugin.settings.workflow.enableWorkflow = value;
						this.applySettingsUpdate();

						setTimeout(() => {
							this.display();
						}, 200);
					});
			});

		if (!this.plugin.settings.workflow.enableWorkflow) return;

		new Setting(containerEl)
			.setName(t("Auto-add timestamp"))
			.setDesc(
				t(
					"Automatically add a timestamp to the task when it is created"
				)
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.workflow.autoAddTimestamp)
					.onChange(async (value) => {
						this.plugin.settings.workflow.autoAddTimestamp = value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName(t("Auto remove last stage marker"))
			.setDesc(
				t(
					"Automatically remove the last stage marker when a task is completed"
				)
			)
			.addToggle((toggle) => {
				toggle
					.setValue(
						this.plugin.settings.workflow.autoRemoveLastStageMarker
					)
					.onChange(async (value) => {
						this.plugin.settings.workflow.autoRemoveLastStageMarker =
							value;
						this.applySettingsUpdate();
					});
			});

		new Setting(containerEl)
			.setName(t("Auto-add next task"))
			.setDesc(
				t(
					"Automatically create a new task with the next stage when completing a task"
				)
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.workflow.autoAddNextTask)
					.onChange(async (value) => {
						this.plugin.settings.workflow.autoAddNextTask = value;
						this.applySettingsUpdate();
					});
			});

		// Workflow definitions list
		new Setting(containerEl)
			.setName(t("Workflow definitions"))
			.setDesc(
				t(
					"Configure workflow templates for different types of processes"
				)
			);

		// Create a container for the workflow list
		const workflowContainer = containerEl.createDiv({
			cls: "workflow-container",
		});

		// Function to display workflow list
		const refreshWorkflowList = () => {
			// Clear the container
			workflowContainer.empty();

			const workflows = this.plugin.settings.workflow.definitions;

			if (workflows.length === 0) {
				workflowContainer.createEl("div", {
					cls: "no-workflows-message",
					text: t(
						"No workflow definitions created yet. Click 'Add New Workflow' to create one."
					),
				});
			}

			// Add each workflow in the list
			workflows.forEach((workflow, index) => {
				const workflowRow = workflowContainer.createDiv({
					cls: "workflow-row",
				});

				const workflowSetting = new Setting(workflowRow)
					.setName(workflow.name)
					.setDesc(workflow.description || "");

				// Add edit button
				workflowSetting.addExtraButton((button) => {
					button
						.setIcon("pencil")
						.setTooltip(t("Edit workflow"))
						.onClick(() => {
							new WorkflowDefinitionModal(
								this.app,
								this.plugin,
								workflow,
								(updatedWorkflow) => {
									// Update the workflow
									this.plugin.settings.workflow.definitions[
										index
									] = updatedWorkflow;
									this.applySettingsUpdate();
									refreshWorkflowList();
								}
							).open();
						});
				});

				// Add delete button
				workflowSetting.addExtraButton((button) => {
					button
						.setIcon("trash")
						.setTooltip(t("Remove workflow"))
						.onClick(() => {
							// Show confirmation dialog
							const modal = new Modal(this.app);
							modal.titleEl.setText(t("Delete workflow"));

							const content = modal.contentEl.createDiv();
							content.setText(
								t(
									`Are you sure you want to delete the '${workflow.name}' workflow?`
								)
							);

							const buttonContainer = modal.contentEl.createDiv();
							buttonContainer.addClass("modal-button-container");

							const cancelButton =
								buttonContainer.createEl("button");
							cancelButton.setText(t("Cancel"));
							cancelButton.addEventListener("click", () => {
								modal.close();
							});

							const deleteButton =
								buttonContainer.createEl("button");
							deleteButton.setText(t("Delete"));
							deleteButton.addClass("mod-warning");
							deleteButton.addEventListener("click", () => {
								// Remove the workflow
								this.plugin.settings.workflow.definitions.splice(
									index,
									1
								);
								this.applySettingsUpdate();
								refreshWorkflowList();
								modal.close();
							});

							modal.open();
						});
				});

				// Show stage information
				const stagesInfo = workflowRow.createDiv({
					cls: "workflow-stages-info",
				});

				if (workflow.stages.length > 0) {
					const stagesList = stagesInfo.createEl("ul");
					stagesList.addClass("workflow-stages-list");

					workflow.stages.forEach((stage) => {
						const stageItem = stagesList.createEl("li");
						stageItem.addClass("workflow-stage-item");
						stageItem.addClass(`workflow-stage-type-${stage.type}`);

						const stageName = stageItem.createSpan({
							text: stage.name,
						});

						if (stage.type === "cycle") {
							stageItem.addClass("workflow-stage-cycle");
							stageName.addClass("workflow-stage-name-cycle");
						} else if (stage.type === "terminal") {
							stageItem.addClass("workflow-stage-terminal");
							stageName.addClass("workflow-stage-name-terminal");
						}
					});
				}
			});

			// Add button to create a new workflow
			const addButtonContainer = workflowContainer.createDiv();
			new Setting(addButtonContainer).addButton((button) => {
				button
					.setButtonText(t("Add New Workflow"))
					.setCta()
					.onClick(() => {
						// Create a new empty workflow
						const newWorkflow = {
							id: this.generateUniqueId(),
							name: t("New Workflow"),
							description: "",
							stages: [],
							metadata: {
								version: "1.0",
								created: new Date().toISOString().split("T")[0],
								lastModified: new Date()
									.toISOString()
									.split("T")[0],
							},
						};

						// Show the edit modal for the new workflow
						new WorkflowDefinitionModal(
							this.app,
							this.plugin,
							newWorkflow,
							(createdWorkflow) => {
								// Add the workflow to the list
								this.plugin.settings.workflow.definitions.push(
									createdWorkflow
								);
								this.applySettingsUpdate();
								refreshWorkflowList();
							}
						).open();
					});
			});
		};

		// Initial render of the workflow list
		refreshWorkflowList();
	}
}

class PresetFilterModal extends Modal {
	constructor(app: App, private preset: any, private onSave: () => void) {
		super(app);
		// Migrate old preset options if needed
		if (this.preset && this.preset.options) {
			this.preset.options = migrateOldFilterOptions(this.preset.options);
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Set modal title
		this.titleEl.setText(t("Edit Filter: ") + this.preset.name);

		// Create form for filter options
		new Setting(contentEl).setName(t("Filter name")).addText((text) => {
			text.setValue(this.preset.name).onChange((value) => {
				this.preset.name = value;
			});
		});

		// Task status section
		new Setting(contentEl)
			.setName(t("Task Status"))
			.setDesc(t("Include or exclude tasks based on their status"));

		const statusOptions = [
			{ id: "includeCompleted", name: t("Include Completed Tasks") },
			{ id: "includeInProgress", name: t("Include In Progress Tasks") },
			{ id: "includeAbandoned", name: t("Include Abandoned Tasks") },
			{ id: "includeNotStarted", name: t("Include Not Started Tasks") },
			{ id: "includePlanned", name: t("Include Planned Tasks") },
		];

		for (const option of statusOptions) {
			new Setting(contentEl).setName(option.name).addToggle((toggle) => {
				toggle
					.setValue(this.preset.options[option.id])
					.onChange((value) => {
						this.preset.options[option.id] = value;
					});
			});
		}

		// Related tasks section
		new Setting(contentEl)
			.setName(t("Related Tasks"))
			.setDesc(
				t("Include parent, child, and sibling tasks in the filter")
			);

		const relatedOptions = [
			{ id: "includeParentTasks", name: t("Include Parent Tasks") },
			{ id: "includeChildTasks", name: t("Include Child Tasks") },
			{ id: "includeSiblingTasks", name: t("Include Sibling Tasks") },
		];

		for (const option of relatedOptions) {
			new Setting(contentEl).setName(option.name).addToggle((toggle) => {
				toggle
					.setValue(this.preset.options[option.id])
					.onChange((value) => {
						this.preset.options[option.id] = value;
					});
			});
		}

		// Advanced filter section
		new Setting(contentEl)
			.setName(t("Advanced Filter"))
			.setDesc(
				t(
					"Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1'"
				)
			);

		new Setting(contentEl)
			.setName(t("Filter query"))
			.setDesc(
				t(
					"Use boolean operations: AND, OR, NOT. Example: 'text content AND #tag1'"
				)
			)
			.addText((text) => {
				text.setValue(this.preset.options.advancedFilterQuery).onChange(
					(value) => {
						this.preset.options.advancedFilterQuery = value;
					}
				);
			});

		new Setting(contentEl)
			.setName(t("Filter Mode"))
			.setDesc(
				t("Choose whether to show or hide tasks that match the filters")
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("INCLUDE", t("Show matching tasks"))
					.addOption("EXCLUDE", t("Hide matching tasks"))
					.setValue(this.preset.options.filterMode || "INCLUDE")
					.onChange((value: "INCLUDE" | "EXCLUDE") => {
						this.preset.options.filterMode = value;
					});
			});

		// Save and cancel buttons
		new Setting(contentEl)
			.addButton((button) => {
				button
					.setButtonText(t("Save"))
					.setCta()
					.onClick(() => {
						this.onSave();
						this.close();
					});
			})
			.addButton((button) => {
				button.setButtonText(t("Cancel")).onClick(() => {
					this.close();
				});
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class WorkflowDefinitionModal extends Modal {
	workflow: any;
	onSave: (workflow: any) => void;
	plugin: TaskProgressBarPlugin;

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		workflow: any,
		onSave: (workflow: any) => void
	) {
		super(app);
		this.plugin = plugin;
		this.workflow = JSON.parse(JSON.stringify(workflow)); // Deep copy to avoid direct mutation
		this.onSave = onSave;
	}

	onOpen() {
		const { contentEl, titleEl } = this;

		this.modalEl.toggleClass("modal-workflow-definition", true);
		titleEl.setText(
			this.workflow.id
				? t(`Edit Workflow: ${this.workflow.name}`)
				: t("Create New Workflow")
		);

		// Basic workflow information
		const formContainer = contentEl.createDiv({ cls: "workflow-form" });

		new Setting(formContainer)
			.setName(t("Workflow name"))
			.setDesc(t("A descriptive name for the workflow"))
			.addText((text) => {
				text.setValue(this.workflow.name || "").onChange((value) => {
					this.workflow.name = value;
				});
			});

		new Setting(formContainer)
			.setName(t("Workflow ID"))
			.setDesc(t("A unique identifier for the workflow (used in tags)"))
			.addText((text) => {
				text.setValue(this.workflow.id || "")
					.setPlaceholder("unique_id")
					.onChange((value) => {
						this.workflow.id = value;
					});
			});

		new Setting(formContainer)
			.setName(t("Description"))
			.setDesc(t("Optional description for the workflow"))
			.addTextArea((textarea) => {
				textarea
					.setValue(this.workflow.description || "")
					.setPlaceholder(
						t("Describe the purpose and use of this workflow...")
					)
					.onChange((value) => {
						this.workflow.description = value;
					});

				textarea.inputEl.rows = 3;
				textarea.inputEl.cols = 40;
			});

		// Stages section
		const stagesSection = contentEl.createDiv({
			cls: "workflow-stages-section",
		});
		const stagesHeading = stagesSection.createEl("h2", {
			text: t("Workflow Stages"),
		});

		const stagesContainer = stagesSection.createDiv({
			cls: "workflow-stages-container",
		});

		// Function to render the stages list
		const renderStages = () => {
			stagesContainer.empty();

			if (!this.workflow.stages || this.workflow.stages.length === 0) {
				stagesContainer.createEl("p", {
					text: t(
						"No stages defined yet. Add a stage to get started."
					),
					cls: "no-stages-message",
				});
			} else {
				// Create a sortable list of stages
				const stagesList = stagesContainer.createEl("ul", {
					cls: "workflow-stages-list",
				});

				this.workflow.stages.forEach((stage: any, index: number) => {
					const stageItem = stagesList.createEl("li", {
						cls: "workflow-stage-item",
					});

					// Create a setting for each stage
					const stageSetting = new Setting(stageItem)
						.setName(stage.name)
						.setDesc(stage.type);

					stageSetting.settingEl.toggleClass(
						[
							"workflow-stage-type-cycle",
							"workflow-stage-type-linear",
							"workflow-stage-type-parallel",
							"workflow-stage-type-conditional",
							"workflow-stage-type-custom",
						].includes(stage.type)
							? stage.type
							: "workflow-stage-type-unknown",
						true
					);

					// Edit button
					stageSetting.addExtraButton((button) => {
						button
							.setIcon("pencil")
							.setTooltip(t("Edit"))
							.onClick(() => {
								new StageEditModal(
									this.app,
									stage,
									this.workflow.stages,
									(updatedStage) => {
										this.workflow.stages[index] =
											updatedStage;
										renderStages();
									}
								).open();
							});
					});

					// Move up button (if not first)
					if (index > 0) {
						stageSetting.addExtraButton((button) => {
							button
								.setIcon("arrow-up")
								.setTooltip(t("Move up"))
								.onClick(() => {
									// Swap with previous stage
									[
										this.workflow.stages[index - 1],
										this.workflow.stages[index],
									] = [
										this.workflow.stages[index],
										this.workflow.stages[index - 1],
									];
									renderStages();
								});
						});
					}

					// Move down button (if not last)
					if (index < this.workflow.stages.length - 1) {
						stageSetting.addExtraButton((button) => {
							button
								.setIcon("arrow-down")
								.setTooltip(t("Move down"))
								.onClick(() => {
									// Swap with next stage
									[
										this.workflow.stages[index],
										this.workflow.stages[index + 1],
									] = [
										this.workflow.stages[index + 1],
										this.workflow.stages[index],
									];
									renderStages();
								});
						});
					}

					// Delete button
					stageSetting.addExtraButton((button) => {
						button
							.setIcon("trash")
							.setTooltip(t("Delete"))
							.onClick(() => {
								// Remove the stage
								this.workflow.stages.splice(index, 1);
								renderStages();
							});
					});

					// If this stage has substages, show them
					if (
						stage.type === "cycle" &&
						stage.subStages &&
						stage.subStages.length > 0
					) {
						const subStagesList = stageItem.createEl("div", {
							cls: "workflow-substages-list",
						});

						stage.subStages.forEach(
							(subStage: any, index: number) => {
								const subStageItem = subStagesList.createEl(
									"div",
									{
										cls: "substage-item",
									}
								);

								const subStageSettingsContainer =
									subStageItem.createDiv({
										cls: "substage-settings-container",
									});

								// Create a single Setting for the entire substage
								const setting = new Setting(
									subStageSettingsContainer
								);

								setting.setName(
									t("Sub-stage") + " " + (index + 1)
								);

								// Add name text field
								setting.addText((text) => {
									text.setValue(subStage.name || "")
										.setPlaceholder(t("Sub-stage name"))
										.onChange((value) => {
											subStage.name = value;
										});
								});

								// Add ID text field
								setting.addText((text) => {
									text.setValue(subStage.id || "")
										.setPlaceholder(t("Sub-stage ID"))
										.onChange((value) => {
											subStage.id = value;
										});
								});

								// Add next stage dropdown if needed
								if (this.workflow.stages.length > 1) {
									setting.addDropdown((dropdown) => {
										dropdown.selectEl.addClass(
											"substage-next-select"
										);

										// Add label before dropdown
										const labelEl = createSpan({
											text: t("Next: "),
											cls: "setting-dropdown-label",
										});
										dropdown.selectEl.parentElement?.insertBefore(
											labelEl,
											dropdown.selectEl
										);

										// Add all other sub-stages as options
										this.workflow.stages.forEach(
											(s: WorkflowStage) => {
												if (s.id !== subStage.id) {
													dropdown.addOption(
														s.id,
														s.name
													);
												}
											}
										);

										// Set the current value
										if (subStage.next) {
											dropdown.setValue(subStage.next);
										}

										// Handle changes
										dropdown.onChange((value) => {
											subStage.next = value;
										});
									});
								}

								// Add remove button
								setting.addExtraButton((button) => {
									button.setIcon("trash").onClick(() => {
										this.workflow.stages.splice(index, 1);
										renderStages();
									});
								});
							}
						);
					}
				});
			}

			// Add button for new sub-stage
			const addStageButton = stagesContainer.createEl("button", {
				cls: "workflow-add-stage-button",
				text: t("Add Sub-stage"),
			});
			addStageButton.addEventListener("click", () => {
				if (!this.workflow.stages) {
					this.workflow.stages = [];
				}

				// Create a new sub-stage
				const newSubStage: {
					id: string;
					name: string;
					next?: string;
				} = {
					id: this.generateUniqueId(),
					name: t("New Sub-stage"),
				};

				// If there are existing sub-stages, set the next property
				if (this.workflow.stages.length > 0) {
					// Get the last sub-stage
					const lastSubStage =
						this.workflow.stages[this.workflow.stages.length - 1];

					// Set the last sub-stage's next property to the new sub-stage
					if (lastSubStage) {
						// Ensure lastSubStage has a next property
						if (!("next" in lastSubStage)) {
							// Add next property if it doesn't exist
							(lastSubStage as any).next = newSubStage.id;
						} else {
							lastSubStage.next = newSubStage.id;
						}
					}

					// Set the new sub-stage's next property to the first sub-stage (cycle)
					if (this.workflow.stages[0]) {
						newSubStage.next = this.workflow.stages[0].id;
					}
				}

				this.workflow.stages.push(newSubStage);
				renderStages();
			});
		};

		// Initial render of stages
		renderStages();

		// Save and Cancel buttons
		const buttonContainer = contentEl.createDiv({
			cls: "workflow-buttons",
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: t("Cancel"),
			cls: "workflow-cancel-button",
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});

		const saveButton = buttonContainer.createEl("button", {
			text: t("Save"),
			cls: "workflow-save-button mod-cta",
		});
		saveButton.addEventListener("click", () => {
			// Update the lastModified date
			if (!this.workflow.metadata) {
				this.workflow.metadata = {};
			}
			this.workflow.metadata.lastModified = new Date()
				.toISOString()
				.split("T")[0];

			// Call the onSave callback
			this.onSave(this.workflow);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	generateUniqueId(): string {
		return (
			Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
		);
	}
}

// Stage edit modal
class StageEditModal extends Modal {
	stage: any;
	allStages: any[];
	onSave: (stage: any) => void;
	renderStageTypeSettings: () => void;

	constructor(
		app: App,
		stage: any,
		allStages: any[],
		onSave: (stage: any) => void
	) {
		super(app);
		this.stage = JSON.parse(JSON.stringify(stage)); // Deep copy
		this.allStages = allStages;
		this.onSave = onSave;
		// Initialize the renderStageTypeSettings as a no-op function that will be replaced in onOpen
		this.renderStageTypeSettings = () => {};
	}

	onOpen() {
		const { contentEl, titleEl } = this;

		this.modalEl.toggleClass("modal-stage-definition", true);

		titleEl.setText(t("Edit Stage"));

		// Basic stage information
		new Setting(contentEl)
			.setName(t("Stage name"))
			.setDesc(t("A descriptive name for this workflow stage"))
			.addText((text) => {
				text.setValue(this.stage.name || "")
					.setPlaceholder(t("Stage name"))
					.onChange((value) => {
						this.stage.name = value;
					});
			});

		new Setting(contentEl)
			.setName(t("Stage ID"))
			.setDesc(t("A unique identifier for the stage (used in tags)"))
			.addText((text) => {
				text.setValue(this.stage.id || "")
					.setPlaceholder("stage_id")
					.onChange((value) => {
						this.stage.id = value;
					});
			});

		new Setting(contentEl)
			.setName(t("Stage type"))
			.setDesc(t("The type of this workflow stage"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("linear", t("Linear (sequential)"))
					.addOption("cycle", t("Cycle (repeatable)"))
					.addOption("terminal", t("Terminal (end stage)"))
					.setValue(this.stage.type || "linear")
					.onChange((value: "linear" | "cycle" | "terminal") => {
						this.stage.type = value;

						// If changing to/from cycle, update the UI
						this.renderStageTypeSettings();
					});
			});

		// Container for type-specific settings
		const typeSettingsContainer = contentEl.createDiv({
			cls: "stage-type-settings",
		});

		// Function to render type-specific settings
		const renderTypeSettings = () => {
			typeSettingsContainer.empty();

			if (this.stage.type === "linear" || this.stage.type === "cycle") {
				// For linear and cycle stages, show next stage options
				if (this.allStages.length > 0) {
					new Setting(typeSettingsContainer)
						.setName(t("Next stage"))
						.setDesc(t("The stage to proceed to after this one"))
						.addDropdown((dropdown) => {
							// Add all other stages as options
							this.allStages.forEach((s) => {
								if (s.id !== this.stage.id) {
									dropdown.addOption(s.id, s.name);
								}
							});

							// Set current value if it exists
							if (
								typeof this.stage.next === "string" &&
								this.stage.next
							) {
								dropdown.setValue(this.stage.next);
							}

							dropdown.onChange((value) => {
								this.stage.next = value;
							});
						});
				}

				// For cycle stages, add subStages
				if (this.stage.type === "cycle") {
					// SubStages section
					const subStagesSection = typeSettingsContainer.createDiv({
						cls: "substages-section",
					});

					new Setting(subStagesSection)
						.setName(t("Sub-stages"))
						.setDesc(t("Define cycle sub-stages (optional)"));

					const subStagesContainer = subStagesSection.createDiv({
						cls: "substages-container",
					});

					// Function to render sub-stages
					const renderSubStages = () => {
						subStagesContainer.empty();

						if (
							!this.stage.subStages ||
							this.stage.subStages.length === 0
						) {
							subStagesContainer.createEl("p", {
								text: t("No sub-stages defined yet."),
								cls: "no-substages-message",
							});
						} else {
							const subStagesList = subStagesContainer.createEl(
								"ul",
								{
									cls: "substages-list",
								}
							);

							this.stage.subStages.forEach(
								(subStage: any, index: number) => {
									const subStageItem = subStagesList.createEl(
										"li",
										{
											cls: "substage-item",
										}
									);

									const subStageNameContainer =
										subStageItem.createDiv({
											cls: "substage-name-container",
										});

									// Name
									const nameInput =
										subStageNameContainer.createEl(
											"input",
											{
												type: "text",
												value: subStage.name || "",
												placeholder:
													t("Sub-stage name"),
											}
										);
									nameInput.addEventListener("change", () => {
										subStage.name = nameInput.value;
									});

									// ID
									const idInput =
										subStageNameContainer.createEl(
											"input",
											{
												type: "text",
												value: subStage.id || "",
												placeholder: t("Sub-stage ID"),
											}
										);
									idInput.addEventListener("change", () => {
										subStage.id = idInput.value;
									});

									// Next sub-stage dropdown (if more than one sub-stage)
									if (this.stage.subStages.length > 1) {
										const nextContainer =
											subStageNameContainer.createDiv({
												cls: "substage-next-container",
											});
										nextContainer.createEl("span", {
											text: t("Next: "),
										});

										const nextSelect =
											nextContainer.createEl("select", {
												cls: "substage-next-select",
											});

										// Add all other sub-stages as options
										this.stage.subStages.forEach(
											(s: any) => {
												if (s.id !== subStage.id) {
													const option =
														nextSelect.createEl(
															"option",
															{
																value: s.id,
																text: s.name,
															}
														);

													if (
														subStage.next === s.id
													) {
														option.selected = true;
													}
												}
											}
										);

										nextSelect.addEventListener(
											"change",
											() => {
												subStage.next =
													nextSelect.value;
											}
										);
									}

									// Remove button
									const removeButton = subStageItem.createEl(
										"button",
										{
											cls: "substage-remove-button",
											text: "✕",
										}
									);
									removeButton.addEventListener(
										"click",
										() => {
											this.stage.subStages.splice(
												index,
												1
											);
											renderSubStages();
										}
									);
								}
							);
						}

						// Add button for new sub-stage
						const addSubStageButton = subStagesContainer.createEl(
							"button",
							{
								cls: "add-substage-button",
								text: t("Add Sub-stage"),
							}
						);
						addSubStageButton.addEventListener("click", () => {
							if (!this.stage.subStages) {
								this.stage.subStages = [];
							}

							// Create a new sub-stage with proper typing
							const newSubStage: {
								id: string;
								name: string;
								next?: string;
							} = {
								id: this.generateUniqueId(),
								name: t("New Sub-stage"),
							};

							// If there are existing sub-stages, set the next property
							if (this.stage.subStages.length > 0) {
								// Get the last sub-stage
								const lastSubStage =
									this.stage.subStages[
										this.stage.subStages.length - 1
									];

								// Set the last sub-stage's next property to the new sub-stage
								if (lastSubStage) {
									// Ensure lastSubStage has a next property
									if (!("next" in lastSubStage)) {
										// Add next property if it doesn't exist
										(lastSubStage as any).next =
											newSubStage.id;
									} else {
										lastSubStage.next = newSubStage.id;
									}
								}

								// Set the new sub-stage's next property to the first sub-stage (cycle)
								if (this.stage.subStages[0]) {
									newSubStage.next =
										this.stage.subStages[0].id;
								}
							}

							this.stage.subStages.push(newSubStage);
							renderSubStages();
						});
					};

					// Initial render of sub-stages
					renderSubStages();
				}

				// Can proceed to section (additional stages that can follow this one)
				const canProceedToSection = typeSettingsContainer.createDiv({
					cls: "can-proceed-to-section",
				});

				new Setting(canProceedToSection)
					.setName(t("Can proceed to"))
					.setDesc(
						t(
							"Additional stages that can follow this one (for right-click menu)"
						)
					);

				const canProceedToContainer = canProceedToSection.createDiv({
					cls: "can-proceed-to-container",
				});

				// Function to render canProceedTo options
				const renderCanProceedTo = () => {
					canProceedToContainer.empty();

					if (
						!this.stage.canProceedTo ||
						this.stage.canProceedTo.length === 0
					) {
						canProceedToContainer.createEl("p", {
							text: t(
								"No additional destination stages defined."
							),
							cls: "no-can-proceed-message",
						});
					} else {
						const canProceedList = canProceedToContainer.createEl(
							"ul",
							{
								cls: "can-proceed-list",
							}
						);

						this.stage.canProceedTo.forEach(
							(stageId: string, index: number) => {
								// Find the corresponding stage
								const targetStage = this.allStages.find(
									(s) => s.id === stageId
								);

								if (targetStage) {
									const proceedItem = canProceedList.createEl(
										"li",
										{
											cls: "can-proceed-item",
										}
									);

									const setting = new Setting(
										proceedItem
									).setName(targetStage.name);

									// Remove button
									setting.addExtraButton((button) => {
										button
											.setIcon("trash")
											.setTooltip(t("Remove"))
											.onClick(() => {
												this.stage.canProceedTo.splice(
													index,
													1
												);
												renderCanProceedTo();
											});
									});
								}
							}
						);
					}

					// Add dropdown to add new destination
					if (this.allStages.length > 0) {
						const addContainer = canProceedToContainer.createDiv({
							cls: "add-can-proceed-container",
						});

						const addSelect = addContainer.createEl("select", {
							cls: "add-can-proceed-select",
						});

						// Add all other stages as options (that aren't already in canProceedTo)
						this.allStages.forEach((s) => {
							if (
								s.id !== this.stage.id &&
								(!this.stage.canProceedTo ||
									!this.stage.canProceedTo.includes(s.id))
							) {
								addSelect.createEl("option", {
									value: s.id,
									text: s.name,
								});
							}
						});

						const addButton = addContainer.createEl("button", {
							cls: "add-can-proceed-button",
							text: t("Add"),
						});
						addButton.addEventListener("click", () => {
							if (addSelect.value) {
								if (!this.stage.canProceedTo) {
									this.stage.canProceedTo = [];
								}
								this.stage.canProceedTo.push(addSelect.value);
								renderCanProceedTo();
							}
						});
					}
				};

				// Initial render of canProceedTo
				renderCanProceedTo();
			}
		};

		// Method to re-render the stage type settings when the type changes
		this.renderStageTypeSettings = renderTypeSettings;

		// Initial render of type settings
		renderTypeSettings();

		// Save and Cancel buttons
		const buttonContainer = contentEl.createDiv({ cls: "stage-buttons" });

		const cancelButton = buttonContainer.createEl("button", {
			text: t("Cancel"),
			cls: "stage-cancel-button",
		});
		cancelButton.addEventListener("click", () => {
			this.close();
		});

		const saveButton = buttonContainer.createEl("button", {
			text: t("Save"),
			cls: "stage-save-button mod-cta",
		});
		saveButton.addEventListener("click", () => {
			// Validate the stage before saving
			if (!this.stage.name || !this.stage.id) {
				// Show error
				const errorMsg = contentEl.createDiv({
					cls: "stage-error-message",
					text: t("Name and ID are required."),
				});

				// Remove after 3 seconds
				setTimeout(() => {
					errorMsg.remove();
				}, 3000);

				return;
			}

			// Call the onSave callback
			this.onSave(this.stage);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	generateUniqueId(): string {
		return (
			Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
		);
	}
}
