import { Component, App, debounce } from "obsidian";
import { Task } from "../../types/task";
import { TableSpecificConfig } from "../../common/setting-definition";
import TaskProgressBarPlugin from "../../index";
import { t } from "../../translations/helper";
import { TableColumn, TableRow, TableCell } from "./TableTypes";
import { TableRenderer } from "./TableRenderer";
import { TableEditor } from "./TableEditor";
import { TreeManager } from "./TreeManager";
import { VirtualScrollManager } from "./VirtualScrollManager";
import "../../styles/table.css";

export interface TableViewCallbacks {
	onTaskSelected?: (task: Task | null) => void;
	onTaskCompleted?: (task: Task) => void;
	onTaskContextMenu?: (event: MouseEvent, task: Task) => void;
	onTaskUpdated?: (task: Task) => void;
}

/**
 * Main table view component for displaying tasks in an editable table format
 * Supports both flat list and hierarchical tree view with lazy loading
 */
export class TableView extends Component {
	public containerEl: HTMLElement;
	private tableEl: HTMLElement;
	private headerEl: HTMLElement;
	private bodyEl: HTMLElement;
	private loadingEl: HTMLElement;

	// Child components
	private renderer: TableRenderer;
	private editor: TableEditor;
	private treeManager: TreeManager;
	private virtualScroll: VirtualScrollManager;

	// Data management
	private allTasks: Task[] = [];
	private filteredTasks: Task[] = [];
	private displayedRows: TableRow[] = [];
	private columns: TableColumn[] = [];
	private selectedRows: Set<string> = new Set();
	private editingCell: { rowId: string; columnId: string } | null = null;

	// State
	private isTreeView: boolean = false;
	private currentSortField: string = "";
	private currentSortOrder: "asc" | "desc" = "asc";
	private isLoading: boolean = false;

	// Callbacks
	public onTaskSelected?: (task: Task | null) => void;
	public onTaskCompleted?: (task: Task) => void;
	public onTaskContextMenu?: (event: MouseEvent, task: Task) => void;
	public onTaskUpdated?: (task: Task) => void;

	constructor(
		private app: App,
		private plugin: TaskProgressBarPlugin,
		private parentEl: HTMLElement,
		private config: TableSpecificConfig,
		private callbacks: TableViewCallbacks = {}
	) {
		super();
		this.setupCallbacks();
		this.initializeConfig();
	}

	private setupCallbacks() {
		// 对于表格视图，我们不自动触发任务选择，让父组件决定是否显示详情
		// this.onTaskSelected = this.callbacks.onTaskSelected;
		this.onTaskCompleted = this.callbacks.onTaskCompleted;
		this.onTaskContextMenu = this.callbacks.onTaskContextMenu;
		this.onTaskUpdated = this.callbacks.onTaskUpdated;
	}

	private initializeConfig() {
		this.isTreeView = this.config.enableTreeView;
		this.currentSortField = this.config.defaultSortField;
		this.currentSortOrder = this.config.defaultSortOrder;
		this.initializeColumns();
	}

	private initializeColumns() {
		// Define all available columns
		const allColumns: TableColumn[] = [
			{
				id: "rowNumber",
				title: "#",
				width: 60,
				sortable: false,
				resizable: false,
				type: "number",
				visible: this.config.showRowNumbers,
			},
			{
				id: "status",
				title: t("Status"),
				width: this.config.columnWidths.status || 80,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "status",
				visible: this.config.visibleColumns.includes("status"),
			},
			{
				id: "content",
				title: t("Content"),
				width: this.config.columnWidths.content || 300,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "text",
				visible: this.config.visibleColumns.includes("content"),
			},
			{
				id: "priority",
				title: t("Priority"),
				width: this.config.columnWidths.priority || 100,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "priority",
				visible: this.config.visibleColumns.includes("priority"),
			},
			{
				id: "dueDate",
				title: t("Due Date"),
				width: this.config.columnWidths.dueDate || 120,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "date",
				visible: this.config.visibleColumns.includes("dueDate"),
			},
			{
				id: "startDate",
				title: t("Start Date"),
				width: this.config.columnWidths.startDate || 120,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "date",
				visible: this.config.visibleColumns.includes("startDate"),
			},
			{
				id: "scheduledDate",
				title: t("Scheduled Date"),
				width: this.config.columnWidths.scheduledDate || 120,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "date",
				visible: this.config.visibleColumns.includes("scheduledDate"),
			},
			{
				id: "tags",
				title: t("Tags"),
				width: this.config.columnWidths.tags || 150,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "tags",
				visible: this.config.visibleColumns.includes("tags"),
			},
			{
				id: "project",
				title: t("Project"),
				width: this.config.columnWidths.project || 150,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "text",
				visible: this.config.visibleColumns.includes("project"),
			},
			{
				id: "context",
				title: t("Context"),
				width: this.config.columnWidths.context || 120,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "text",
				visible: this.config.visibleColumns.includes("context"),
			},
			{
				id: "filePath",
				title: t("File"),
				width: this.config.columnWidths.filePath || 200,
				sortable: this.config.sortableColumns,
				resizable: this.config.resizableColumns,
				type: "text",
				visible: this.config.visibleColumns.includes("filePath"),
			},
		];

		this.columns = allColumns.filter((col) => col.visible);
	}

	onload() {
		this.createTableStructure();
		this.initializeChildComponents();
		this.setupEventListeners();
	}

	onunload() {
		this.cleanup();
	}

	private createTableStructure() {
		this.containerEl = this.parentEl.createDiv("task-table-container");

		// Create table element
		this.tableEl = this.containerEl.createEl("table", "task-table");

		// Create header
		this.headerEl = this.tableEl.createEl("thead", "task-table-header");

		// Create body
		this.bodyEl = this.tableEl.createEl("tbody", "task-table-body");

		// Create loading indicator
		this.loadingEl = this.containerEl.createDiv("task-table-loading");
		this.loadingEl.textContent = t("Loading...");
		this.loadingEl.style.display = "none";
	}

	private initializeChildComponents() {
		// Initialize renderer
		this.renderer = new TableRenderer(
			this.tableEl,
			this.headerEl,
			this.bodyEl,
			this.columns,
			this.config
		);
		this.addChild(this.renderer);

		// Initialize editor
		this.editor = new TableEditor(this.app, this.plugin, this.config, {
			onCellEdit: this.handleCellEdit.bind(this),
			onEditComplete: this.handleEditComplete.bind(this),
			onEditCancel: this.handleEditCancel.bind(this),
		});
		this.addChild(this.editor);

		// Initialize tree manager if tree view is enabled
		if (this.config.enableTreeView) {
			this.treeManager = new TreeManager();
			this.addChild(this.treeManager);
		}

		// Initialize virtual scroll if lazy loading is enabled
		if (this.config.enableLazyLoading) {
			this.virtualScroll = new VirtualScrollManager(
				this.containerEl,
				this.config.pageSize,
				{
					onLoadMore: this.loadMoreRows.bind(this),
					onScroll: this.handleScroll.bind(this),
				}
			);
			this.addChild(this.virtualScroll);
		}
	}

	private setupEventListeners() {
		// Table click events
		this.tableEl.addEventListener(
			"click",
			this.handleTableClick.bind(this)
		);
		this.tableEl.addEventListener(
			"dblclick",
			this.handleTableDoubleClick.bind(this)
		);
		this.tableEl.addEventListener(
			"contextmenu",
			this.handleTableContextMenu.bind(this)
		);

		// Keyboard events
		this.containerEl.addEventListener(
			"keydown",
			this.handleKeyDown.bind(this)
		);

		// Header events for sorting and resizing
		this.headerEl.addEventListener(
			"click",
			this.handleHeaderClick.bind(this)
		);
	}

	/**
	 * Update the table with new task data
	 */
	public updateTasks(tasks: Task[]) {
		this.allTasks = tasks;
		this.applyFiltersAndSort();
		this.refreshDisplay();
	}

	/**
	 * Apply current filters and sorting to the task list
	 */
	private applyFiltersAndSort() {
		// Apply any additional filters here if needed
		this.filteredTasks = [...this.allTasks];

		// Sort tasks
		if (this.currentSortField) {
			this.sortTasks(this.currentSortField, this.currentSortOrder);
		}
	}

	/**
	 * Sort tasks by the specified field and order
	 */
	private sortTasks(field: string, order: "asc" | "desc") {
		this.filteredTasks.sort((a, b) => {
			let aValue = this.getTaskFieldValue(a, field);
			let bValue = this.getTaskFieldValue(b, field);

			// Handle null/undefined values
			if (aValue == null && bValue == null) return 0;
			if (aValue == null) return order === "asc" ? 1 : -1;
			if (bValue == null) return order === "asc" ? -1 : 1;

			// Compare values
			let comparison = 0;
			if (typeof aValue === "string" && typeof bValue === "string") {
				comparison = aValue.localeCompare(bValue);
			} else if (
				typeof aValue === "number" &&
				typeof bValue === "number"
			) {
				comparison = aValue - bValue;
			} else {
				comparison = String(aValue).localeCompare(String(bValue));
			}

			return order === "asc" ? comparison : -comparison;
		});
	}

	/**
	 * Get the value of a specific field from a task
	 */
	private getTaskFieldValue(task: Task, field: string): any {
		switch (field) {
			case "status":
				return task.status;
			case "content":
				return task.content;
			case "priority":
				return task.priority || 0;
			case "dueDate":
				return task.dueDate;
			case "startDate":
				return task.startDate;
			case "scheduledDate":
				return task.scheduledDate;
			case "tags":
				return task.tags?.join(", ") || "";
			case "project":
				return task.project || "";
			case "context":
				return task.context || "";
			case "filePath":
				return task.filePath;
			default:
				return "";
		}
	}

	/**
	 * Refresh the table display
	 */
	private refreshDisplay() {
		if (this.isTreeView && this.treeManager) {
			this.displayedRows = this.treeManager.buildTreeRows(
				this.filteredTasks
			);
		} else {
			this.displayedRows = this.buildFlatRows(this.filteredTasks);
		}

		// If virtual scrolling is enabled and we have many rows, use virtual rendering
		if (
			this.virtualScroll &&
			this.displayedRows.length > this.config.pageSize
		) {
			this.virtualScroll.updateContent(this.displayedRows.length);
			const viewport = this.virtualScroll.getViewport();
			const visibleRows = this.displayedRows.slice(
				viewport.startIndex,
				viewport.endIndex + 1
			);
			this.renderer.renderTable(
				visibleRows,
				this.selectedRows,
				viewport.startIndex
			);
		} else {
			// Render all rows normally
			this.renderer.renderTable(this.displayedRows, this.selectedRows);
		}
	}

	/**
	 * Build flat table rows from tasks
	 */
	private buildFlatRows(tasks: Task[]): TableRow[] {
		return tasks.map((task, index) => ({
			id: task.id,
			task: task,
			level: 0,
			expanded: false,
			hasChildren: false,
			cells: this.buildCellsForTask(task, index + 1),
		}));
	}

	/**
	 * Build table cells for a task
	 */
	private buildCellsForTask(task: Task, rowNumber: number): TableCell[] {
		return this.columns.map((column) => {
			let value: any;
			let displayValue: string;

			switch (column.id) {
				case "rowNumber":
					value = rowNumber;
					displayValue = rowNumber.toString();
					break;
				case "status":
					value = task.status;
					displayValue = this.formatStatus(task.status);
					break;
				case "content":
					value = task.content;
					displayValue = task.content;
					break;
				case "priority":
					value = task.priority;
					displayValue = this.formatPriority(task.priority);
					break;
				case "dueDate":
					value = task.dueDate;
					displayValue = this.formatDate(task.dueDate);
					break;
				case "startDate":
					value = task.startDate;
					displayValue = this.formatDate(task.startDate);
					break;
				case "scheduledDate":
					value = task.scheduledDate;
					displayValue = this.formatDate(task.scheduledDate);
					break;
				case "tags":
					value = task.tags;
					displayValue = task.tags?.join(", ") || "";
					break;
				case "project":
					value = task.project;
					displayValue = task.project || "";
					break;
				case "context":
					value = task.context;
					displayValue = task.context || "";
					break;
				case "filePath":
					value = task.filePath;
					displayValue = this.formatFilePath(task.filePath);
					break;
				default:
					value = "";
					displayValue = "";
			}

			return {
				columnId: column.id,
				value: value,
				displayValue: displayValue,
				editable:
					column.id !== "rowNumber" &&
					this.config.enableInlineEditing,
			};
		});
	}

	// Formatting methods
	private formatStatus(status: string): string {
		// Convert status symbols to readable text
		const statusMap: Record<string, string> = {
			" ": t("Not Started"),
			x: t("Completed"),
			X: t("Completed"),
			"/": t("In Progress"),
			">": t("In Progress"),
			"-": t("Abandoned"),
			"?": t("Planned"),
		};
		return statusMap[status] || status;
	}

	private formatPriority(priority?: number): string {
		if (!priority) return "";
		const priorityMap: Record<number, string> = {
			1: t("High"),
			2: t("Medium"),
			3: t("Low"),
		};
		return priorityMap[priority] || priority.toString();
	}

	private formatDate(timestamp?: number): string {
		if (!timestamp) return "";
		return new Date(timestamp).toLocaleDateString();
	}

	private formatFilePath(filePath: string): string {
		// Extract just the filename
		const parts = filePath.split("/");
		return parts[parts.length - 1].replace(/\.md$/, "");
	}

	// Event handlers
	private handleTableClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const row = target.closest("tr");
		if (!row) return;

		const rowId = row.dataset.rowId;
		if (!rowId) return;

		const task = this.allTasks.find((t) => t.id === rowId);
		if (!task) return;

		// Handle row selection
		if (this.config.enableRowSelection) {
			if (event.ctrlKey || event.metaKey) {
				// Multi-select
				if (this.config.enableMultiSelect) {
					if (this.selectedRows.has(rowId)) {
						this.selectedRows.delete(rowId);
					} else {
						this.selectedRows.add(rowId);
					}
				}
			} else {
				// Single select
				this.selectedRows.clear();
				this.selectedRows.add(rowId);
			}
			this.updateRowSelection();
		}

		// 表格视图不自动触发任务选择，避免显示详情面板
		// 如果需要显示详情，可以通过右键菜单或其他方式触发
		// if (this.onTaskSelected) {
		// 	this.onTaskSelected(task);
		// }
	}

	private handleTableDoubleClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const cell = target.closest("td");
		if (!cell) return;

		const row = cell.closest("tr");
		if (!row) return;

		const rowId = row.dataset.rowId;
		const columnId = cell.dataset.columnId;

		if (rowId && columnId && this.config.enableInlineEditing) {
			this.startCellEdit(rowId, columnId, cell);
		}
	}

	private handleTableContextMenu(event: MouseEvent) {
		event.preventDefault();

		const target = event.target as HTMLElement;
		const row = target.closest("tr");
		if (!row) return;

		const rowId = row.dataset.rowId;
		if (!rowId) return;

		const task = this.allTasks.find((t) => t.id === rowId);
		if (!task) return;

		// 调用原有的上下文菜单回调
		if (this.onTaskContextMenu) {
			this.onTaskContextMenu(event, task);
		}
	}

	private handleHeaderClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const header = target.closest("th");
		if (!header) return;

		const columnId = header.dataset.columnId;
		if (!columnId) return;

		const column = this.columns.find((c) => c.id === columnId);
		if (!column || !column.sortable) return;

		// Toggle sort order
		if (this.currentSortField === columnId) {
			this.currentSortOrder =
				this.currentSortOrder === "asc" ? "desc" : "asc";
		} else {
			this.currentSortField = columnId;
			this.currentSortOrder = "asc";
		}

		this.applyFiltersAndSort();
		this.refreshDisplay();
		this.updateSortIndicators();
	}

	private handleKeyDown(event: KeyboardEvent) {
		// Handle keyboard shortcuts
		if (event.key === "Escape" && this.editingCell) {
			this.cancelCellEdit();
		}
	}

	private handleScroll = debounce(() => {
		// Handle scroll events for virtual scrolling
		if (
			this.virtualScroll &&
			this.displayedRows.length > this.config.pageSize
		) {
			this.virtualScroll.handleScroll();
			// Re-render visible rows after scroll
			const viewport = this.virtualScroll.getViewport();
			const visibleRows = this.displayedRows.slice(
				viewport.startIndex,
				viewport.endIndex + 1
			);
			this.renderer.renderTable(
				visibleRows,
				this.selectedRows,
				viewport.startIndex
			);
		}
	}, 16);

	// Cell editing methods
	private startCellEdit(
		rowId: string,
		columnId: string,
		cellEl: HTMLElement
	) {
		if (this.editingCell) {
			this.cancelCellEdit();
		}

		this.editingCell = { rowId, columnId };
		this.editor.startEdit(rowId, columnId, cellEl);
	}

	private handleCellEdit(rowId: string, columnId: string, newValue: any) {
		const task = this.allTasks.find((t) => t.id === rowId);
		if (!task) return;

		// Update task property
		const updatedTask = { ...task };
		this.updateTaskProperty(updatedTask, columnId, newValue);

		// Notify task update
		if (this.onTaskUpdated) {
			this.onTaskUpdated(updatedTask);
		}
	}

	private handleEditComplete() {
		this.editingCell = null;
		this.refreshDisplay();
	}

	private handleEditCancel() {
		this.editingCell = null;
	}

	private cancelCellEdit() {
		if (this.editingCell) {
			this.editor.cancelEdit();
			this.editingCell = null;
		}
	}

	private updateTaskProperty(task: Task, property: string, value: any) {
		switch (property) {
			case "status":
				task.status = value;
				task.completed = value === "x" || value === "X";
				break;
			case "content":
				task.content = value;
				break;
			case "priority":
				task.priority = parseInt(value) || undefined;
				break;
			case "dueDate":
				task.dueDate = value ? new Date(value).getTime() : undefined;
				break;
			case "startDate":
				task.startDate = value ? new Date(value).getTime() : undefined;
				break;
			case "scheduledDate":
				task.scheduledDate = value
					? new Date(value).getTime()
					: undefined;
				break;
			case "tags":
				task.tags = value
					? value.split(",").map((t: string) => t.trim())
					: [];
				break;
			case "project":
				task.project = value || undefined;
				break;
			case "context":
				task.context = value || undefined;
				break;
		}
	}

	// UI update methods
	private updateRowSelection() {
		this.renderer.updateSelection(this.selectedRows);
	}

	private updateSortIndicators() {
		this.renderer.updateSortIndicators(
			this.currentSortField,
			this.currentSortOrder
		);
	}

	private loadMoreRows() {
		// Implement lazy loading logic here
		if (this.virtualScroll) {
			this.virtualScroll.loadNextBatch();
		}
	}

	private cleanup() {
		this.selectedRows.clear();
		this.editingCell = null;
		this.displayedRows = [];
	}

	/**
	 * Toggle between tree view and flat view
	 */
	public toggleTreeView() {
		this.isTreeView = !this.isTreeView;
		this.refreshDisplay();
	}

	/**
	 * Get currently selected tasks
	 */
	public getSelectedTasks(): Task[] {
		return this.allTasks.filter((task) => this.selectedRows.has(task.id));
	}

	/**
	 * Clear all selections
	 */
	public clearSelection() {
		this.selectedRows.clear();
		this.updateRowSelection();
	}

	/**
	 * Export table data
	 */
	public exportData(): any[] {
		return this.displayedRows.map((row) => {
			const data: any = {};
			row.cells.forEach((cell) => {
				data[cell.columnId] = cell.value;
			});
			return data;
		});
	}
}
