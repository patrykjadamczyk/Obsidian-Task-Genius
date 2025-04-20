import { ActiveFilter, FilterPillOptions } from "./filter-type";

export class FilterPill {
	private filter: ActiveFilter;
	private onRemove: (id: string) => void;
	private element: HTMLElement;

	constructor(options: FilterPillOptions) {
		this.filter = options.filter;
		this.onRemove = options.onRemove;

		this.element = this.createPillElement();
		this.setupEventListeners();
	}

	private createPillElement(): HTMLElement {
		const pill = document.createElement("div");
		pill.className = "filter-pill";
		pill.setAttribute("data-filter-id", this.filter.id);

		pill.innerHTML = `
      <span class="filter-pill-category">${this.filter.categoryLabel}:</span>
      <span class="filter-pill-value">${this.filter.value}</span>
      <button class="filter-pill-remove" aria-label="Remove filter">
        <span class="filter-pill-remove-icon">×</span>
      </button>
    `;

		return pill;
	}

	private setupEventListeners(): void {
		const removeButton = this.element.querySelector(
			".filter-pill-remove"
		) as HTMLButtonElement;

		removeButton.addEventListener("click", (e) => {
			e.stopPropagation();

			// Animate removal
			this.element.classList.add("filter-pill-removing");

			// Remove after animation completes
			setTimeout(() => {
				this.onRemove(this.filter.id);
				this.element.remove();
			}, 150);
		});
	}

	public getElement(): HTMLElement {
		return this.element;
	}
}
