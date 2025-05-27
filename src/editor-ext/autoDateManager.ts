import { App, Editor } from "obsidian";
import {
	EditorState,
	Text,
	Transaction,
	TransactionSpec,
} from "@codemirror/state";
import TaskProgressBarPlugin from "../index";
import { taskStatusChangeAnnotation } from "./taskStatusSwitcher";
import {
	DV_COMPLETED_DATE_REGEX,
	EMOJI_COMPLETED_DATE_REGEX,
	DV_START_DATE_REGEX,
	EMOJI_START_DATE_REGEX,
} from "../common/regex-define";

/**
 * Creates an editor extension that automatically manages dates based on task status changes
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function autoDateManagerExtension(
	app: App,
	plugin: TaskProgressBarPlugin
) {
	return EditorState.transactionFilter.of((tr) => {
		return handleAutoDateManagerTransaction(tr, app, plugin);
	});
}

/**
 * Handles transactions to detect task status changes and manage dates accordingly
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns The original transaction or a modified transaction
 */
function handleAutoDateManagerTransaction(
	tr: Transaction,
	app: App,
	plugin: TaskProgressBarPlugin
): TransactionSpec {
	// Only process transactions that change the document
	if (!tr.docChanged) {
		return tr;
	}

	// Skip if auto date management is disabled
	if (!plugin.settings.autoDateManager?.enabled) {
		return tr;
	}

	// Skip if this transaction was triggered by auto date management itself
	const annotationValue = tr.annotation(taskStatusChangeAnnotation);
	if (
		typeof annotationValue === "string" &&
		annotationValue.includes("autoDateManager")
	) {
		return tr;
	}

	// Skip if this is a paste operation or other bulk operations
	if (tr.isUserEvent("input.paste") || tr.isUserEvent("set")) {
		return tr;
	}

	// Check if a task status was changed in this transaction
	const taskStatusChangeInfo = findTaskStatusChange(tr);

	if (!taskStatusChangeInfo) {
		return tr;
	}

	const { doc, lineNumber, oldStatus, newStatus } = taskStatusChangeInfo;

	// Determine what date operations need to be performed
	const dateOperations = determineDateOperations(
		oldStatus,
		newStatus,
		plugin
	);

	if (dateOperations.length === 0) {
		return tr;
	}

	// Apply date operations to the task line
	return applyDateOperations(tr, doc, lineNumber, dateOperations, plugin);
}

/**
 * Finds any task status change in the transaction
 * @param tr The transaction to check
 * @returns Information about the task with changed status or null if no task status was changed
 */
function findTaskStatusChange(tr: Transaction): {
	doc: Text;
	lineNumber: number;
	oldStatus: string;
	newStatus: string;
} | null {
	let taskChangedInfo: {
		doc: Text;
		lineNumber: number;
		oldStatus: string;
		newStatus: string;
	} | null = null;

	// Check each change in the transaction
	tr.changes.iterChanges(
		(
			fromA: number,
			toA: number,
			fromB: number,
			toB: number,
			inserted: Text
		) => {
			// Get the position context
			const pos = fromB;
			const newLine = tr.newDoc.lineAt(pos);
			const newLineText = newLine.text;

			// Check if this line contains a task marker
			const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s\[(.)]/i;
			const newTaskMatch = newLineText.match(taskRegex);

			if (newTaskMatch) {
				// Get the old line if it exists in the old document
				let oldLine = null;
				let oldStatus = " ";
				try {
					const oldPos = fromA;
					if (oldPos >= 0 && oldPos < tr.startState.doc.length) {
						oldLine = tr.startState.doc.lineAt(oldPos);
						const oldTaskMatch = oldLine.text.match(taskRegex);
						if (oldTaskMatch) {
							oldStatus = oldTaskMatch[2];
						}
					}
				} catch (e) {
					// Line might not exist in old document
				}

				const newStatus = newTaskMatch[2];

				// Only process if the status actually changed
				if (oldStatus !== newStatus) {
					taskChangedInfo = {
						doc: tr.newDoc,
						lineNumber: newLine.number,
						oldStatus: oldStatus,
						newStatus: newStatus,
					};
				}
			}
		}
	);

	return taskChangedInfo;
}

/**
 * Determines what date operations need to be performed based on status change
 * @param oldStatus The old task status
 * @param newStatus The new task status
 * @param plugin The plugin instance
 * @returns Array of date operations to perform
 */
function determineDateOperations(
	oldStatus: string,
	newStatus: string,
	plugin: TaskProgressBarPlugin
): DateOperation[] {
	const operations: DateOperation[] = [];
	const settings = plugin.settings.autoDateManager;

	if (!settings) return operations;

	const oldStatusType = getStatusType(oldStatus, plugin);
	const newStatusType = getStatusType(newStatus, plugin);

	// If status types are the same, no date operations needed
	if (oldStatusType === newStatusType) {
		return operations;
	}

	// Remove old status date if it exists and is managed
	if (settings.manageCompletedDate && oldStatusType === "completed") {
		operations.push({
			type: "remove",
			dateType: "completed",
		});
	}
	if (settings.manageStartDate && oldStatusType === "inProgress") {
		operations.push({
			type: "remove",
			dateType: "start",
		});
	}
	if (settings.manageCancelledDate && oldStatusType === "abandoned") {
		operations.push({
			type: "remove",
			dateType: "cancelled",
		});
	}

	// Add new status date if it should be managed
	if (settings.manageCompletedDate && newStatusType === "completed") {
		operations.push({
			type: "add",
			dateType: "completed",
			format: settings.completedDateFormat || "YYYY-MM-DD",
		});
	}
	if (settings.manageStartDate && newStatusType === "inProgress") {
		operations.push({
			type: "add",
			dateType: "start",
			format: settings.startDateFormat || "YYYY-MM-DD",
		});
	}
	if (settings.manageCancelledDate && newStatusType === "abandoned") {
		operations.push({
			type: "add",
			dateType: "cancelled",
			format: settings.cancelledDateFormat || "YYYY-MM-DD",
		});
	}

	return operations;
}

/**
 * Gets the status type (completed, inProgress, etc.) for a given status character
 * @param status The status character
 * @param plugin The plugin instance
 * @returns The status type
 */
function getStatusType(status: string, plugin: TaskProgressBarPlugin): string {
	const taskStatuses = plugin.settings.taskStatuses;

	if (taskStatuses.completed.split("|").includes(status)) {
		return "completed";
	}
	if (taskStatuses.inProgress.split("|").includes(status)) {
		return "inProgress";
	}
	if (taskStatuses.abandoned.split("|").includes(status)) {
		return "abandoned";
	}
	if (taskStatuses.planned.split("|").includes(status)) {
		return "planned";
	}
	if (taskStatuses.notStarted.split("|").includes(status)) {
		return "notStarted";
	}

	return "unknown";
}

/**
 * Applies date operations to the task line
 * @param tr The transaction
 * @param doc The document
 * @param lineNumber The line number of the task
 * @param operations The date operations to perform
 * @param plugin The plugin instance
 * @returns The modified transaction
 */
function applyDateOperations(
	tr: Transaction,
	doc: Text,
	lineNumber: number,
	operations: DateOperation[],
	plugin: TaskProgressBarPlugin
): TransactionSpec {
	const line = doc.line(lineNumber);
	let lineText = line.text;
	const changes = [];

	for (const operation of operations) {
		if (operation.type === "add") {
			// Add a new date
			const dateString = formatDate(operation.format!);
			const dateMarker = getDateMarker(operation.dateType, plugin);
			const useDataviewFormat =
				plugin.settings.preferMetadataFormat === "dataview";

			let dateText: string;
			if (useDataviewFormat) {
				dateText = ` ${dateMarker}${dateString}]`;
			} else {
				dateText = ` ${dateMarker} ${dateString}`;
			}

			// Find the end of the task content (before any existing dates)
			const insertPosition = findDateInsertPosition(lineText, plugin);
			const absolutePosition = line.from + insertPosition;

			changes.push({
				from: absolutePosition,
				to: absolutePosition,
				insert: dateText,
			});

			// Update lineText for subsequent operations
			lineText =
				lineText.slice(0, insertPosition) +
				dateText +
				lineText.slice(insertPosition);
		} else if (operation.type === "remove") {
			// Remove existing date
			const useDataviewFormat =
				plugin.settings.preferMetadataFormat === "dataview";
			let datePattern: RegExp;

			if (useDataviewFormat) {
				// For dataview format: [completion::2024-01-01] or [start::2024-01-01]
				const fieldName =
					operation.dateType === "completed"
						? "completion"
						: operation.dateType === "start"
						? "start"
						: operation.dateType === "cancelled"
						? "cancelled"
						: "unknown";
				datePattern = new RegExp(
					`\\s*\\[${fieldName}::\\s*\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2}(?::\\d{2})?)?\\]`,
					"g"
				);
			} else {
				// For emoji format: ✅ 2024-01-01 or 🚀 2024-01-01
				const dateMarker = getDateMarker(operation.dateType, plugin);
				datePattern = new RegExp(
					`\\s*${escapeRegex(
						dateMarker
					)}\\s*\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2}(?::\\d{2})?)?`,
					"g"
				);
			}

			// Find all matches and remove them (there might be multiple instances)
			let match;
			const matchesToRemove = [];
			datePattern.lastIndex = 0; // Reset regex state

			while ((match = datePattern.exec(lineText)) !== null) {
				matchesToRemove.push({
					start: match.index,
					end: match.index + match[0].length,
					text: match[0],
				});
			}

			// Process matches in reverse order to maintain correct positions
			for (let i = matchesToRemove.length - 1; i >= 0; i--) {
				const matchToRemove = matchesToRemove[i];
				const absoluteFrom = line.from + matchToRemove.start;
				const absoluteTo = line.from + matchToRemove.end;

				changes.push({
					from: absoluteFrom,
					to: absoluteTo,
					insert: "",
				});

				// Update lineText for subsequent operations
				lineText =
					lineText.slice(0, matchToRemove.start) +
					lineText.slice(matchToRemove.end);
			}
		}
	}

	if (changes.length > 0) {
		return {
			changes: [tr.changes, ...changes],
			selection: tr.selection,
			annotations: [
				taskStatusChangeAnnotation.of("autoDateManager.dateUpdate"),
			],
		};
	}

	return tr;
}

/**
 * Formats a date according to the specified format
 * @param format The date format string
 * @returns The formatted date string
 */
function formatDate(format: string): string {
	const now = new Date();

	// Simple date formatting - you might want to use a more robust library
	return format
		.replace("YYYY", now.getFullYear().toString())
		.replace("MM", (now.getMonth() + 1).toString().padStart(2, "0"))
		.replace("DD", now.getDate().toString().padStart(2, "0"))
		.replace("HH", now.getHours().toString().padStart(2, "0"))
		.replace("mm", now.getMinutes().toString().padStart(2, "0"))
		.replace("ss", now.getSeconds().toString().padStart(2, "0"));
}

/**
 * Gets the date marker for a specific date type based on metadata format
 * @param dateType The type of date (completed, start, cancelled)
 * @param plugin The plugin instance
 * @returns The date marker string
 */
function getDateMarker(
	dateType: string,
	plugin: TaskProgressBarPlugin
): string {
	const settings = plugin.settings.autoDateManager;
	const useDataviewFormat =
		plugin.settings.preferMetadataFormat === "dataview";

	if (!settings) return "📅";

	switch (dateType) {
		case "completed":
			if (useDataviewFormat) {
				return "[completion::";
			}
			return settings.completedDateMarker || "✅";
		case "start":
			if (useDataviewFormat) {
				return "[start::";
			}
			return settings.startDateMarker || "🚀";
		case "cancelled":
			if (useDataviewFormat) {
				return "[cancelled::";
			}
			return settings.cancelledDateMarker || "❌";
		default:
			return "📅";
	}
}

/**
 * Finds the position where a new date should be inserted
 * @param lineText The task line text
 * @param plugin The plugin instance
 * @returns The position index where the date should be inserted
 */
function findDateInsertPosition(
	lineText: string,
	plugin: TaskProgressBarPlugin
): number {
	// Find the end of the task content, before any existing dates or metadata
	const taskMatch = lineText.match(/^[\s|\t]*([-*+]|\d+\.)\s\[.\]\s*/);
	if (!taskMatch) return lineText.length;

	let position = taskMatch[0].length;

	const useDataviewFormat =
		plugin.settings.preferMetadataFormat === "dataview";

	if (useDataviewFormat) {
		// For dataview format, find the main task content before any dataview fields, tags, or metadata
		const contentMatch = lineText
			.slice(position)
			.match(/^[^\[#@]*(?=\s*[\[#@]|$)/);
		if (contentMatch) {
			position += contentMatch[0].trimEnd().length;
		}
	} else {
		// For emoji format, find the main task content before any emoji dates, tags, or metadata
		const contentMatch = lineText
			.slice(position)
			.match(/^[^📅🚀✅❌#@\[]*(?=\s*[📅🚀✅❌#@\[]|$)/);
		if (contentMatch) {
			position += contentMatch[0].trimEnd().length;
		}
	}

	return position;
}

/**
 * Escapes special regex characters
 * @param string The string to escape
 * @returns The escaped string
 */
function escapeRegex(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Interface for date operations
 */
interface DateOperation {
	type: "add" | "remove";
	dateType: "completed" | "start" | "cancelled";
	format?: string;
}

export {
	handleAutoDateManagerTransaction,
	findTaskStatusChange,
	determineDateOperations,
	getStatusType,
	applyDateOperations,
};
