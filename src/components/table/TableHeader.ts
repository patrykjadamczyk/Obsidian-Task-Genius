import { Component } from "obsidian";
import { t } from "../../translations/helper";

export interface TableHeaderCallbacks {
	onTreeModeToggle?: (enabled: boolean) => void;
	onRefresh?: () => void;
	onColumnToggle?: (columnId: string, visible: boolean) => void;
}

/**
 * Table header component for displaying task count, controls, and column toggles
 */
export class TableHeader extends Component {
	private headerEl: HTMLElement;
	private taskCount: number = 0;
	private isTreeMode: boolean = false;
	private availableColumns: Array<{
		id: string;
		title: string;
		visible: boolean;
	}> = [];
	private callbacks: TableHeaderCallbacks;

	constructor(
		private containerEl: HTMLElement,
		callbacks: TableHeaderCallbacks = {}
	) {
		super();
		this.callbacks = callbacks;
	}

	onload() {
		this.render();
	}

	onunload() {
		if (this.headerEl) {
			this.headerEl.remove();
		}
	}

	/**
	 * Update task count display
	 */
	public updateTaskCount(count: number) {
		this.taskCount = count;
		this.updateTaskCountDisplay();
	}

	/**
	 * Update tree mode state
	 */
	public updateTreeMode(enabled: boolean) {
		this.isTreeMode = enabled;
		this.updateTreeModeDisplay();
	}

	/**
	 * Update available columns
	 */
	public updateColumns(
		columns: Array<{ id: string; title: string; visible: boolean }>
	) {
		this.availableColumns = columns;
		this.updateColumnToggles();
	}

	/**
	 * Render the header component
	 */
	private render() {
		this.headerEl = this.containerEl.createDiv("task-table-header-bar");

		// Left section - Task count and info
		const leftSection = this.headerEl.createDiv("table-header-left");
		this.createTaskCountDisplay(leftSection);

		// Right section - Controls
		const rightSection = this.headerEl.createDiv("table-header-right");
		this.createControls(rightSection);
	}

	/**
	 * Create task count display
	 */
	private createTaskCountDisplay(container: HTMLElement) {
		const countContainer = container.createDiv("task-count-container");

		const countIcon = countContainer.createSpan("task-count-icon");
		countIcon.textContent = "📋";

		const countText = countContainer.createSpan("task-count-text");
		countText.textContent = t("{{count}} tasks", { count: this.taskCount });
		countText.dataset.countElement = "true";
	}

	/**
	 * Create control buttons
	 */
	private createControls(container: HTMLElement) {
		const controlsContainer = container.createDiv(
			"table-controls-container"
		);

		// Tree mode toggle
		const treeModeBtn = controlsContainer.createEl(
			"button",
			"table-control-btn tree-mode-btn"
		);
		treeModeBtn.innerHTML = `
			<span class="tree-mode-icon">${this.isTreeMode ? "🌳" : "📄"}</span>
			<span class="tree-mode-text">${
				this.isTreeMode ? t("Tree Mode") : t("List Mode")
			}</span>
		`;
		treeModeBtn.title = this.isTreeMode
			? t("Switch to List Mode")
			: t("Switch to Tree Mode");

		this.registerDomEvent(treeModeBtn, "click", () => {
			this.toggleTreeMode();
		});

		// Refresh button
		const refreshBtn = controlsContainer.createEl(
			"button",
			"table-control-btn refresh-btn"
		);
		refreshBtn.innerHTML = `
			<span class="refresh-icon">🔄</span>
			<span class="refresh-text">${t("Refresh")}</span>
		`;
		refreshBtn.title = t("Refresh table data");

		this.registerDomEvent(refreshBtn, "click", () => {
			if (this.callbacks.onRefresh) {
				this.callbacks.onRefresh();
			}
		});

		// Column visibility dropdown
		const columnDropdown = controlsContainer.createDiv("column-dropdown");
		const columnBtn = columnDropdown.createEl(
			"button",
			"table-control-btn column-btn"
		);
		columnBtn.innerHTML = `
			<span class="column-icon">👁️</span>
			<span class="column-text">${t("Columns")}</span>
			<span class="dropdown-arrow">▼</span>
		`;
		columnBtn.title = t("Toggle column visibility");

		const columnMenu = columnDropdown.createDiv("column-dropdown-menu");
		columnMenu.style.display = "none";

		this.registerDomEvent(columnBtn, "click", (e) => {
			e.stopPropagation();
			const isVisible = columnMenu.style.display !== "none";
			columnMenu.style.display = isVisible ? "none" : "block";
		});

		// Close dropdown when clicking outside
		this.registerDomEvent(document, "click", () => {
			columnMenu.style.display = "none";
		});

		this.createColumnToggles(columnMenu);
	}

	/**
	 * Create column toggle checkboxes
	 */
	private createColumnToggles(container: HTMLElement) {
		container.empty();

		this.availableColumns.forEach((column) => {
			const toggleItem = container.createDiv("column-toggle-item");

			const checkbox = toggleItem.createEl(
				"input",
				"column-toggle-checkbox"
			);
			checkbox.type = "checkbox";
			checkbox.checked = column.visible;
			checkbox.id = `column-toggle-${column.id}`;

			const label = toggleItem.createEl("label", "column-toggle-label");
			label.htmlFor = checkbox.id;
			label.textContent = column.title;

			this.registerDomEvent(checkbox, "change", () => {
				if (this.callbacks.onColumnToggle) {
					this.callbacks.onColumnToggle(column.id, checkbox.checked);
				}
			});
		});
	}

	/**
	 * Toggle tree mode
	 */
	private toggleTreeMode() {
		this.isTreeMode = !this.isTreeMode;
		this.updateTreeModeDisplay();

		if (this.callbacks.onTreeModeToggle) {
			this.callbacks.onTreeModeToggle(this.isTreeMode);
		}
	}

	/**
	 * Update task count display
	 */
	private updateTaskCountDisplay() {
		const countElement = this.headerEl.querySelector(
			"[data-count-element]"
		);
		if (countElement) {
			countElement.textContent = t("{{count}} tasks", {
				count: this.taskCount,
			});
		}
	}

	/**
	 * Update tree mode button display
	 */
	private updateTreeModeDisplay() {
		const treeModeBtn = this.headerEl.querySelector(
			".tree-mode-btn"
		) as HTMLElement;
		if (treeModeBtn) {
			const icon = treeModeBtn.querySelector(".tree-mode-icon");
			const text = treeModeBtn.querySelector(".tree-mode-text");

			if (icon) icon.textContent = this.isTreeMode ? "🌳" : "📄";
			if (text)
				text.textContent = this.isTreeMode
					? t("Tree Mode")
					: t("List Mode");

			treeModeBtn.title = this.isTreeMode
				? t("Switch to List Mode")
				: t("Switch to Tree Mode");
		}
	}

	/**
	 * Update column toggles
	 */
	private updateColumnToggles() {
		const columnMenu = this.headerEl.querySelector(".column-dropdown-menu");
		if (columnMenu) {
			this.createColumnToggles(columnMenu as HTMLElement);
		}
	}
}
