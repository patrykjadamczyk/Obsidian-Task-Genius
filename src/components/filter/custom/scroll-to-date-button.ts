import { Component } from "obsidian";

export class ScrollToDateButton extends Component {
	private containerEl: HTMLElement;
	private scrollToDateCallback: (date: Date) => void;

	constructor(
		containerEl: HTMLElement,
		scrollToDateCallback: (date: Date) => void
	) {
		super();
		this.containerEl = containerEl;
		this.scrollToDateCallback = scrollToDateCallback;
	}

	onload() {
		const todayButton = this.containerEl.createEl("button", {
			text: "Today",
			cls: "gantt-filter-today-button",
		});

		this.registerDomEvent(todayButton, "click", () => {
			this.scrollToDateCallback(new Date());
		});
	}
}
