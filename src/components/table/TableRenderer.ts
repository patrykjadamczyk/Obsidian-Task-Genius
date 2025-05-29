import { Component, setIcon, Menu, App } from "obsidian";
import { TableColumn, TableRow, TableCell } from "./TableTypes";
import { TableSpecificConfig } from "../../common/setting-definition";
import { t } from "../../translations/helper";
import { DatePickerPopover } from "../date-picker/DatePickerPopover";
import type TaskProgressBarPlugin from "../../index";
import { ContextSuggest, ProjectSuggest, TagSuggest } from "../AutoComplete";
import { clearAllMarks } from "../MarkdownRenderer";
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

	// Callback for row expansion
	public onRowExpand?: (rowId: string) => void;

	// Callback for cell value changes
	public onCellChange?: (
		rowId: string,
		columnId: string,
		newValue: any
	) => void;

	constructor(
		private tableEl: HTMLElement,
		private headerEl: HTMLElement,
		private bodyEl: HTMLElement,
		private columns: TableColumn[],
		private config: TableSpecificConfig,
		private app: App,
		private plugin: TaskProgressBarPlugin
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
				setIcon(sortIcon, "chevrons-up-down");
			}

			// Add resize handle if resizable
			if (column.resizable && this.config.resizableColumns) {
				const resizeHandle = th.createDiv("task-table-resize-handle");
				this.registerDomEvent(resizeHandle, "mousedown", (e) => {
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
			tr.addClass("task-table-subtask");
		}

		// Add parent/child relationship classes
		if (row.hasChildren) {
			tr.addClass("task-table-parent");
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

			// Enhanced tree indentation for content column
			if (column.id === "rowNumber") {
				this.renderTreeStructure(td, row, cell, column);
			} else {
				// For non-content columns, add subtle indentation for subtasks
				if (row.level > 0) {
					td.addClass("task-table-subtask-cell");
					td.style.opacity = "0.9";
				}

				// Render cell content based on type
				this.renderCellContent(td, cell, column);
			}

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
	 * Render tree structure for content column
	 */
	private renderTreeStructure(
		cellEl: HTMLElement,
		row: TableRow,
		cell: TableCell,
		column: TableColumn
	) {
		const treeContainer = cellEl.createDiv("task-table-tree-container");

		if (row.level > 0) {
			// Add expand/collapse button for parent rows
			if (row.hasChildren) {
				const expandBtn = treeContainer.createSpan(
					"task-table-expand-btn"
				);
				expandBtn.addClass("clickable-icon");
				setIcon(
					expandBtn,
					row.expanded ? "chevron-down" : "chevron-right"
				);
				this.registerDomEvent(expandBtn, "click", (e) => {
					e.stopPropagation();
					this.toggleRowExpansion(row.id);
				});
				expandBtn.title = row.expanded ? t("Collapse") : t("Expand");
			}
		} else if (row.hasChildren) {
			// Top-level parent task with children
			const expandBtn = treeContainer.createSpan("task-table-expand-btn");
			expandBtn.addClass("clickable-icon");
			expandBtn.addClass("task-table-top-level-expand");
			setIcon(expandBtn, row.expanded ? "chevron-down" : "chevron-right");
			this.registerDomEvent(expandBtn, "click", (e) => {
				e.stopPropagation();
				this.toggleRowExpansion(row.id);
			});
			expandBtn.title = row.expanded
				? t("Collapse subtasks")
				: t("Expand subtasks");
		}

		// Create content wrapper
		const contentWrapper = treeContainer.createDiv(
			"task-table-content-wrapper"
		);

		// Render the actual cell content
		this.renderCellContent(contentWrapper, cell, column);
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
	 * Render status cell with visual indicator and click-to-edit
	 */
	private renderStatusCell(cellEl: HTMLElement, cell: TableCell) {
		const statusContainer = cellEl.createDiv("task-table-status");
		statusContainer.addClass("clickable-status");

		// Add status icon
		const statusIcon = statusContainer.createSpan("task-table-status-icon");
		const status = cell.value as string;

		switch (status) {
			case "x":
			case "X":
				setIcon(statusIcon, "check-circle");
				statusContainer.addClass("completed");
				break;
			case "/":
			case ">":
				setIcon(statusIcon, "clock");
				statusContainer.addClass("in-progress");
				break;
			case "-":
				setIcon(statusIcon, "x-circle");
				statusContainer.addClass("abandoned");
				break;
			case "?":
				setIcon(statusIcon, "help-circle");
				statusContainer.addClass("planned");
				break;
			default:
				setIcon(statusIcon, "circle");
				statusContainer.addClass("not-started");
		}

		// Add status text
		const statusText = statusContainer.createSpan("task-table-status-text");
		statusText.textContent = cell.displayValue;

		// Add click handler for status editing
		this.registerDomEvent(statusContainer, "click", (e) => {
			e.stopPropagation();
			this.openStatusMenu(cellEl, cell);
		});

		// Add hover effect
		statusContainer.title = t("Click to change status");
	}

	/**
	 * Open status selection menu
	 */
	private openStatusMenu(cellEl: HTMLElement, cell: TableCell) {
		const rowId = cellEl.dataset.rowId;
		if (!rowId) return;

		const menu = new Menu();

		// Get unique statuses from taskStatusMarks
		const statusMarks = this.plugin.settings.taskStatusMarks;
		const uniqueStatuses = new Map<string, string>();

		// Build a map of unique mark -> status name to avoid duplicates
		for (const status of Object.keys(statusMarks)) {
			const mark = statusMarks[status as keyof typeof statusMarks];
			// If this mark is not already in the map, add it
			// This ensures each mark appears only once in the menu
			if (!Array.from(uniqueStatuses.values()).includes(mark)) {
				uniqueStatuses.set(status, mark);
			}
		}

		// Create menu items from unique statuses
		for (const [status, mark] of uniqueStatuses) {
			menu.addItem((item) => {
				item.titleEl.createEl(
					"span",
					{
						cls: "status-option-checkbox",
					},
					(el) => {
						const checkbox = el.createEl("input", {
							cls: "task-list-item-checkbox",
							type: "checkbox",
						});
						checkbox.dataset.task = mark;
						if (mark !== " ") {
							checkbox.checked = true;
						}
					}
				);
				item.titleEl.createEl("span", {
					cls: "status-option",
					text: status,
				});
				item.onClick(() => {
					if (this.onCellChange) {
						// Also update completed status if needed
						const isCompleted = mark.toLowerCase() === "x";
						this.onCellChange(rowId, cell.columnId, mark);
						// Note: completion status should be handled by the parent component
					}
				});
			});
		}

		const rect = cellEl.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom + 5 });
	}

	/**
	 * Render priority cell with visual indicator and click-to-edit
	 */
	private renderPriorityCell(cellEl: HTMLElement, cell: TableCell) {
		const priorityContainer = cellEl.createDiv("task-table-priority");
		priorityContainer.addClass("clickable-priority");
		const priority = cell.value as number;

		if (priority) {
			// Add priority icon
			const priorityIcon = priorityContainer.createSpan(
				"task-table-priority-icon"
			);

			// Add priority text with emoji and label
			const priorityText = priorityContainer.createSpan(
				"task-table-priority-text"
			);

			// Update priority icons and text according to 5-level system
			if (priority === 5) {
				setIcon(priorityIcon, "triangle");
				priorityIcon.addClass("highest");
				priorityText.textContent = t("Highest");
			} else if (priority === 4) {
				setIcon(priorityIcon, "alert-triangle");
				priorityIcon.addClass("high");
				priorityText.textContent = t("High");
			} else if (priority === 3) {
				setIcon(priorityIcon, "minus");
				priorityIcon.addClass("medium");
				priorityText.textContent = t("Medium");
			} else if (priority === 2) {
				setIcon(priorityIcon, "chevron-down");
				priorityIcon.addClass("low");
				priorityText.textContent = t("Low");
			} else if (priority === 1) {
				setIcon(priorityIcon, "chevrons-down");
				priorityIcon.addClass("lowest");
				priorityText.textContent = t("Lowest");
			}
		} else {
			// Empty priority cell
			const emptyText = priorityContainer.createSpan(
				"task-table-priority-empty"
			);
			emptyText.textContent = "\u00A0"; // Non-breaking space for invisible whitespace
			emptyText.addClass("empty-priority");
		}

		// Add click handler for priority editing
		this.registerDomEvent(priorityContainer, "click", (e) => {
			e.stopPropagation();
			this.openPriorityMenu(cellEl, cell);
		});

		// Add hover effect
		priorityContainer.title = t("Click to set priority");
	}

	/**
	 * Open priority selection menu
	 */
	private openPriorityMenu(cellEl: HTMLElement, cell: TableCell) {
		const rowId = cellEl.dataset.rowId;
		if (!rowId) return;

		const menu = new Menu();

		// No priority option
		menu.addItem((item) => {
			item.setTitle(t("No priority"))
				.setIcon("circle")
				.onClick(() => {
					if (this.onCellChange) {
						this.onCellChange(rowId, cell.columnId, null);
					}
				});
		});

		// Lowest priority (1)
		menu.addItem((item) => {
			item.setTitle(t("Lowest"))
				.setIcon("chevrons-down")
				.onClick(() => {
					if (this.onCellChange) {
						this.onCellChange(rowId, cell.columnId, 1);
					}
				});
		});

		// Low priority (2)
		menu.addItem((item) => {
			item.setTitle(t("Low"))
				.setIcon("chevron-down")
				.onClick(() => {
					if (this.onCellChange) {
						this.onCellChange(rowId, cell.columnId, 2);
					}
				});
		});

		// Medium priority (3)
		menu.addItem((item) => {
			item.setTitle(t("Medium"))
				.setIcon("minus")
				.onClick(() => {
					if (this.onCellChange) {
						this.onCellChange(rowId, cell.columnId, 3);
					}
				});
		});

		// High priority (4)
		menu.addItem((item) => {
			item.setTitle(t("High"))
				.setIcon("alert-triangle")
				.onClick(() => {
					if (this.onCellChange) {
						this.onCellChange(rowId, cell.columnId, 4);
					}
				});
		});

		// Highest priority (5)
		menu.addItem((item) => {
			item.setTitle(t("Highest"))
				.setIcon("triangle")
				.onClick(() => {
					if (this.onCellChange) {
						this.onCellChange(rowId, cell.columnId, 5);
					}
				});
		});

		const rect = cellEl.getBoundingClientRect();
		menu.showAtPosition({ x: rect.left, y: rect.bottom + 5 });
	}

	/**
	 * Render date cell with relative time and click-to-edit functionality
	 */
	private renderDateCell(cellEl: HTMLElement, cell: TableCell) {
		const dateContainer = cellEl.createDiv("task-table-date");
		dateContainer.addClass("clickable-date");

		if (cell.value) {
			const date = new Date(cell.value as number);
			date.setHours(0, 0, 0, 0); // Zero out time for consistent comparison

			const now = new Date();
			now.setHours(0, 0, 0, 0); // Zero out time for consistent comparison

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
			emptyText.textContent = "\u00A0"; // Non-breaking space for invisible whitespace
			emptyText.addClass("empty-date");
		}

		// Add click handler for date editing
		if (this.app && this.plugin) {
			this.registerDomEvent(dateContainer, "click", (e) => {
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
	 * Render tags cell with inline editing and auto-suggest
	 */
	private renderTagsCell(cellEl: HTMLElement, cell: TableCell) {
		const tagsContainer = cellEl.createDiv("task-table-tags");
		const tags = cell.value as string[];

		if (cell.editable) {
			// Create editable input for tags
			const input = tagsContainer.createEl(
				"input",
				"task-table-tags-input"
			);
			input.type = "text";
			input.value = tags?.join(", ") || "";
			input.style.border = "none";
			input.style.background = "transparent";
			input.style.width = "100%";
			input.style.padding = "0";
			input.style.font = "inherit";

			// Add auto-suggest for tags
			if (this.app) {
				const allTags = this.getAllValues("tags");
				console.log(allTags);
				new TagSuggest(this.app, input, this.plugin!);
			}

			// Handle blur event to save changes
			this.registerDomEvent(input, "blur", () => {
				const newValue = input.value.trim();
				const newTags = newValue
					? newValue
							.split(",")
							.map((tag) => tag.trim())
							.filter((tag) => tag.length > 0)
					: [];
				this.saveCellValue(cellEl, cell, newTags);
			});

			// Handle Enter key to save and exit
			this.registerDomEvent(input, "keydown", (e) => {
				if (e.key === "Enter") {
					input.blur();
					e.preventDefault();
				}
				e.stopPropagation();
			});

			// Stop click propagation
			this.registerDomEvent(input, "click", (e) => {
				e.stopPropagation();
			});
		} else {
			// Display tags as chips
			if (tags && tags.length > 0) {
				tags.forEach((tag) => {
					const tagChip = tagsContainer.createSpan(
						"task-table-tag-chip"
					);
					tagChip.textContent = tag;
				});
			} else {
				const emptyText = tagsContainer.createSpan(
					"task-table-tags-empty"
				);
				emptyText.textContent = t("No tags");
				emptyText.addClass("empty-tags");
			}
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
	 * Render text cell with inline editing and auto-suggest
	 */
	private renderTextCell(cellEl: HTMLElement, cell: TableCell) {
		cellEl.addClass("task-table-text");

		// For content column (rowNumber), use cleaned content without tags and other marks
		const isContentColumn = cell.columnId === "content";
		const displayText = isContentColumn
			? clearAllMarks((cell.value as string) || cell.displayValue)
			: cell.displayValue;

		if (cell.editable) {
			// Create editable input
			const input = cellEl.createEl("input", "task-table-text-input");
			input.type = "text";
			input.value = displayText;
			input.style.border = "none";
			input.style.background = "transparent";
			input.style.width = "100%";
			input.style.padding = "0";
			input.style.font = "inherit";

			// Add auto-suggest for project and context fields
			if (cell.columnId === "project" && this.app) {
				new ProjectSuggest(this.app, input, this.plugin);
			}

			if (cell.columnId === "context" && this.app) {
				new ContextSuggest(this.app, input, this.plugin);
			}

			// Handle blur event to save changes
			this.registerDomEvent(input, "blur", () => {
				const newValue = input.value.trim();
				this.saveCellValue(cellEl, cell, newValue);
			});

			// Handle Enter key to save and exit
			this.registerDomEvent(input, "keydown", (e) => {
				if (e.key === "Enter") {
					input.blur();
					e.preventDefault();
				}
				// Stop propagation to prevent triggering table events
				e.stopPropagation();
			});

			// Stop click propagation to prevent row selection
			this.registerDomEvent(input, "click", (e) => {
				e.stopPropagation();
			});
		} else {
			cellEl.textContent = displayText;

			if (cell.columnId === "filePath") {
				this.registerDomEvent(cellEl, "click", (e) => {
					e.stopPropagation();
					const file = this.plugin.app.vault.getFileByPath(
						cell.value as string
					);
					if (file) {
						this.plugin.app.workspace.getLeaf(true).openFile(file);
					}
				});
				cellEl.title = t("Click to open file");
			}
		}

		// Add tooltip for long text
		if (displayText.length > 50) {
			cellEl.title = displayText;
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
			icon.empty();
			setIcon(icon as HTMLElement, "chevrons-up-down");
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
				sortIcon.empty();
				setIcon(
					sortIcon as HTMLElement,
					sortOrder === "asc" ? "chevron-up" : "chevron-down"
				);
				sortIcon.addClass(sortOrder);
			}
		}
	}

	/**
	 * Setup column resize handlers
	 */
	private setupResizeHandlers() {
		this.registerDomEvent(
			document,
			"mousemove",
			this.handleMouseMove.bind(this)
		);
		this.registerDomEvent(
			document,
			"mouseup",
			this.handleMouseUp.bind(this)
		);
	}

	/**
	 * Handle mouse move during resize - prevent triggering sort when resizing
	 */
	private handleMouseMove(event: MouseEvent) {
		if (!this.isResizing) return;

		const deltaX = event.clientX - this.resizeStartX;
		const newWidth = Math.max(50, this.resizeStartWidth + deltaX);

		// Update column width
		this.updateColumnWidth(this.resizeColumn, newWidth);
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
		event.stopPropagation(); // Prevent triggering sort
		this.isResizing = true;
		this.resizeColumn = columnId;
		this.resizeStartX = event.clientX;
		this.resizeStartWidth = currentWidth;

		document.body.style.cursor = "col-resize";
		this.tableEl.addClass("resizing");
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
		if (this.onRowExpand) {
			this.onRowExpand(rowId);
		} else {
			// Fallback: dispatch event
			const event = new CustomEvent("rowToggle", {
				detail: { rowId },
			});
			this.tableEl.dispatchEvent(event);
		}
	}

	/**
	 * Update columns configuration and re-render header
	 */
	public updateColumns(newColumns: TableColumn[]) {
		this.columns = newColumns;
		this.renderHeader();
	}

	/**
	 * Get all available values for auto-completion from existing tasks
	 */
	private getAllValues(columnType: string): string[] {
		if (!this.plugin) return [];

		// Get all tasks from the plugin
		const allTasks = this.plugin.taskManager?.getAllTasks() || [];
		const values = new Set<string>();

		allTasks.forEach((task) => {
			switch (columnType) {
				case "tags":
					task.tags?.forEach((tag) => {
						if (tag && tag.trim()) {
							// Remove # prefix if present
							const cleanTag = tag.startsWith("#")
								? tag.substring(1)
								: tag;
							values.add(cleanTag);
						}
					});
					break;
				case "project":
					if (task.project && task.project.trim()) {
						values.add(task.project);
					}
					break;
				case "context":
					if (task.context && task.context.trim()) {
						values.add(task.context);
					}
					break;
			}
		});

		return Array.from(values).sort();
	}

	/**
	 * Save cell value helper
	 */
	private saveCellValue(cellEl: HTMLElement, cell: TableCell, newValue: any) {
		const rowId = cellEl.dataset.rowId;
		if (rowId && this.onCellChange) {
			// Only save if value actually changed
			const currentValue = Array.isArray(cell.value)
				? cell.value.join(", ")
				: cell.displayValue;
			const newValueStr = Array.isArray(newValue)
				? newValue.join(", ")
				: String(newValue);

			if (currentValue !== newValueStr) {
				this.onCellChange(rowId, cell.columnId, newValue);
			}
		}
	}
}
