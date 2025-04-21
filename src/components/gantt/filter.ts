import { Component, App, TFile } from "obsidian";

export class FilterComponent extends Component {
	private containerEl: HTMLElement;
	private app: App;
	private scrollToDateCallback: (date: Date) => void;

	constructor(
		app: App,
		containerEl: HTMLElement,
		scrollToDateCallback: (date: Date) => void
	) {
		super();
		this.app = app;
		this.containerEl = containerEl;
		this.scrollToDateCallback = scrollToDateCallback;
		this.containerEl.addClass("gantt-filter-container"); // Add a class for styling
	}

	onload() {
		console.log("FilterComponent loaded.");
		this.render();
	}

	onunload() {
		console.log("FilterComponent unloaded.");
		this.containerEl.empty(); // Clear the container
		this.containerEl.removeClass("gantt-filter-container");
	}

	render() {
		this.containerEl.empty(); // Clear previous content

		// Placeholder content - replace with actual filter UI elements later
		const filterLabel = this.containerEl.createEl("span");
		filterLabel.textContent = "Filters: ";
		filterLabel.style.marginRight = "10px";

		const placeholderInput = this.containerEl.createEl("input");
		placeholderInput.type = "text";
		placeholderInput.placeholder = "Filter options will go here...";
		placeholderInput.disabled = true; // Disable for now

		// Add "Scroll to Today" button
		const todayButton = this.containerEl.createEl("button", {
			text: "Today",
			cls: "gantt-filter-today-button",
		});
		todayButton.style.marginLeft = "10px";
		todayButton.addEventListener("click", () => {
			this.scrollToDateCallback(new Date());
		});

		// Add more filter controls (dropdowns, buttons, etc.) here
	}

	// Add methods to handle filter changes and apply them
	// e.g., applyFilters(), onFilterChange(filterType, value)
}
