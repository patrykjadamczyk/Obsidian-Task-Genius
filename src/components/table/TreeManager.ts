import { Component } from "obsidian";
import { Task } from "../../types/task";
import { TreeNode, TableRow, TableCell } from "./TableTypes";

/**
 * Tree manager component responsible for handling hierarchical task display
 */
export class TreeManager extends Component {
	private expandedNodes: Set<string> = new Set();
	private treeNodes: Map<string, TreeNode> = new Map();

	onload() {
		// Initialize tree manager
	}

	onunload() {
		this.cleanup();
	}

	/**
	 * Build tree structure from flat task list
	 */
	public buildTreeRows(tasks: Task[]): TableRow[] {
		// First, build the tree structure
		const rootNodes = this.buildTreeStructure(tasks);

		// Then, flatten it into table rows with proper hierarchy
		const rows: TableRow[] = [];
		this.flattenTreeNodes(rootNodes, rows, 0);

		return rows;
	}

	/**
	 * Build tree structure from tasks
	 */
	private buildTreeStructure(tasks: Task[]): TreeNode[] {
		this.treeNodes.clear();
		const taskMap = new Map<string, Task>();
		const rootNodes: TreeNode[] = [];

		// Create task map for quick lookup
		tasks.forEach((task) => {
			taskMap.set(task.id, task);
		});

		// Create tree nodes
		tasks.forEach((task) => {
			const node: TreeNode = {
				task,
				children: [],
				level: 0,
				expanded: this.expandedNodes.has(task.id),
			};
			this.treeNodes.set(task.id, node);
		});

		// Build parent-child relationships
		tasks.forEach((task) => {
			const node = this.treeNodes.get(task.id);
			if (!node) return;

			if (task.parent && this.treeNodes.has(task.parent)) {
				// This task has a parent
				const parentNode = this.treeNodes.get(task.parent);
				if (parentNode) {
					parentNode.children.push(node);
					node.parent = parentNode;
				}
			} else {
				// This is a root node
				rootNodes.push(node);
			}
		});

		// Calculate levels
		this.calculateLevels(rootNodes, 0);

		// Sort children by some criteria (e.g., creation order, priority)
		this.sortTreeNodes(rootNodes);

		return rootNodes;
	}

	/**
	 * Calculate levels for tree nodes
	 */
	private calculateLevels(nodes: TreeNode[], level: number) {
		nodes.forEach((node) => {
			node.level = level;
			if (node.children.length > 0) {
				this.calculateLevels(node.children, level + 1);
			}
		});
	}

	/**
	 * Sort tree nodes recursively
	 */
	private sortTreeNodes(nodes: TreeNode[]) {
		// Sort by priority first, then by creation date
		nodes.sort((a, b) => {
			// Priority comparison (higher priority first)
			const aPriority = a.task.priority || 999;
			const bPriority = b.task.priority || 999;
			if (aPriority !== bPriority) {
				return aPriority - bPriority;
			}

			// Creation date comparison (newer first)
			const aCreated = a.task.createdDate || 0;
			const bCreated = b.task.createdDate || 0;
			return bCreated - aCreated;
		});

		// Recursively sort children
		nodes.forEach((node) => {
			if (node.children.length > 0) {
				this.sortTreeNodes(node.children);
			}
		});
	}

	/**
	 * Flatten tree nodes into table rows
	 */
	private flattenTreeNodes(
		nodes: TreeNode[],
		rows: TableRow[],
		level: number
	) {
		nodes.forEach((node) => {
			// Create table row for this node
			const row: TableRow = {
				id: node.task.id,
				task: node.task,
				level: node.level,
				expanded: node.expanded,
				hasChildren: node.children.length > 0,
				cells: this.createCellsForNode(node, rows.length + 1),
			};

			rows.push(row);

			// If node is expanded and has children, add children recursively
			if (node.expanded && node.children.length > 0) {
				this.flattenTreeNodes(node.children, rows, level + 1);
			}
		});
	}

	/**
	 * Create table cells for a tree node
	 */
	private createCellsForNode(node: TreeNode, rowNumber: number): TableCell[] {
		const task = node.task;

		// This is a simplified version - in practice, you'd want to use
		// the same cell creation logic as the main table component
		return [
			{
				columnId: "rowNumber",
				value: rowNumber,
				displayValue: rowNumber.toString(),
				editable: false,
			},
			{
				columnId: "status",
				value: task.status,
				displayValue: this.formatStatus(task.status),
				editable: true,
			},
			{
				columnId: "content",
				value: task.content,
				displayValue: task.content,
				editable: true,
			},
			{
				columnId: "priority",
				value: task.priority,
				displayValue: this.formatPriority(task.priority),
				editable: true,
			},
			{
				columnId: "dueDate",
				value: task.dueDate,
				displayValue: this.formatDate(task.dueDate),
				editable: true,
			},
			{
				columnId: "tags",
				value: task.tags,
				displayValue: task.tags?.join(", ") || "",
				editable: true,
			},
			{
				columnId: "project",
				value: task.project,
				displayValue: task.project || "",
				editable: true,
			},
		];
	}

	/**
	 * Toggle node expansion
	 */
	public toggleNodeExpansion(taskId: string): boolean {
		const node = this.treeNodes.get(taskId);
		if (!node || node.children.length === 0) {
			return false;
		}

		node.expanded = !node.expanded;

		if (node.expanded) {
			this.expandedNodes.add(taskId);
		} else {
			this.expandedNodes.delete(taskId);
		}

		return true;
	}

	/**
	 * Expand all nodes
	 */
	public expandAll() {
		this.treeNodes.forEach((node, taskId) => {
			if (node.children.length > 0) {
				node.expanded = true;
				this.expandedNodes.add(taskId);
			}
		});
	}

	/**
	 * Collapse all nodes
	 */
	public collapseAll() {
		this.treeNodes.forEach((node, taskId) => {
			node.expanded = false;
			this.expandedNodes.delete(taskId);
		});
	}

	/**
	 * Get expanded state of a node
	 */
	public isNodeExpanded(taskId: string): boolean {
		return this.expandedNodes.has(taskId);
	}

	/**
	 * Get all descendant task IDs for a given task
	 */
	public getDescendantIds(taskId: string): string[] {
		const node = this.treeNodes.get(taskId);
		if (!node) return [];

		const descendants: string[] = [];
		this.collectDescendantIds(node, descendants);
		return descendants;
	}

	/**
	 * Recursively collect descendant IDs
	 */
	private collectDescendantIds(node: TreeNode, descendants: string[]) {
		node.children.forEach((child) => {
			descendants.push(child.task.id);
			this.collectDescendantIds(child, descendants);
		});
	}

	/**
	 * Get parent task ID for a given task
	 */
	public getParentId(taskId: string): string | null {
		const node = this.treeNodes.get(taskId);
		return node?.parent?.task.id || null;
	}

	/**
	 * Get all sibling task IDs for a given task
	 */
	public getSiblingIds(taskId: string): string[] {
		const node = this.treeNodes.get(taskId);
		if (!node) return [];

		const siblings = node.parent ? node.parent.children : [];
		return siblings
			.filter((sibling) => sibling.task.id !== taskId)
			.map((sibling) => sibling.task.id);
	}

	/**
	 * Check if a task can be moved to a new parent
	 */
	public canMoveTask(taskId: string, newParentId: string | null): boolean {
		// Can't move to itself
		if (taskId === newParentId) return false;

		// Can't move to one of its descendants
		if (
			newParentId &&
			this.getDescendantIds(taskId).includes(newParentId)
		) {
			return false;
		}

		return true;
	}

	/**
	 * Move a task to a new parent
	 */
	public moveTask(taskId: string, newParentId: string | null): boolean {
		if (!this.canMoveTask(taskId, newParentId)) {
			return false;
		}

		const node = this.treeNodes.get(taskId);
		if (!node) return false;

		// Remove from current parent
		if (node.parent) {
			const index = node.parent.children.indexOf(node);
			if (index > -1) {
				node.parent.children.splice(index, 1);
			}
		}

		// Add to new parent
		if (newParentId) {
			const newParent = this.treeNodes.get(newParentId);
			if (newParent) {
				newParent.children.push(node);
				node.parent = newParent;
			}
		} else {
			node.parent = undefined;
		}

		// Update task's parent property
		node.task.parent = newParentId || undefined;

		return true;
	}

	// Formatting methods (simplified versions)
	private formatStatus(status: string): string {
		const statusMap: Record<string, string> = {
			" ": "Not Started",
			x: "Completed",
			X: "Completed",
			"/": "In Progress",
			">": "In Progress",
			"-": "Abandoned",
			"?": "Planned",
		};
		return statusMap[status] || status;
	}

	private formatPriority(priority?: number): string {
		if (!priority) return "";
		const priorityMap: Record<number, string> = {
			1: "High",
			2: "Medium",
			3: "Low",
		};
		return priorityMap[priority] || priority.toString();
	}

	private formatDate(timestamp?: number): string {
		if (!timestamp) return "";
		return new Date(timestamp).toLocaleDateString();
	}

	/**
	 * Clean up resources
	 */
	private cleanup() {
		this.expandedNodes.clear();
		this.treeNodes.clear();
	}
}
