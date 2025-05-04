import { ChangeSpec } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Task as IndexerTask } from "../utils/types/TaskIndex"; // Import Task type from worker definitions
import { parseLocalDate } from "../utils/dateUtil";
import {
	TASK_REGEX,
	EMOJI_PRIORITY_REGEX,
	EMOJI_DUE_DATE_REGEX,
	DV_PRIORITY_REGEX,
	DV_DUE_DATE_REGEX,
} from "../common/regex-define";
import { PRIORITY_MAP } from "../common/default-symbol";
import TaskProgressBarPlugin from ".."; // Import the plugin class
import { TaskProgressBarSettings } from "../common/setting-definition"; // Import settings type
import { TFile, App, MetadataCache, Notice } from "obsidian"; // Added Notice

// Task statuses (aligned with common usage and sorting needs)
enum SortableTaskStatus {
	Overdue = "overdue", // Calculated, not a raw status
	DueSoon = "due_soon", // Calculated, not a raw status - Placeholder
	InProgress = "/",
	Incomplete = " ",
	Forwarded = ">",
	Question = "?",
	// Add other non-completed, non-cancelled statuses here
	Completed = "x",
	Cancelled = "-",
	// Add other terminal statuses here
}

// Interface for tasks used within the sorting command, closely matching IndexerTask
// We add calculated fields needed for sorting
interface SortableTask extends Omit<IndexerTask, "id" | "children" | "parent"> {
	id: string; // Keep ID for potential mapping/diffing
	lineNumber: number; // Original line number (0-based)
	indentation: number; // Calculated indentation level
	children: SortableTask[]; // Children of the same type
	parent?: SortableTask; // Parent reference
	calculatedStatus: SortableTaskStatus | string; // Status used for sorting (can include 'overdue')
	// Inherited from IndexerTask:
	originalMarkdown: string;
	status: string;
	completed: boolean;
	content: string;
	priority?: number;
	dueDate?: number;
	startDate?: number;
	scheduledDate?: number;
	// Add other inherited fields if needed by sorting or parsing
}

// Sorting criteria
export interface SortCriterion {
	field:
		| "status"
		| "priority"
		| "dueDate"
		| "startDate"
		| "scheduledDate"
		| "content"; // Fields to sort by
	order: "asc" | "desc"; // Sort order
}

// Simple function to get indentation (tabs or spaces)
function getIndentationLevel(line: string): number {
	const match = line.match(/^(\s*)/);
	if (!match) return 0;
	// Simple approach: count characters. Could refine to handle tabs vs spaces if necessary.
	return match[1].length;
}

// Modified: Parses tasks from a text block with a line offset
function parseTasksForSorting(
	blockText: string,
	lineOffset: number = 0
): SortableTask[] {
	const lines = blockText.split("\n");
	const tasks: SortableTask[] = [];
	const taskMap: { [lineNumber: number]: SortableTask } = {};
	let currentParentStack: SortableTask[] = [];

	lines.forEach((line, index) => {
		const match = line.match(TASK_REGEX);
		if (match) {
			const indentationStr = match[1];
			const status = match[3];
			let contentWithMetadata = match[4];
			const lineNumber = lineOffset + index; // Calculate absolute line number

			const indentation = getIndentationLevel(line);

			const newTask: Partial<SortableTask> = {
				id: `line-${lineNumber}`,
				lineNumber: lineNumber,
				originalMarkdown: line, // Store original line from the block
				status: status,
				completed: status.toLowerCase() === "x",
				indentation: indentation,
				children: [],
			};

			// --- Metadata Extraction (Simplified) ---
			let remainingContent = contentWithMetadata;
			let priorityValue: number | undefined = undefined;
			let priorityMatch = remainingContent.match(DV_PRIORITY_REGEX);
			if (priorityMatch?.[1]) {
				const prioStr = priorityMatch[1].trim().toLowerCase();
				priorityValue = PRIORITY_MAP[prioStr] ?? parseInt(prioStr, 10);
				if (!isNaN(priorityValue)) {
					remainingContent = remainingContent.replace(
						priorityMatch[0],
						""
					);
				} else {
					priorityValue = undefined;
				}
			}
			if (priorityValue === undefined) {
				priorityMatch = remainingContent.match(EMOJI_PRIORITY_REGEX);
				if (priorityMatch?.[1]) {
					priorityValue = PRIORITY_MAP[priorityMatch[1]];
					if (priorityValue !== undefined) {
						remainingContent = remainingContent.replace(
							priorityMatch[0],
							""
						);
					}
				}
			}
			newTask.priority = priorityValue;

			let dueDateTimestamp: number | undefined = undefined;
			let dateMatch = remainingContent.match(DV_DUE_DATE_REGEX);
			if (dateMatch?.[1]) {
				dueDateTimestamp = parseLocalDate(dateMatch[1]);
				if (dueDateTimestamp !== undefined) {
					remainingContent = remainingContent.replace(
						dateMatch[0],
						""
					);
				}
			}
			if (dueDateTimestamp === undefined) {
				dateMatch = remainingContent.match(EMOJI_DUE_DATE_REGEX);
				if (dateMatch?.[1]) {
					dueDateTimestamp = parseLocalDate(dateMatch[1]);
					if (dueDateTimestamp !== undefined) {
						remainingContent = remainingContent.replace(
							dateMatch[0],
							""
						);
					}
				}
			}
			newTask.dueDate = dueDateTimestamp;

			// --- Calculated Status ---
			let calculatedStatus: SortableTaskStatus | string = status;
			const now = new Date();
			now.setHours(0, 0, 0, 0);
			const todayTimestamp = now.getTime();

			if (
				!newTask.completed &&
				status !== SortableTaskStatus.Cancelled && // Use enum value
				newTask.dueDate &&
				newTask.dueDate < todayTimestamp
			) {
				calculatedStatus = SortableTaskStatus.Overdue; // Use enum value
			} else {
				calculatedStatus = Object.values(SortableTaskStatus).includes(
					status as SortableTaskStatus
				)
					? (status as SortableTaskStatus)
					: status;
			}
			newTask.calculatedStatus = calculatedStatus;

			newTask.content = remainingContent.replace(/\s{2,}/g, " ").trim();

			// --- Build Hierarchy (relative to the parsed block) ---
			const completeTask = newTask as SortableTask;
			taskMap[lineNumber] = completeTask; // Use absolute line number for mapping

			while (
				currentParentStack.length > 0 &&
				indentation <=
					currentParentStack[currentParentStack.length - 1]
						.indentation
			) {
				currentParentStack.pop();
			}

			if (currentParentStack.length > 0) {
				const parent =
					currentParentStack[currentParentStack.length - 1];
				parent.children.push(completeTask);
				completeTask.parent = parent;
			} else {
				tasks.push(completeTask); // Top-level task within the block
			}

			currentParentStack.push(completeTask);
		} else {
			// Non-task line in the block
			// currentParentStack = []; // Resetting might be too aggressive here
		}
	});

	return tasks; // Return top-level tasks found within the block
}

// --- 3. Sorting Logic ---

// Generates the status order map based on plugin settings
function getDynamicStatusOrder(settings: TaskProgressBarSettings): {
	[key: string]: number;
} {
	const order: { [key: string]: number } = {};
	let currentOrder = 1;

	// --- High Priority Statuses ---
	// Always put Overdue first
	order[SortableTaskStatus.Overdue] = currentOrder++;
	// Optionally add DueSoon if defined and needed
	// order[SortableTaskStatus.DueSoon] = currentOrder++;

	// --- Statuses from Cycle ---
	const cycle = settings.taskStatusCycle || [];
	const marks = settings.taskStatusMarks || {};
	const exclude = settings.excludeMarksFromCycle || [];
	const completedMarkers = (settings.taskStatuses?.completed || "x|X").split(
		"|"
	);
	const cancelledMarkers = (settings.taskStatuses?.abandoned || "-").split(
		"|"
	); // Example: Use abandoned as cancelled

	const includedInCycle: string[] = [];
	const completedInCycle: string[] = [];
	const cancelledInCycle: string[] = [];

	// Iterate through the defined cycle
	for (const statusName of cycle) {
		const mark = marks[statusName];
		if (mark && !exclude.includes(statusName)) {
			// Check if this status is considered completed or cancelled
			if (completedMarkers.includes(mark)) {
				completedInCycle.push(mark);
			} else if (cancelledMarkers.includes(mark)) {
				cancelledInCycle.push(mark);
			} else {
				// Add other statuses in their cycle order
				if (!(mark in order)) {
					// Avoid overwriting Overdue/DueSoon if their marks somehow appear
					order[mark] = currentOrder++;
				}
				includedInCycle.push(mark);
			}
		}
	}

	// --- Add Completed and Cancelled Statuses (from cycle) at the end ---
	// Place completed statuses towards the end
	completedInCycle.forEach((mark) => {
		if (!(mark in order)) {
			order[mark] = 98; // Assign a high number for sorting towards the end
		}
	});
	// Place cancelled statuses last
	cancelledInCycle.forEach((mark) => {
		if (!(mark in order)) {
			order[mark] = 99; // Assign the highest number
		}
	});

	// --- Fallback for statuses defined in settings but not in the cycle ---
	// (This part might be complex depending on desired behavior for statuses outside the cycle)
	// Example: Add all defined marks from settings.taskStatuses if they aren't already in the order map.
	for (const statusType in settings.taskStatuses) {
		const markers = (settings.taskStatuses[statusType] || "").split("|");
		markers.forEach((mark) => {
			if (mark && !(mark in order)) {
				// Decide where to put these: maybe group them?
				// Simple approach: put them after cycle statuses but before completed/cancelled defaults
				if (completedMarkers.includes(mark)) {
					order[mark] = 98;
				} else if (cancelledMarkers.includes(mark)) {
					order[mark] = 99;
				} else {
					order[mark] = currentOrder++; // Add after the main cycle items
				}
			}
		});
	}

	// Ensure default ' ' and 'x' have some order if not defined elsewhere
	if (!(" " in order)) order[" "] = order[" "] ?? 10; // Default incomplete reasonably high
	if (!("x" in order)) order["x"] = order["x"] ?? 98; // Default complete towards end

	console.debug("Generated Status Order:", order); // For debugging
	return order;
}

// Compares two tasks based on the given criteria AND plugin settings
function compareTasks(
	taskA: SortableTask,
	taskB: SortableTask,
	criteria: SortCriterion[],
	settings: TaskProgressBarSettings // Pass settings here
): number {
	// Generate status order dynamically for this comparison run
	const statusOrder = getDynamicStatusOrder(settings);

	for (const criterion of criteria) {
		let valA: any;
		let valB: any;
		let comparison = 0;

		switch (criterion.field) {
			case "status":
				valA = statusOrder[taskA.calculatedStatus] ?? 1000; // Unknown goes last
				valB = statusOrder[taskB.calculatedStatus] ?? 1000;
				comparison = valA - valB;
				break;
			case "priority":
				valA = taskA.priority ?? Infinity; // Tasks without priority go last
				valB = taskB.priority ?? Infinity;
				comparison = valA - valB;
				break;
			case "dueDate":
			case "startDate":
			case "scheduledDate":
				valA = taskA[criterion.field] ?? Infinity; // No date goes last
				valB = taskB[criterion.field] ?? Infinity;
				if (valA === Infinity && valB !== Infinity) comparison = 1;
				else if (valA !== Infinity && valB === Infinity)
					comparison = -1;
				else comparison = valA - valB;
				break;
			case "content":
				valA = taskA.content.toLowerCase();
				valB = taskB.content.toLowerCase();
				comparison = valA.localeCompare(valB);
				break;
		}

		if (comparison !== 0) {
			return criterion.order === "asc" ? comparison : -comparison;
		}
	}

	// Maintain original relative order if all criteria are equal
	return taskA.lineNumber - taskB.lineNumber;
}

// Recursively sorts a list of tasks and their children using settings
function sortTaskList(
	tasks: SortableTask[],
	criteria: SortCriterion[],
	settings: TaskProgressBarSettings // Pass settings here
): SortableTask[] {
	// Sort tasks at the current level
	tasks.sort((a, b) => compareTasks(a, b, criteria, settings)); // Pass settings

	// Recursively sort children
	tasks.forEach((task) => {
		if (task.children && task.children.length > 0) {
			// Pass settings down recursively
			sortTaskList(task.children, criteria, settings);
		}
	});

	return tasks; // Return the sorted list (though modification is in-place)
}

// --- 4. Generate Codemirror Changes (Modified) ---

// Flattens a task tree back into text lines using originalMarkdown
function flattenTasksToText(tasks: SortableTask[]): string {
	let lines: string[] = [];
	tasks.forEach((task) => {
		lines.push(task.originalMarkdown); // Preserves original formatting/indent
		if (task.children && task.children.length > 0) {
			lines.push(flattenTasksToText(task.children));
		}
	});
	return lines.join("\n");
}

// Main function: Parses, sorts, and generates Codemirror changes
export function sortTasksInDocument(
	view: EditorView,
	plugin: TaskProgressBarPlugin,
	sortCriteria: SortCriterion[],
	fullDocument: boolean = false // Keep parameter
): ChangeSpec[] | null {
	const app = plugin.app;
	const activeFile = app.workspace.getActiveFile(); // Assume command runs on active file
	if (!activeFile) {
		new Notice("Sort Tasks: No active file found.");
		return null;
	}
	const cache = app.metadataCache.getFileCache(activeFile);
	if (!cache) {
		new Notice("Sort Tasks: Metadata cache not available.");
		return null;
	}

	const doc = view.state.doc;
	const settings = plugin.settings;

	let startLine = 0;
	let endLine = doc.lines - 1;
	let scopeMessage = "full document"; // For logging

	if (!fullDocument) {
		const cursor = view.state.selection.main.head;
		const cursorLine = doc.lineAt(cursor).number - 1; // 0-based

		// Try to find scope based on cursor position (heading or document)
		const headings = cache.headings || [];
		let containingHeading = null;
		let nextHeadingLine = doc.lines; // Default to end of doc

		// Find the heading the cursor is currently in
		for (let i = headings.length - 1; i >= 0; i--) {
			if (headings[i].position.start.line <= cursorLine) {
				containingHeading = headings[i];
				startLine = containingHeading.position.start.line; // Start from heading line

				// Find the line number of the next heading at the same or lower level
				for (let j = i + 1; j < headings.length; j++) {
					if (headings[j].level <= containingHeading.level) {
						nextHeadingLine = headings[j].position.start.line;
						break;
					}
				}
				scopeMessage = `heading section "${containingHeading.heading}"`;
				break; // Found the containing heading
			}
		}

		// Set the endLine for the section
		if (containingHeading) {
			endLine = nextHeadingLine - 1; // End before the next heading
		} else {
			// Cursor is not under any heading, sort the whole document
			startLine = 0;
			endLine = doc.lines - 1;
			scopeMessage = "full document (cursor not in heading)";
		}

		// Ensure endLine is not less than startLine (e.g., empty heading section)
		if (endLine < startLine) {
			endLine = startLine;
		}
	} else {
		// fullDocument is true, range is already set (0 to doc.lines - 1)
		scopeMessage = "full document (forced)";
	}

	// Get the text content of the determined block
	const fromOffsetOriginal = doc.line(startLine + 1).from; // 1-based for doc.line
	const toOffsetOriginal = doc.line(endLine + 1).to;
	// Ensure offsets are valid
	if (fromOffsetOriginal > toOffsetOriginal) {
		console.log(
			`Sort Tasks: Invalid range calculated (startLine: ${startLine}, endLine: ${endLine}). Aborting.`
		);
		new Notice(`Sort Tasks: Invalid range calculated for ${scopeMessage}.`);
		return null;
	}
	const originalBlockText = doc.sliceString(
		fromOffsetOriginal,
		toOffsetOriginal
	);

	// 1. Parse tasks *only* within the determined block, providing the offset
	const blockTasks = parseTasksForSorting(originalBlockText, startLine);
	if (blockTasks.length === 0) {
		const noticeMsg = `Sort Tasks: No tasks found in the ${scopeMessage} (Lines ${
			startLine + 1
		}-${endLine + 1}) to sort.`;
		console.log(noticeMsg);
		new Notice(noticeMsg);
		return null;
	}
	console.log("blockTasks", blockTasks);

	// 2. Sort the tasks parsed from the block using plugin settings
	// sortTaskList modifies the array in-place and sorts children recursively
	const sortedBlockTasks = sortTaskList(
		[...blockTasks],
		sortCriteria,
		settings
	); // Pass settings, sort a copy

	// 3. Flatten the *sorted* task structure back to text lines
	// This text contains only the task lines, in their new sorted order,
	// maintaining original markdown (including indentation).
	const newSortedTasksOnlyText = flattenTasksToText(sortedBlockTasks);

	// 4. Reconstruct the block text, preserving non-task lines
	const originalBlockLines = originalBlockText.split("\n");
	const sortedTaskLines = newSortedTasksOnlyText.split("\n"); // Individual sorted task lines

	// Create a map from original document line number -> original task object
	// This helps identify which original lines were tasks.
	const originalTaskMap = new Map<number, SortableTask>();
	function populateOriginalTaskMap(tasks: SortableTask[]) {
		tasks.forEach((task) => {
			originalTaskMap.set(task.lineNumber, task);
			if (task.children) populateOriginalTaskMap(task.children);
		});
	}
	populateOriginalTaskMap(blockTasks); // Use tasks before sorting

	// Create a map from original document line number -> its *new* sorted line content
	// This maps where each original task line should end up in the sorted output.
	const sortedLineContentMap = new Map<number, string>();
	let sortedLineIdx = 0;
	function buildSortedLineContentMap(sortedTasks: SortableTask[]) {
		sortedTasks.forEach((task) => {
			if (sortedLineIdx < sortedTaskLines.length) {
				// Map the task's original line number to the corresponding line
				// from the flattened sorted text.
				sortedLineContentMap.set(
					task.lineNumber,
					sortedTaskLines[sortedLineIdx++]
				);
			}
			if (task.children) buildSortedLineContentMap(task.children);
		});
	}
	buildSortedLineContentMap(sortedBlockTasks); // Use the sorted task structure

	let newBlockLines: string[] = [];
	for (let i = 0; i < originalBlockLines.length; i++) {
		const currentOriginalDocLineNumber = startLine + i;
		// Check if the line number in the original block corresponded to a task
		if (originalTaskMap.has(currentOriginalDocLineNumber)) {
			// It was a task. Get its new content from the sorted map.
			const newContent = sortedLineContentMap.get(
				currentOriginalDocLineNumber
			);
			if (newContent !== undefined) {
				newBlockLines.push(newContent);
			} else {
				// This case indicates a mismatch between parsed tasks and sorted lines, potentially
				// due to issues in flattening or mapping complex hierarchies. Fallback safely.
				console.warn(
					`Sort Tasks: Missing sorted content for task at original line ${currentOriginalDocLineNumber}. Keeping original line.`
				);
				newBlockLines.push(originalBlockLines[i]); // Keep original if lookup fails
			}
		} else {
			// It was not a task line, keep the original line
			newBlockLines.push(originalBlockLines[i]);
		}
	}
	const newBlockText = newBlockLines.join("\n");

	// 5. Calculate changes only if the block text has actually changed
	if (originalBlockText === newBlockText) {
		const noticeMsg = `Sort Tasks: Tasks are already sorted in the ${scopeMessage} (Lines ${
			startLine + 1
		}-${endLine + 1}).`;
		console.log(noticeMsg);
		new Notice(noticeMsg);
		return null;
	}

	const changes: ChangeSpec = {
		from: fromOffsetOriginal,
		to: toOffsetOriginal,
		insert: newBlockText,
	};

	const noticeMsg = `Sort Tasks: Sorted tasks in the ${scopeMessage} (Lines ${
		startLine + 1
	}-${endLine + 1}).`;
	console.log(noticeMsg);
	new Notice(noticeMsg);
	return [changes];
}
