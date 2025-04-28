import {
	App,
	CachedMetadata,
	Component,
	debounce,
	FrontMatterCache,
	moment,
	TFile,
} from "obsidian";
import {
	HabitProps,
	ScheduledHabitProps,
	DailyHabitProps,
	CountHabitProps,
	MappingHabitProps,
	BaseHabitProps,
} from "../types/habit-card";
import TaskProgressBarPlugin from "../index"; // Assuming HabitTracker is the main plugin class
import {
	createDailyNote,
	getAllDailyNotes,
	getDailyNote,
	getDateFromFile,
} from "obsidian-daily-notes-interface";

export class HabitManager extends Component {
	private plugin: TaskProgressBarPlugin;
	habits: HabitProps[] = [];

	constructor(plugin: TaskProgressBarPlugin) {
		super();
		this.plugin = plugin;
	}

	async initializeHabits(): Promise<void> {
		const dailyNotes = await this.getDailyNotes();
		const initialHabits = await this.processHabits(dailyNotes);
		this.habits = initialHabits;

		this.registerEvent(
			this.plugin.app.metadataCache.on(
				"changed",
				(file: TFile, _data: string, cache: CachedMetadata) => {
					if (this.isDailyNote(file)) {
						this.updateHabitCompletions(file, cache);
					}
				}
			)
		);
	}

	private async getDailyNotes(): Promise<TFile[]> {
		const files = getAllDailyNotes();
		return Object.values(files);
	}

	private isDailyNote(file: TFile): boolean {
		try {
			// Use 'day' to specifically target daily notes if weekly/monthly are handled differently
			return getDateFromFile(file, "day") !== null;
		} catch (e) {
			// Handle cases where getDateFromFile might throw error for non-note files
			// console.warn(`Could not determine if file is a daily note: ${file.path}`, e);
			return false;
		}
	}

	private async processHabits(dailyNotes: TFile[]): Promise<HabitProps[]> {
		// Use a deep copy of settings habits to avoid modifying the source directly
		const initialHabits: HabitProps[] = [];
		const { habitKeyMap = {}, scheduledEventMap = {} } =
			this.plugin.settings.habit || {};

		for (const note of dailyNotes) {
			if (!this.isDailyNote(note)) continue; // Skip non-daily notes

			const cache = this.plugin.app.metadataCache.getFileCache(note);
			const frontmatter = cache?.frontmatter;

			if (frontmatter) {
				const dateMoment = getDateFromFile(note, "day");
				if (!dateMoment) continue; // Should not happen due to isDailyNote check, but belts and suspenders
				const date = dateMoment.format("YYYY-MM-DD");

				for (const habit of initialHabits) {
					if (!habit.completions) habit.completions = {}; // Ensure completions object exists
					const properties = habitKeyMap[habit.id] || [];

					switch (habit.type) {
						case "scheduled":
							// Handle scheduled habits (journey habits)
							const scheduledHabit = habit as ScheduledHabitProps;
							const eventMap = scheduledEventMap[habit.id] || {};
							if (!scheduledHabit.completions[date])
								scheduledHabit.completions[date] = {};

							for (const [
								eventName,
								propertyKey,
							] of Object.entries(eventMap)) {
								if (
									propertyKey &&
									frontmatter[propertyKey as string] !==
										undefined
								) {
									const value =
										frontmatter[propertyKey as string];
									// Store the raw value or format it as needed
									scheduledHabit.completions[date][
										eventName
									] = value ?? "";
								}
							}
							break;

						case "daily":
							// Handle daily habits with custom completion text
							const dailyHabit = habit as DailyHabitProps;
							for (const property of properties) {
								if (
									property &&
									frontmatter[property] !== undefined
								) {
									const value = frontmatter[property];
									// If completionText is defined, check if value matches it
									if (dailyHabit.completionText) {
										// If value matches completionText, mark as completed (1)
										// Otherwise, store the actual text value
										if (
											value === dailyHabit.completionText
										) {
											dailyHabit.completions[date] = 1;
										} else {
											dailyHabit.completions[date] =
												value as string;
										}
									} else {
										// Default behavior: any non-empty value means completed
										dailyHabit.completions[date] = value
											? 1
											: 0;
									}
									break; // Use the first found property
								}
							}
							break;

						case "count":
							// Handle count habits
							const countHabit = habit as CountHabitProps;
							for (const property of properties) {
								if (
									property &&
									frontmatter[property] !== undefined
								) {
									const value = frontmatter[property];
									// For count habits, try to parse as number
									const numValue = Number(value);
									if (!isNaN(numValue)) {
										countHabit.completions[date] = numValue;
									}
									break; // Use the first found property
								}
							}
							break;

						case "mapping":
							// Handle mapping habits
							const mappingHabit = habit as MappingHabitProps;
							for (const property of properties) {
								if (
									property &&
									frontmatter[property] !== undefined
								) {
									const value = frontmatter[property];
									// For mapping habits, try to parse as number
									const numValue = Number(value);
									if (
										!isNaN(numValue) &&
										mappingHabit.mapping[numValue]
									) {
										mappingHabit.completions[date] =
											numValue;
									}
									break; // Use the first found property
								}
							}
							break;

						default:
							// Fallback for any other habit types
							let completionValue: number | undefined = undefined;
							for (const property of properties) {
								if (
									property &&
									frontmatter[property] !== undefined
								) {
									const value = frontmatter[property];
									// Simple habit: expect boolean or number-like
									completionValue =
										Number(value) || (!!value ? 1 : 0);
									break; // Use the first found property
								}
							}
							if (completionValue !== undefined) {
								(habit as DailyHabitProps).completions[date] =
									completionValue;
							}
							break;
					}
				}
			}
		}
		return initialHabits;
	}

	private updateHabitCompletions(file: TFile, cache: CachedMetadata): void {
		if (!cache?.frontmatter) return;

		const dateMoment = getDateFromFile(file, "day");
		if (!dateMoment) return; // Not a daily note

		const dateStr = dateMoment.format("YYYY-MM-DD");
		let habitsChanged = false;

		const updatedHabits = this.habits.map((habit) => {
			const habitClone = JSON.parse(JSON.stringify(habit)) as HabitProps; // Work on a clone
			if (!habitClone.completions) habitClone.completions = {};
			const { habitKeyMap = {}, scheduledEventMap = {} } =
				this.plugin.settings.habit || {};

			switch (habitClone.type) {
				case "scheduled":
					// Handle scheduled habits (journey habits)
					const scheduledHabit = habitClone as ScheduledHabitProps;
					const eventMap = scheduledEventMap[habit.id] || {};
					if (!scheduledHabit.completions[dateStr])
						scheduledHabit.completions[dateStr] = {};
					let eventChanged = false;

					for (const [eventName, propertyKey] of Object.entries(
						eventMap
					)) {
						if (
							propertyKey &&
							cache.frontmatter?.[propertyKey as string] !==
								undefined
						) {
							const newValue =
								cache.frontmatter[propertyKey as string] ?? "";
							if (
								scheduledHabit.completions[dateStr][
									eventName
								] !== newValue
							) {
								scheduledHabit.completions[dateStr][eventName] =
									newValue;
								eventChanged = true;
							}
						} else if (
							scheduledHabit.completions[dateStr]?.[eventName] !==
							undefined
						) {
							// Handle case where property might have been removed from frontmatter
							delete scheduledHabit.completions[dateStr][
								eventName
							];
							eventChanged = true;
						}
					}
					if (eventChanged) habitsChanged = true;
					break;

				case "daily":
					// Handle daily habits with custom completion text
					const dailyHabit = habitClone as DailyHabitProps;
					const dailyProperties = habitKeyMap[habit.id] || [];
					let foundDailyProperty = false;

					for (const property of dailyProperties) {
						if (
							property &&
							cache.frontmatter?.[property] !== undefined
						) {
							foundDailyProperty = true;
							const value = cache.frontmatter[property];

							// If completionText is defined, check if value matches it
							if (dailyHabit.completionText) {
								const newValue =
									value === dailyHabit.completionText
										? 1
										: (value as string);
								if (
									dailyHabit.completions[dateStr] !== newValue
								) {
									dailyHabit.completions[dateStr] = newValue;
									habitsChanged = true;
								}
							} else {
								// Default behavior: any non-empty value means completed
								const newValue = value ? 1 : 0;
								if (
									dailyHabit.completions[dateStr] !== newValue
								) {
									dailyHabit.completions[dateStr] = newValue;
									habitsChanged = true;
								}
							}
							break; // Use the first found property
						}
					}

					if (
						!foundDailyProperty &&
						dailyHabit.completions[dateStr] !== undefined
					) {
						delete dailyHabit.completions[dateStr];
						habitsChanged = true;
					}
					break;

				case "count":
					// Handle count habits
					const countHabit = habitClone as CountHabitProps;
					const countProperties = habitKeyMap[habit.id] || [];
					let foundCountProperty = false;

					for (const property of countProperties) {
						if (
							property &&
							cache.frontmatter?.[property] !== undefined
						) {
							foundCountProperty = true;
							const value = cache.frontmatter[property];
							const numValue = Number(value);

							if (
								!isNaN(numValue) &&
								countHabit.completions[dateStr] !== numValue
							) {
								countHabit.completions[dateStr] = numValue;
								habitsChanged = true;
							}
							break; // Use the first found property
						}
					}

					if (
						!foundCountProperty &&
						countHabit.completions[dateStr] !== undefined
					) {
						delete countHabit.completions[dateStr];
						habitsChanged = true;
					}
					break;

				case "mapping":
					// Handle mapping habits
					const mappingHabit = habitClone as MappingHabitProps;
					const mappingProperties = habitKeyMap[habit.id] || [];
					let foundMappingProperty = false;

					for (const property of mappingProperties) {
						if (
							property &&
							cache.frontmatter?.[property] !== undefined
						) {
							foundMappingProperty = true;
							const value = cache.frontmatter[property];
							const numValue = Number(value);

							if (
								!isNaN(numValue) &&
								mappingHabit.mapping[numValue] &&
								mappingHabit.completions[dateStr] !== numValue
							) {
								mappingHabit.completions[dateStr] = numValue;
								habitsChanged = true;
							}
							break; // Use the first found property
						}
					}

					if (
						!foundMappingProperty &&
						mappingHabit.completions[dateStr] !== undefined
					) {
						delete mappingHabit.completions[dateStr];
						habitsChanged = true;
					}
					break;

				default:
					// Fallback for any other habit types
					const properties = habitKeyMap[habit.id] || [];
					let completionValue: number | undefined = undefined;
					let foundProperty = false;

					for (const property of properties) {
						if (
							property &&
							cache.frontmatter?.[property] !== undefined
						) {
							foundProperty = true;
							const value = cache.frontmatter[property];
							completionValue =
								Number(value) || (!!value ? 1 : 0);
							break;
						}
					}

					const currentValue = (habitClone as DailyHabitProps)
						.completions[dateStr];
					if (foundProperty && currentValue !== completionValue) {
						((habitClone as DailyHabitProps).completions as any)[
							dateStr
						] = completionValue as number;
						habitsChanged = true;
					} else if (!foundProperty && currentValue !== undefined) {
						delete (habitClone as DailyHabitProps).completions[
							dateStr
						];
						habitsChanged = true;
					}
					break;
			}

			return habitClone; // Return the updated clone
		});

		if (habitsChanged) {
			// Update state without tracking in history for background updates
			this.habits = updatedHabits;
			this.plugin.app.workspace.trigger(
				"task-genius:habit-index-updated",
				this.habits
			);
		}
	}

	async updateHabitInObsidian(
		updatedHabit: HabitProps,
		date: string
	): Promise<void> {
		const app: App = this.plugin.app;
		const momentDate = moment(date, "YYYY-MM-DD");
		if (!momentDate.isValid()) {
			console.error(
				`Invalid date format provided: ${date}. Expected YYYY-MM-DD.`
			);
			return;
		}

		let dailyNote: TFile | null = null;
		try {
			dailyNote = getDailyNote(momentDate, getAllDailyNotes());

			if (!dailyNote) {
				dailyNote = await createDailyNote(momentDate);
			}
		} catch (error) {
			console.error("Error getting or creating daily note:", error);
			return;
		}

		if (dailyNote) {
			try {
				await app.fileManager.processFrontMatter(
					dailyNote,
					(frontmatter) => {
						const { habitKeyMap = {}, scheduledEventMap = {} } =
							this.plugin.settings.habit || {};
						const completion = updatedHabit.completions[date];

						switch (updatedHabit.type) {
							case "scheduled":
								// Handle scheduled habits (journey habits)
								const eventMap =
									scheduledEventMap[updatedHabit.id] || {};
								for (const [
									eventName,
									propertyKey,
								] of Object.entries(eventMap)) {
									if (propertyKey) {
										// Only update if a property key is defined
										if (
											typeof completion === "object" &&
											completion?.[eventName] !==
												undefined
										) {
											frontmatter[propertyKey as string] =
												completion[eventName];
										} else {
											// If completion doesn't exist or eventName is missing, maybe remove property or set to default?
											// For now, we only update if value exists. Decide if removal is needed.
											// delete frontmatter[propertyKey]; // Example: remove if not in completion
										}
									}
								}
								break;

							case "daily":
								// Handle daily habits with custom completion text
								const dailyHabit =
									updatedHabit as DailyHabitProps;
								const dailyProperties =
									habitKeyMap[updatedHabit.id] || [];

								if (dailyProperties.length > 0) {
									const keyToUpdate = dailyProperties[0]; // Update the primary property

									if (completion !== undefined) {
										// If completionText is defined and completion is 1, use the completionText
										if (
											dailyHabit.completionText &&
											completion === 1
										) {
											frontmatter[keyToUpdate] =
												dailyHabit.completionText;
										} else {
											// Otherwise use the raw value
											frontmatter[keyToUpdate] =
												completion;
										}
									} else {
										// If completion is undefined, remove the property
										delete frontmatter[keyToUpdate];
									}
								} else {
									console.warn(
										`Habit ${updatedHabit.id} has no properties defined in habitKeyMap.`
									);
								}
								break;

							case "count":
								// Handle count habits
								const countProperties =
									habitKeyMap[updatedHabit.id] || [];

								if (countProperties.length > 0) {
									const keyToUpdate = countProperties[0]; // Update the primary property

									if (completion !== undefined) {
										frontmatter[keyToUpdate] = completion;
									} else {
										// If completion is undefined, remove the property
										delete frontmatter[keyToUpdate];
									}
								} else {
									console.warn(
										`Habit ${updatedHabit.id} has no properties defined in habitKeyMap.`
									);
								}
								break;

							case "mapping":
								// Handle mapping habits
								const mappingHabit =
									updatedHabit as MappingHabitProps;
								const mappingProperties =
									habitKeyMap[updatedHabit.id] || [];

								if (mappingProperties.length > 0) {
									const keyToUpdate = mappingProperties[0]; // Update the primary property

									if (
										completion !== undefined &&
										typeof completion === "number" &&
										mappingHabit.mapping[completion]
									) {
										frontmatter[keyToUpdate] = completion;
									} else {
										// If completion is undefined or invalid, remove the property
										delete frontmatter[keyToUpdate];
									}
								} else {
									console.warn(
										`Habit ${updatedHabit.id} has no properties defined in habitKeyMap.`
									);
								}
								break;

							default:
								// Simple habit (fallback)
								const properties =
									habitKeyMap[
										(updatedHabit as BaseHabitProps).id
									] || [];

								if (properties.length > 0) {
									const keyToUpdate = properties[0]; // Update the primary property

									if (completion !== undefined) {
										frontmatter[keyToUpdate] = completion;
									} else {
										// If completion is undefined, remove the property
										delete frontmatter[keyToUpdate];
									}
								} else {
									console.warn(
										`Habit ${
											(updatedHabit as BaseHabitProps).id
										} has no properties defined in habitKeyMap.`
									);
								}
								break;
						}
					}
				);
			} catch (error) {
				console.error(
					`Error processing frontmatter for ${dailyNote.path}:`,
					error
				);
			}
		} else {
			console.warn(
				`Daily note could not be found or created for date: ${date}`
			);
		}
	}
}
