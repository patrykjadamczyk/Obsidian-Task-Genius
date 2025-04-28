import { Component, Notice, setIcon, Setting } from "obsidian";
import { MappingHabitProps } from "src/types/habit-card";
import { HabitCard } from "./habitcard";
import TaskProgressBarPlugin from "src";

export class MappingHabitCard extends HabitCard {
	constructor(
		public habit: MappingHabitProps,
		public container: HTMLElement,
		public plugin: TaskProgressBarPlugin
	) {
		super(habit, container, plugin);
	}

	render(): void {
		super.render();

		const card = this.container.createDiv({
			cls: "habit-card mapping-habit-card",
		});
		const header = card.createDiv({ cls: "card-header" });
		const titleDiv = header.createDiv({ cls: "card-title" });
		const iconEl = titleDiv.createSpan({ cls: "habit-icon" });
		setIcon(iconEl, (this.habit.icon as string) || "smile-plus"); // Better default icon
		titleDiv.createSpan({ text: this.habit.name, cls: "habit-name" });

		const contentWrapper = card.createDiv({ cls: "card-content-wrapper" });

		const heatmapContainer = contentWrapper.createDiv({
			cls: "habit-heatmap-medium",
		});
		this.renderHeatmap(
			heatmapContainer,
			this.habit.completions,
			"md",
			(value: any) => typeof value === "number" && value > 0, // Check if it's a positive number
			(value: number) => {
				// Custom renderer for emoji
				if (typeof value !== "number" || value <= 0) return null;
				const emoji = this.habit.mapping?.[value] || "?";
				const cellContent = createSpan({ text: emoji });

				// Add tooltip showing the mapped value label if available
				if (this.habit.mapping && this.habit.mapping[value]) {
					cellContent.setAttribute(
						"aria-label",
						`${this.habit.mapping[value]}`
					);
					cellContent.addClass("has-tooltip");
				} else {
					cellContent.setAttribute("aria-label", `Value: ${value}`);
				}

				return cellContent;
			}
		);

		const controlsDiv = contentWrapper.createDiv({ cls: "habit-controls" });
		const today = new Date().toISOString().split("T")[0];
		const defaultValue = Object.keys(this.habit.mapping || {})
			.map(Number)
			.includes(3)
			? 3
			: Object.keys(this.habit.mapping || {})
					.map(Number)
					.sort((a, b) => a - b)[0] || 1;
		let currentSelection = this.habit.completions[today] ?? defaultValue;

		// Display current selection with emoji and label
		const moodDisplay = controlsDiv.createDiv({
			cls: "habit-mood-display",
		});
		const moodEmoji = moodDisplay.createSpan({
			cls: "habit-mood-emoji",
			text: this.habit.mapping?.[currentSelection] || "?",
		});

		// Add label if available
		if (this.habit.mapping && this.habit.mapping[currentSelection]) {
			moodDisplay.createSpan({
				cls: "habit-mood-label",
				text: this.habit.mapping[currentSelection],
			});
		}

		const moodButton = controlsDiv.createEl("button", {
			cls: "habit-mood-button",
			text: "Record",
		});

		moodButton.addEventListener("click", () => {
			if (
				currentSelection > 0 &&
				this.habit.mapping?.[currentSelection]
			) {
				// Ensure a valid selection is made
				this.toggleHabitCompletion(this.habit.id, currentSelection);

				const noticeText =
					this.habit.mapping && this.habit.mapping[currentSelection]
						? `Recorded ${this.habit.name} as ${this.habit.mapping[currentSelection]}`
						: `Recorded ${this.habit.name} as ${this.habit.mapping[currentSelection]}`;

				new Notice(noticeText);
			} else {
				new Notice(
					"Please select a valid value using the slider first."
				);
			}
		});

		// Slider using Obsidian Setting
		new Setting(controlsDiv)
			.setClass("habit-slider-setting")
			.addSlider((slider) => {
				const mappingKeys = Object.keys(this.habit.mapping || {})
					.map(Number)
					.sort((a, b) => a - b);
				const min = mappingKeys[0] || 1;
				const max = mappingKeys[mappingKeys.length - 1] || 5;
				slider
					.setLimits(min, max, 1)
					.setValue(currentSelection)
					.setDynamicTooltip()
					.onChange((value) => {
						currentSelection = value;

						// Update emoji display
						moodEmoji.setText(
							this.habit.mapping?.[currentSelection] || "?"
						);

						// Update label if available
						const labelEl =
							moodDisplay.querySelector(".habit-mood-label");
						if (labelEl) {
							if (
								this.habit.mapping &&
								this.habit.mapping[currentSelection]
							) {
								labelEl.textContent =
									this.habit.mapping[currentSelection];
							} else {
								labelEl.textContent = "";
							}
						} else if (
							this.habit.mapping &&
							this.habit.mapping[currentSelection]
						) {
							// Create label if it doesn't exist but should
							moodDisplay.createSpan({
								cls: "habit-mood-label",
								text: this.habit.mapping[currentSelection],
							});
						}
					});
			});
	}
}
