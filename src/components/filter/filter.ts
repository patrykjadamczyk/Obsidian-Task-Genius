import { FilterDropdown } from "./filter-dropdown";
import { FilterPill } from "./filter-pill";
import {
	ActiveFilter,
	FilterCategory,
	FilterComponentOptions,
} from "./filter-type";
import "./filter.css";

export class FilterComponent {
	private container: HTMLElement;
	private options: FilterCategory[];
	private activeFilters: ActiveFilter[] = [];
	private filtersContainer: HTMLElement;
	private controlsContainer: HTMLElement;
	private addFilterButton: HTMLButtonElement;
	private clearAllButton: HTMLButtonElement;
	private dropdown: FilterDropdown | null = null;
	private onChange: (activeFilters: ActiveFilter[]) => void;

	constructor(options: FilterComponentOptions) {
		this.container = options.container;
		this.options = options.options;
		this.onChange = options.onChange || (() => {});

		this.render();
		this.setupEventListeners();
	}

	private render(): void {
		// Create the main filter component
		const filterElement = document.createElement("div");
		filterElement.className = "filter-component";

		// Create the filter pills container
		this.filtersContainer = document.createElement("div");
		this.filtersContainer.className = "filter-pills-container";

		// Create the controls container
		this.controlsContainer = document.createElement("div");
		this.controlsContainer.className = "filter-controls";

		// Create the add filter button
		this.addFilterButton = document.createElement("button");
		this.addFilterButton.className = "filter-add-button";
		this.addFilterButton.innerHTML = `
      <span class="filter-add-icon">+</span>
      <span>Add filter</span>
    `;

		// Create the clear all button (hidden initially)
		this.clearAllButton = document.createElement("button");
		this.clearAllButton.className = "filter-clear-all-button";
		this.clearAllButton.textContent = "Clear all";
		this.clearAllButton.style.display = "none";

		// Add elements to the container
		this.controlsContainer.appendChild(this.addFilterButton);
		this.controlsContainer.appendChild(this.clearAllButton);

		filterElement.appendChild(this.filtersContainer);
		filterElement.appendChild(this.controlsContainer);

		this.container.appendChild(filterElement);
	}

	private setupEventListeners(): void {
		// Add filter button click event
		this.addFilterButton.addEventListener("click", (e) => {
			e.stopPropagation();
			this.showFilterDropdown();
		});

		// Clear all button click event
		this.clearAllButton.addEventListener("click", () => {
			this.clearAllFilters();
		});

		// Close dropdown when clicking outside
		document.addEventListener("click", (e) => {
			if (
				this.dropdown &&
				!e.composedPath().includes(this.dropdown.getElement())
			) {
				this.hideFilterDropdown();
			}
		});

		// Handle keyboard navigation
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && this.dropdown) {
				this.hideFilterDropdown();
			}
		});
	}

	private showFilterDropdown(): void {
		// Hide any existing dropdown
		this.hideFilterDropdown();

		// Calculate available filter options (exclude already selected categories)
		const availableOptions = this.options.filter(
			(option) =>
				!this.activeFilters.some(
					(filter) => filter.category === option.id
				)
		);

		// If no options left, show a notification
		if (availableOptions.length === 0) {
			// TODO: Show a notification that all filters are used
			return;
		}

		// Create new dropdown
		this.dropdown = new FilterDropdown({
			options: availableOptions,
			anchorElement: this.addFilterButton,
			onSelect: (categoryId, value) => {
				this.addFilter(categoryId, value);
				this.hideFilterDropdown();
			},
			onClose: () => {
				this.hideFilterDropdown();
			},
		});
	}

	private hideFilterDropdown(): void {
		if (this.dropdown) {
			this.dropdown.destroy();
			this.dropdown = null;
		}
	}

	private addFilter(categoryId: string, value: string): void {
		// Find the category information
		const category = this.options.find((opt) => opt.id === categoryId);
		if (!category) return;

		// Add to active filters
		const newFilter: ActiveFilter = {
			id: `${categoryId}-${Date.now()}`,
			category: categoryId,
			categoryLabel: category.label,
			value: value,
		};

		this.activeFilters.push(newFilter);

		// Create and add the pill
		const pill = new FilterPill({
			filter: newFilter,
			onRemove: (id) => {
				this.removeFilter(id);
			},
		});

		this.filtersContainer.appendChild(pill.getElement());

		// Show clear all button if we have filters
		this.updateClearAllButton();

		// Trigger onChange callback
		this.onChange(this.activeFilters);
	}

	private removeFilter(id: string): void {
		// Find the filter index
		const index = this.activeFilters.findIndex((f) => f.id === id);
		if (index === -1) return;

		// Remove from active filters
		this.activeFilters.splice(index, 1);

		// Update clear all button visibility
		this.updateClearAllButton();

		// Trigger onChange callback
		this.onChange(this.activeFilters);
	}

	private clearAllFilters(): void {
		// Clear all active filters
		this.activeFilters = [];

		// Remove all filter pills
		this.filtersContainer.innerHTML = "";

		// Hide clear all button
		this.updateClearAllButton();

		// Trigger onChange callback
		this.onChange(this.activeFilters);
	}

	private updateClearAllButton(): void {
		this.clearAllButton.style.display =
			this.activeFilters.length > 0 ? "block" : "none";
	}

	// Public methods
	public getActiveFilters(): ActiveFilter[] {
		return [...this.activeFilters];
	}

	public setFilters(filters: { category: string; value: string }[]): void {
		// Clear existing filters
		this.clearAllFilters();

		// Add each new filter
		filters.forEach((filter) => {
			this.addFilter(filter.category, filter.value);
		});
	}

	public destroy(): void {
		// Remove event listeners
		document.removeEventListener(
			"click",
			this.hideFilterDropdown.bind(this)
		);
		document.removeEventListener(
			"keydown",
			this.hideFilterDropdown.bind(this)
		);

		// Remove dropdown if exists
		this.hideFilterDropdown();

		// Clear the container
		this.container.innerHTML = "";
	}
}
