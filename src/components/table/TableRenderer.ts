import { Component } from "obsidian";
import { TableColumn, TableRow, TableCell } from "./TableTypes";
import { TableSpecificConfig } from "../../common/setting-definition";
import { t } from "../../translations/helper";
import { DatePickerPopover } from "../date-picker/DatePickerPopover";
import type TaskProgressBarPlugin from "../../index";

/**
 * Table renderer component responsible for rendering the table HTML structure
 */
export class TableRenderer extends Component {
	private resizeObserver: ResizeObserver | null = null;
	private isResizing: boolean = false;
	private resizeStartX: number = 0;
	private resizeColumn: string = "";
	private resizeStartWidth: number = 0;

	// Callback for date changes
	public onDateChange?: (
		rowId: string,
		columnId: string,
		newDate: string | null
	) => void;

	constructor(
		private tableEl: HTMLElement,
		private headerEl: HTMLElement,
		private bodyEl: HTMLElement,
		private columns: TableColumn[],
		private config: TableSpecificConfig,
		private app?: any,
		private plugin?: TaskProgressBarPlugin
	) {
		super();
	}

	onload() {
		this.renderHeader();
		this.setupResizeHandlers();
	}

	onunload() {
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
		}
	}

	/**
	 * Render the table header
	 */
	private renderHeader() {
		this.headerEl.empty();

		const headerRow = this.headerEl.createEl("tr", "task-table-header-row");

		this.columns.forEach((column) => {
			const th = headerRow.createEl("th", "task-table-header-cell");
			th.dataset.columnId = column.id;
			th.style.width = `${column.width}px`;
			th.style.minWidth = `${Math.min(column.width, 50)}px`;

			// Create header content container
			const headerContent = th.createDiv("task-table-header-content");

			// Add column title
			const titleSpan = headerContent.createSpan(
				"task-table-header-title"
			);
			titleSpan.textContent = column.title;

			// Add sort indicator if sortable
			if (column.sortable) {
				th.addClass("sortable");
				const sortIcon = headerContent.createSpan(
					"task-table-sort-icon"
				);
				sortIcon.innerHTML = "↕️"; // Default sort icon
			}

			// Add resize handle if resizable
			if (column.resizable && this.config.resizableColumns) {
				const resizeHandle = th.createDiv("task-table-resize-handle");
				resizeHandle.addEventListener("mousedown", (e) => {
					this.startResize(e, column.id, column.width);
				});
			}

			// Set text alignment
			if (column.align) {
				th.style.textAlign = column.align;
			}
		});
	}

	/**
	 * Render the table body with rows
	 */
	public renderTable(
		rows: TableRow[],
		selectedRows: Set<string>,
		startIndex: number = 0
	) {
		this.bodyEl.empty();

		if (rows.length === 0) {
			this.renderEmptyState();
			return;
		}

		// If we have a startIndex (virtual scrolling), add spacer for rows above viewport
		if (startIndex > 0) {
			const topSpacer = this.bodyEl.createEl(
				"tr",
				"virtual-scroll-spacer-top"
			);
			const spacerCell = topSpacer.createEl("td");
			spacerCell.colSpan = this.columns.length;
			spacerCell.style.height = `${startIndex * 40}px`; // Assuming 40px row height
			spacerCell.style.padding = "0";
			spacerCell.style.border = "none";
		}

		rows.forEach((row, index) => {
			this.renderRow(row, selectedRows.has(row.id));
		});
	}

	/**
	 * Render a single table row
	 */
	private renderRow(row: TableRow, isSelected: boolean) {
		const tr = this.bodyEl.createEl("tr", "task-table-row");
		tr.dataset.rowId = row.id;

		// Add tree level indentation class
		if (row.level > 0) {
			tr.addClass(`task-table-row-level-${row.level}`);
		}

		// Add selection state
		if (isSelected) {
			tr.addClass("selected");
		}

		// Add custom row class if provided
		if (row.className) {
			tr.addClass(row.className);
		}

		// Render cells
		row.cells.forEach((cell, index) => {
			const column = this.columns[index];
			if (!column) return;

			const td = tr.createEl("td", "task-table-cell");
			td.dataset.columnId = cell.columnId;
			td.dataset.rowId = row.id;

			// Set cell width to match column
			td.style.width = `${column.width}px`;
			td.style.minWidth = `${Math.min(column.width, 50)}px`;

			// Add tree indentation for content column
			if (column.id === "content" && row.level > 0) {
				const indent = td.createSpan("task-table-tree-indent");
				indent.style.paddingLeft = `${row.level * 20}px`;

				// Add expand/collapse button for parent rows
				if (row.hasChildren) {
					const expandBtn = indent.createSpan(
						"task-table-expand-btn"
					);
					expandBtn.textContent = row.expanded ? "▼" : "▶";
					expandBtn.addEventListener("click", (e) => {
						e.stopPropagation();
						this.toggleRowExpansion(row.id);
					});
				}
			}

			// Render cell content based on type
			this.renderCellContent(td, cell, column);

			// Add custom cell class if provided
			if (cell.className) {
				td.addClass(cell.className);
			}

			// Set text alignment
			if (column.align) {
				td.style.textAlign = column.align;
			}
		});
	}

	/**
	 * Render cell content based on column type
	 */
	private renderCellContent(
		cellEl: HTMLElement,
		cell: TableCell,
		column: TableColumn
	) {
		cellEl.empty();

		switch (column.type) {
			case "status":
				this.renderStatusCell(cellEl, cell);
				break;
			case "priority":
				this.renderPriorityCell(cellEl, cell);
				break;
			case "date":
				this.renderDateCell(cellEl, cell);
				break;
			case "tags":
				this.renderTagsCell(cellEl, cell);
				break;
			case "number":
				this.renderNumberCell(cellEl, cell);
				break;
			default:
				this.renderTextCell(cellEl, cell);
		}
	}

	/**
	 * Render status cell with visual indicator
	 */
	private renderStatusCell(cellEl: HTMLElement, cell: TableCell) {
		const statusContainer = cellEl.createDiv("task-table-status");

		// Add status icon
		const statusIcon = statusContainer.createSpan("task-table-status-icon");
		const status = cell.value as string;

		switch (status) {
			case "x":
			case "X":
				statusIcon.textContent = "✅";
				statusContainer.addClass("completed");
				break;
			case "/":
			case ">":
				statusIcon.textContent = "🔄";
				statusContainer.addClass("in-progress");
				break;
			case "-":
				statusIcon.textContent = "❌";
				statusContainer.addClass("abandoned");
				break;
			case "?":
				statusIcon.textContent = "❓";
				statusContainer.addClass("planned");
				break;
			default:
				statusIcon.textContent = "⭕";
				statusContainer.addClass("not-started");
		}

		// Add status text
		const statusText = statusContainer.createSpan("task-table-status-text");
		statusText.textContent = cell.displayValue;
	}

	/**
	 * Render priority cell with visual indicator
	 */
	private renderPriorityCell(cellEl: HTMLElement, cell: TableCell) {
		const priorityContainer = cellEl.createDiv("task-table-priority");
		const priority = cell.value as number;

		if (priority) {
			// Add priority dots
			const priorityDots = priorityContainer.createSpan(
				"task-table-priority-dots"
			);
			for (let i = 0; i < priority; i++) {
				const dot = priorityDots.createSpan("priority-dot");
				if (priority === 1) dot.addClass("high");
				else if (priority === 2) dot.addClass("medium");
				else dot.addClass("low");
			}

			// Add priority text
			const priorityText = priorityContainer.createSpan(
				"task-table-priority-text"
			);
			priorityText.textContent = cell.displayValue;
		}
	}

	/**
	 * Render date cell with relative time and click-to-edit functionality
	 */
	private renderDateCell(cellEl: HTMLElement, cell: TableCell) {
		const dateContainer = cellEl.createDiv("task-table-date");
		dateContainer.addClass("clickable-date");

		if (cell.value) {
			const date = new Date(cell.value as number);
			const now = new Date();
			const diffDays = Math.floor(
				(date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
			);

			// Add date text
			const dateText = dateContainer.createSpan("task-table-date-text");
			dateText.textContent = cell.displayValue;

			// Add relative indicator
			const relativeIndicator = dateContainer.createSpan(
				"task-table-date-relative"
			);
			if (diffDays === 0) {
				relativeIndicator.textContent = t("Today");
				relativeIndicator.addClass("today");
			} else if (diffDays === 1) {
				relativeIndicator.textContent = t("Tomorrow");
				relativeIndicator.addClass("tomorrow");
			} else if (diffDays === -1) {
				relativeIndicator.textContent = t("Yesterday");
				relativeIndicator.addClass("yesterday");
			} else if (diffDays < 0) {
				relativeIndicator.textContent = t("Overdue");
				relativeIndicator.addClass("overdue");
			} else if (diffDays <= 7) {
				relativeIndicator.textContent = `${diffDays}d`;
				relativeIndicator.addClass("upcoming");
			}
		} else {
			// Empty date cell
			const emptyText = dateContainer.createSpan("task-table-date-empty");
			emptyText.textContent = t("No date");
			emptyText.addClass("empty-date");
		}

		// Add click handler for date editing
		if (this.app && this.plugin) {
			dateContainer.addEventListener("click", (e) => {
				e.stopPropagation();
				this.openDatePicker(cellEl, cell);
			});

			// Add hover effect
			dateContainer.title = t("Click to edit date");
		}
	}

	/**
	 * Open date picker for editing date
	 */
	private openDatePicker(cellEl: HTMLElement, cell: TableCell) {
		if (!this.app || !this.plugin) return;

		const rowId = cellEl.dataset.rowId;
		const columnId = cell.columnId;

		if (!rowId) return;

		// Get current date value
		const currentDate = cell.value
			? new Date(cell.value as number).toISOString().split("T")[0]
			: undefined;

		// Create date picker popover
		const popover = new DatePickerPopover(
			this.app,
			this.plugin,
			currentDate
		);

		popover.onDateSelected = (dateStr: string | null) => {
			if (this.onDateChange) {
				this.onDateChange(rowId, columnId, dateStr);
			}
		};

		// Position the popover near the cell
		const rect = cellEl.getBoundingClientRect();
		popover.showAtPosition({
			x: rect.left,
			y: rect.bottom + 5,
		});
	}

	/**
	 * Render tags cell with tag chips
	 */
	private renderTagsCell(cellEl: HTMLElement, cell: TableCell) {
		const tagsContainer = cellEl.createDiv("task-table-tags");
		const tags = cell.value as string[];

		if (tags && tags.length > 0) {
			tags.forEach((tag) => {
				const tagChip = tagsContainer.createSpan("task-table-tag-chip");
				tagChip.textContent = tag;
			});
		}
	}

	/**
	 * Render number cell with proper alignment
	 */
	private renderNumberCell(cellEl: HTMLElement, cell: TableCell) {
		cellEl.addClass("task-table-number");
		cellEl.textContent = cell.displayValue;
	}

	/**
	 * Render text cell
	 */
	private renderTextCell(cellEl: HTMLElement, cell: TableCell) {
		cellEl.addClass("task-table-text");
		cellEl.textContent = cell.displayValue;

		// Add tooltip for long text
		if (cell.displayValue.length > 50) {
			cellEl.title = cell.displayValue;
		}
	}

	/**
	 * Render empty state
	 */
	private renderEmptyState() {
		const emptyRow = this.bodyEl.createEl("tr", "task-table-empty-row");
		const emptyCell = emptyRow.createEl("td", "task-table-empty-cell");
		emptyCell.colSpan = this.columns.length;
		emptyCell.textContent = t("No tasks found");
	}

	/**
	 * Update row selection visual state
	 */
	public updateSelection(selectedRows: Set<string>) {
		const rows = this.bodyEl.querySelectorAll("tr[data-row-id]");
		rows.forEach((row) => {
			const rowId = (row as HTMLElement).dataset.rowId;
			if (rowId) {
				row.toggleClass("selected", selectedRows.has(rowId));
			}
		});
	}

	/**
	 * Update sort indicators in header
	 */
	public updateSortIndicators(sortField: string, sortOrder: "asc" | "desc") {
		// Clear all sort indicators
		const sortIcons = this.headerEl.querySelectorAll(
			".task-table-sort-icon"
		);
		sortIcons.forEach((icon) => {
			icon.textContent = "↕️";
			icon.removeClass("asc", "desc");
		});

		// Set active sort indicator
		const activeHeader = this.headerEl.querySelector(
			`th[data-column-id="${sortField}"]`
		);
		if (activeHeader) {
			const sortIcon = activeHeader.querySelector(
				".task-table-sort-icon"
			);
			if (sortIcon) {
				sortIcon.textContent = sortOrder === "asc" ? "↑" : "↓";
				sortIcon.addClass(sortOrder);
			}
		}
	}

	/**
	 * Setup column resize handlers
	 */
	private setupResizeHandlers() {
		document.addEventListener("mousemove", this.handleMouseMove.bind(this));
		document.addEventListener("mouseup", this.handleMouseUp.bind(this));
	}

	/**
	 * Start column resize
	 */
	private startResize(
		event: MouseEvent,
		columnId: string,
		currentWidth: number
	) {
		event.preventDefault();
		this.isResizing = true;
		this.resizeColumn = columnId;
		this.resizeStartX = event.clientX;
		this.resizeStartWidth = currentWidth;

		document.body.style.cursor = "col-resize";
		this.tableEl.addClass("resizing");
	}

	/**
	 * Handle mouse move during resize
	 */
	private handleMouseMove(event: MouseEvent) {
		if (!this.isResizing) return;

		const deltaX = event.clientX - this.resizeStartX;
		const newWidth = Math.max(50, this.resizeStartWidth + deltaX);

		// Update column width
		this.updateColumnWidth(this.resizeColumn, newWidth);
	}

	/**
	 * Handle mouse up to end resize
	 */
	private handleMouseUp() {
		if (!this.isResizing) return;

		this.isResizing = false;
		this.resizeColumn = "";
		document.body.style.cursor = "";
		this.tableEl.removeClass("resizing");
	}

	/**
	 * Update column width
	 */
	private updateColumnWidth(columnId: string, newWidth: number) {
		// Update header
		const headerCell = this.headerEl.querySelector(
			`th[data-column-id="${columnId}"]`
		) as HTMLElement;
		if (headerCell) {
			headerCell.style.width = `${newWidth}px`;
			headerCell.style.minWidth = `${Math.min(newWidth, 50)}px`;
		}

		// Update body cells
		const bodyCells = this.bodyEl.querySelectorAll(
			`td[data-column-id="${columnId}"]`
		);
		bodyCells.forEach((cell) => {
			const cellEl = cell as HTMLElement;
			cellEl.style.width = `${newWidth}px`;
			cellEl.style.minWidth = `${Math.min(newWidth, 50)}px`;
		});

		// Update column definition
		const column = this.columns.find((c) => c.id === columnId);
		if (column) {
			column.width = newWidth;
		}
	}

	/**
	 * Toggle row expansion (for tree view)
	 */
	private toggleRowExpansion(rowId: string) {
		// This will be handled by the parent component
		// Emit event or call callback
		const event = new CustomEvent("rowToggle", {
			detail: { rowId },
		});
		this.tableEl.dispatchEvent(event);
	}

	/**
	 * Update columns configuration and re-render header
	 */
	public updateColumns(newColumns: TableColumn[]) {
		this.columns = newColumns;
		this.renderHeader();
	}
}
