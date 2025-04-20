import { FilterCategory, FilterDropdownOptions } from "./filter-type";
import { debounce } from "obsidian";

export class FilterDropdown {
	private options: FilterCategory[];
	private anchorElement: HTMLElement;
	private dropdownElement: HTMLElement;
	private searchInput: HTMLInputElement;
	private listContainer: HTMLElement;
	private currentCategory: FilterCategory | null = null;
	private onSelect: (category: string, value: string) => void;
	private onClose: () => void;

	constructor(options: FilterDropdownOptions) {
		this.options = options.options;
		this.anchorElement = options.anchorElement;
		this.onSelect = options.onSelect;
		this.onClose = options.onClose;

		this.dropdownElement = this.createDropdownElement();
		this.searchInput = this.dropdownElement.querySelector(
			".filter-dropdown-search"
		) as HTMLInputElement;
		this.listContainer = this.dropdownElement.querySelector(
			".filter-dropdown-list"
		) as HTMLElement;

		this.renderCategoryList();
		this.positionDropdown();
		this.setupEventListeners();

		// Focus search after a short delay to allow rendering
		setTimeout(() => {
			this.searchInput.focus();
		}, 50);
	}

	private createDropdownElement(): HTMLElement {
		const dropdown = document.createElement("div");
		dropdown.className = "filter-dropdown";
		dropdown.innerHTML = `
      <div class="filter-dropdown-header">
        <input type="text" class="filter-dropdown-search" placeholder="Filter...">
      </div>
      <div class="filter-dropdown-list"></div>
    `;

		document.body.appendChild(dropdown);

		// Add animation class after a short delay for the animation to work
		setTimeout(() => {
			dropdown.classList.add("filter-dropdown-visible");
		}, 10);

		return dropdown;
	}

	private positionDropdown(): void {
		const rect = this.anchorElement.getBoundingClientRect();
		const { innerHeight, innerWidth } = window;
		const dropdownHeight = this.dropdownElement.offsetHeight;
		const dropdownWidth = this.dropdownElement.offsetWidth;

		// Default position below the anchor
		let top = rect.bottom + 8;
		let left = rect.left;

		// Check if dropdown goes off bottom edge
		if (top + dropdownHeight > innerHeight - 16) {
			top = rect.top - dropdownHeight - 8;
		}

		// Check if dropdown goes off top edge
		if (top < 16) {
			top = 16;
		}

		// Check if dropdown goes off right edge
		if (left + dropdownWidth > innerWidth - 16) {
			left = innerWidth - dropdownWidth - 16;
		}

		// Check if dropdown goes off left edge
		if (left < 16) {
			left = 16;
		}

		this.dropdownElement.style.top = `${top}px`;
		this.dropdownElement.style.left = `${left}px`;
	}

	private renderCategoryList(): void {
		this.listContainer.innerHTML = "";
		this.searchInput.placeholder = "Filter categories...";

		this.options.forEach((category) => {
			const item = document.createElement("div");
			item.className = "filter-dropdown-item";
			item.innerHTML = `
        <span class="filter-dropdown-item-label">${category.label}</span>
        <span class="filter-dropdown-item-arrow">›</span>
      `;

			item.addEventListener("click", () => {
				this.showCategoryValues(category);
			});

			this.listContainer.appendChild(item);
		});
	}

	private showCategoryValues(category: FilterCategory): void {
		this.currentCategory = category;
		this.searchInput.value = "";
		this.searchInput.placeholder = `Filter ${category.label.toLowerCase()}...`;

		this.listContainer.innerHTML = "";

		// Add back button
		const backButton = document.createElement("div");
		backButton.className = "filter-dropdown-item filter-dropdown-back";
		backButton.innerHTML = `
      <span class="filter-dropdown-item-arrow back">‹</span>
      <span class="filter-dropdown-item-label">Back to categories</span>
    `;

		backButton.addEventListener("click", () => {
			this.currentCategory = null;
			this.renderCategoryList();
		});

		this.listContainer.appendChild(backButton);

		// Add separator
		const separator = document.createElement("div");
		separator.className = "filter-dropdown-separator";
		this.listContainer.appendChild(separator);

		// Add values
		this.renderFilterValues(category.options);

		// Set focus on search input
		this.searchInput.focus();
	}

	private renderFilterValues(
		values: string[],
		searchTerm: string = ""
	): void {
		// Remove existing values, keeping the back button and separator
		const itemsToRemove = this.listContainer.querySelectorAll(
			".filter-dropdown-value-item"
		);
		itemsToRemove.forEach((item) => item.remove());

		const filteredValues = searchTerm
			? values.filter((value) =>
					value.toLowerCase().includes(searchTerm.toLowerCase())
			  )
			: values;

		if (filteredValues.length === 0) {
			const emptyState = document.createElement("div");
			emptyState.className = "filter-dropdown-empty";
			emptyState.textContent = "No matching options found";
			this.listContainer.appendChild(emptyState);
			return;
		}

		filteredValues.forEach((value) => {
			const item = document.createElement("div");
			item.className = "filter-dropdown-item filter-dropdown-value-item";
			item.innerHTML = `<span class="filter-dropdown-item-label">${value}</span>`;

			item.addEventListener("click", () => {
				if (this.currentCategory) {
					this.onSelect(this.currentCategory.id, value);
				}
			});

			this.listContainer.appendChild(item);
		});
	}

	private setupEventListeners(): void {
		// Handle search input
		this.searchInput.addEventListener(
			"input",
			debounce(() => {
				const searchTerm = this.searchInput.value.trim();

				if (this.currentCategory) {
					// Filter values within the current category
					this.renderFilterValues(
						this.currentCategory.options,
						searchTerm
					);
				} else {
					// Filter categories
					const filteredOptions = this.options.filter(
						(category) =>
							category.label
								.toLowerCase()
								.includes(searchTerm.toLowerCase()) ||
							category.options.some((option) =>
								option
									.toLowerCase()
									.includes(searchTerm.toLowerCase())
							)
					);

					this.listContainer.innerHTML = "";

					if (filteredOptions.length === 0) {
						const emptyState = document.createElement("div");
						emptyState.className = "filter-dropdown-empty";
						emptyState.textContent = "No matching filters found";
						this.listContainer.appendChild(emptyState);
					} else {
						filteredOptions.forEach((category) => {
							const matchingValues = category.options.filter(
								(option) =>
									option
										.toLowerCase()
										.includes(searchTerm.toLowerCase())
							);

							const item = document.createElement("div");
							item.className = "filter-dropdown-item";

							if (matchingValues.length > 0 && searchTerm) {
								// Show matching values under the category
								item.innerHTML = `
                <div class="filter-dropdown-category">
                  <span class="filter-dropdown-item-label">${
						category.label
					}</span>
                </div>
                ${matchingValues
					.map(
						(value) => `
                  <div class="filter-dropdown-value-preview" data-category="${category.id}" data-value="${value}">
                    ${value}
                  </div>
                `
					)
					.join("")}
              `;

								// Add click handlers for value previews
								item.querySelectorAll(
									".filter-dropdown-value-preview"
								).forEach((preview) => {
									preview.addEventListener("click", (e) => {
										e.stopPropagation();
										const categoryId =
											preview.getAttribute(
												"data-category"
											);
										const value =
											preview.getAttribute("data-value");
										if (categoryId && value) {
											this.onSelect(categoryId, value);
										}
									});
								});
							} else {
								// Show regular category item
								item.innerHTML = `
                <span class="filter-dropdown-item-label">${category.label}</span>
                <span class="filter-dropdown-item-arrow">›</span>
              `;

								item.addEventListener("click", () => {
									this.showCategoryValues(category);
								});
							}

							this.listContainer.appendChild(item);
						});
					}
				}
			}, 150)
		);

		// Handle keyboard navigation
		this.dropdownElement.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				this.onClose();
			} else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();

				const items = Array.from(
					this.listContainer.querySelectorAll(
						".filter-dropdown-item, .filter-dropdown-value-preview"
					)
				);
				const currentIndex = items.findIndex(
					(item) => item === document.activeElement
				);

				let nextIndex;
				if (e.key === "ArrowDown") {
					nextIndex =
						currentIndex === -1 || currentIndex === items.length - 1
							? 0
							: currentIndex + 1;
				} else {
					nextIndex =
						currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
				}

				(items[nextIndex] as HTMLElement).focus();
			} else if (
				e.key === "Enter" &&
				document.activeElement !== this.searchInput
			) {
				document.activeElement?.dispatchEvent(new MouseEvent("click"));
			} else if (
				e.key === "Backspace" &&
				this.searchInput.value === "" &&
				this.currentCategory
			) {
				// Go back when pressing backspace in an empty search box
				this.currentCategory = null;
				this.renderCategoryList();
			}
		});
	}

	public getElement(): HTMLElement {
		return this.dropdownElement;
	}

	public destroy(): void {
		// Remove the dropdown with animation
		this.dropdownElement.classList.remove("filter-dropdown-visible");

		// Remove element after animation completes
		setTimeout(() => {
			this.dropdownElement.remove();
		}, 150);
	}
}
