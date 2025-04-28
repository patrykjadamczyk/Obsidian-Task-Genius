import { Component, App, Modal, Setting } from "obsidian";
import {
	HabitProps,
	DailyHabitProps,
	CountHabitProps,
	ScheduledHabitProps,
	MappingHabitProps,
} from "../../types/habit-card"; // Assuming types are in src/types
import TaskProgressBarPlugin from "src";
import {
	DailyHabitCard,
	CountHabitCard,
	ScheduledHabitCard,
	MappingHabitCard,
} from "./habitcard"; // Import the habit card classes
import { t } from "src/translations/helper";
import "../../styles/habit.css";

export class Habit extends Component {
	plugin: TaskProgressBarPlugin;
	containerEl: HTMLElement; // The element where the view will be rendered

	constructor(plugin: TaskProgressBarPlugin, parentEl: HTMLElement) {
		super();
		this.plugin = plugin;
		this.containerEl = parentEl.createDiv("tg-habit-component-container");
	}

	async onload() {
		console.log("HabitView loaded.");
		if (this.plugin) {
			// Cast to any to avoid TypeScript error about event name
			this.registerEvent(
				(this.plugin.app.workspace as any).on(
					"task-genius:habit-index-updated",
					this.redraw
				)
			);
		}
		this.redraw(); // Initial draw
	}

	onunload() {
		console.log("HabitView unloaded.");
		this.containerEl.empty(); // Clear the container on unload
	}

	// Redraw the entire habit view
	redraw = () => {
		const scrollState = this.containerEl.scrollTop;
		this.containerEl.empty(); // Clear previous content

		const habits = this.getHabitData(); // Method to fetch habit data

		if (!habits || habits.length === 0) {
			this.renderEmptyState();
		} else {
			this.renderHabitList(habits);
		}
		this.containerEl.scrollTop = scrollState; // Restore scroll position
	};

	getHabitData(): HabitProps[] {
		const habits = this.plugin.habitManager?.habits || [];
		return habits;
	}

	renderEmptyState() {
		const emptyDiv = this.containerEl.createDiv({
			cls: "habit-empty-state",
		});
		emptyDiv.createEl("h2", { text: t("No Habits Yet") });
		emptyDiv.createEl("p", {
			text: t("Click the open habit button to create a new habit."),
		}); // Adjust text based on UI
	}

	renderHabitList(habits: HabitProps[]) {
		const listContainer = this.containerEl.createDiv({
			cls: "habit-list-container",
		});

		habits.forEach((habit) => {
			const habitCardContainer = listContainer.createDiv({
				cls: "habit-card-wrapper",
			}); // Wrapper for context menu, etc.
			// TODO: Add context menu logic here
			this.renderHabitCard(habitCardContainer, habit);
		});

		// TODO: Add Confetti logic if needed (could be managed globally or per card)
	}

	renderHabitCard(container: HTMLElement, habit: HabitProps) {
		// Ensure completions is an object
		habit.completions = habit.completions || {};

		switch (habit.type) {
			case "daily":
				const dailyCard = new DailyHabitCard(
					habit as DailyHabitProps,
					container
				);
				this.addChild(dailyCard);
				break;
			case "count":
				const countCard = new CountHabitCard(
					habit as CountHabitProps,
					container
				);
				this.addChild(countCard);
				break;
			case "scheduled":
				const scheduledCard = new ScheduledHabitCard(
					habit as ScheduledHabitProps,
					container
				);
				this.addChild(scheduledCard);
				break;
			case "mapping":
				const mappingCard = new MappingHabitCard(
					habit as MappingHabitProps,
					container
				);
				this.addChild(mappingCard);
				break;
			default:
				// Use a type assertion to handle potential future types or errors
				const unknownHabit = habit as any;
				console.warn(`Unsupported habit type: ${unknownHabit?.type}`);
				container.createDiv({
					text: `Unsupported habit: ${
						unknownHabit?.name || "Unknown"
					}`,
				});
		}
	}
}

// --- Modal for Scheduled Event Details ---
export class EventDetailModal extends Modal {
	eventName: string;
	onSubmit: (details: string) => void;
	details: string = "";

	constructor(
		app: App,
		eventName: string,
		onSubmit: (details: string) => void
	) {
		super(app);
		this.eventName = eventName;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("habit-event-modal");
		contentEl.createEl("h2", {
			text: `Record Details for ${this.eventName}`,
		});

		new Setting(contentEl).setName("Details (optional)").addText((text) =>
			text
				.setPlaceholder(`Enter details for ${this.eventName}...`)
				.onChange((value) => {
					this.details = value;
				})
		);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Submit")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.details);
				})
		);
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
