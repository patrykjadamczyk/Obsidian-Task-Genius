import { Component, Notice, setIcon } from "obsidian";
import { CountHabitProps } from "src/types/habit-card";
import { HabitCard } from "./habitcard";
import { t } from "src/translations/helper";
import TaskProgressBarPlugin from "src/index";

export class CountHabitCard extends HabitCard {
	constructor(
		public habit: CountHabitProps,
		public container: HTMLElement,
		public plugin: TaskProgressBarPlugin
	) {
		super(habit, container, plugin);
	}

	render(): void {
		super.render();

		const card = this.container.createDiv({
			cls: "habit-card count-habit-card",
		});
		const header = card.createDiv({ cls: "card-header" });
		const titleDiv = header.createDiv({ cls: "card-title" });
		const iconEl = titleDiv.createSpan({ cls: "habit-icon" });
		setIcon(iconEl, (this.habit.icon as string) || "dice");

		// Add count unit to title if defined
		const titleText = this.habit.countUnit
			? `${this.habit.name} (${this.habit.countUnit})`
			: this.habit.name;

		titleDiv
			.createSpan({ text: titleText, cls: "habit-name" })
			.onClickEvent(() => {
				new Notice(`Chart for ${this.habit.name} (Not Implemented)`);
				// TODO: Implement Chart Dialog
			});

		const contentWrapper = card.createDiv({ cls: "card-content-wrapper" });

		const button = contentWrapper.createEl("button", {
			cls: "habit-icon-button",
		});
		const buttonIcon = button.createSpan({ cls: "habit-icon" });
		setIcon(buttonIcon, (this.habit.icon as string) || "plus-circle"); // Use habit icon or a plus icon

		const today = new Date().toISOString().split("T")[0];
		let countToday = this.habit.completions[today] ?? 0;

		button.addEventListener("click", (e) => {
			this.toggleHabitCompletion(this.habit.id);
			// TODO: Implement confetti/toast logic from React code
			if (this.habit.max && countToday + 1 === this.habit.max) {
				new Notice(`${t("Goal reached")} ${this.habit.name}! ✅`);
			} else if (this.habit.max && countToday + 1 > this.habit.max) {
				new Notice(`${t("Exceeded goal")} ${this.habit.name}! 💪`);
			}
		});

		const infoDiv = contentWrapper.createDiv({ cls: "habit-info" });
		// Add count unit to display if defined
		const countText = this.habit.countUnit
			? `${countToday} / ${this.habit.max} ${this.habit.countUnit}`
			: `${countToday} / ${this.habit.max}`;

		infoDiv.createEl("h3", { text: countText });
		// TODO: Add last completion date span if needed

		const progressArea = contentWrapper.createDiv({
			cls: "habit-progress-area",
		});
		const heatmapContainer = progressArea.createDiv({
			cls: "habit-heatmap-small",
		});
		if (this.habit.max && this.habit.max > 0) {
			this.renderHeatmap(
				heatmapContainer,
				this.habit.completions,
				"sm",
				(value: any) => value >= (this.habit.max ?? 0)
			);
			this.renderProgressBar(progressArea, countToday, this.habit.max);
		}
	}
}
