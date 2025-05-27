import { App, editorInfoField } from "obsidian";
import { EditorState, Transaction, Text } from "@codemirror/state";
import TaskProgressBarPlugin from "../index"; // Adjust path if needed
import { parseTaskLine } from "../utils/taskUtil"; // Adjust path if needed
import { taskStatusChangeAnnotation } from "./taskStatusSwitcher";

/**
 * Creates an editor extension that monitors task completion events.
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension
 */
export function monitorTaskCompletedExtension(
	app: App,
	plugin: TaskProgressBarPlugin
) {
	console.log("monitorTaskCompletedExtension");
	return EditorState.transactionFilter.of((tr) => {
		// Handle the transaction to check for task completions
		handleMonitorTaskCompletionTransaction(tr, app, plugin);
		// Always return the original transaction, as we are only monitoring
		return tr;
	});
}

/**
 * Handles transactions to detect when a task is marked as completed.
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 */
function handleMonitorTaskCompletionTransaction(
	tr: Transaction,
	app: App,
	plugin: TaskProgressBarPlugin
) {
	// Only process transactions that change the document
	if (!tr.docChanged) {
		return;
	}

	// Skip if this transaction was triggered by auto date management
	const annotationValue = tr.annotation(taskStatusChangeAnnotation);
	if (
		typeof annotationValue === "string" &&
		annotationValue.includes("autoDateManager")
	) {
		return;
	}

	if (tr.isUserEvent("set") && tr.changes.length > 1) {
		return tr;
	}

	if (tr.isUserEvent("input.paste")) {
		return tr;
	}

	// Regex to identify a completed task line
	const completedTaskRegex = /^[\s|\t]*([-*+]|\d+\.)\s+\[[xX]\]/;
	// Regex to identify any task line (to check the previous state)
	const anyTaskRegex = /^[\s|\t]*([-*+]|\d+\.)\s+\[.\]/;

	tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
		// Determine the range of lines affected by the change in the new document state
		const affectedLinesStart = tr.newDoc.lineAt(fromB).number;
		// Check the line where the change ends, in case the change spans lines or adds new lines
		const affectedLinesEnd = tr.newDoc.lineAt(toB).number;

		// Iterate through each line potentially affected by this change
		for (let i = affectedLinesStart; i <= affectedLinesEnd; i++) {
			// Ensure the line number is valid in the new document
			if (i > tr.newDoc.lines) continue;

			const newLine = tr.newDoc.line(i);
			const newLineText = newLine.text;

			// Check if the line in the new state represents a completed task
			if (completedTaskRegex.test(newLineText)) {
				let originalLineText = "";
				let wasTaskBefore = false;

				try {
					// Map the beginning of the current line in the new doc back to the original doc
					// Use -1 bias to prefer mapping to the state *before* the character was inserted
					const originalPos = tr.changes.mapPos(newLine.from, -1);

					if (originalPos !== null) {
						const originalLine =
							tr.startState.doc.lineAt(originalPos);
						originalLineText = originalLine.text;
						// Check if the original line was a task (of any status)
						wasTaskBefore = anyTaskRegex.test(originalLineText);
					} else {
						// If mapping fails (e.g., line is newly inserted),
						// we can't know the previous state for sure based on line content.
						// However, if the inserted text itself forms a completed task, we might log it.
						// For now, we only log if we can confirm it *wasn't* completed before.
					}
				} catch (e) {
					// Ignore errors if the line didn't exist or changed drastically
					// console.warn("Could not get original line state for completion check:", e);
				}

				// Log completion only if the line is now complete, was a task before,
				// and was NOT already complete in the previous state.
				if (
					wasTaskBefore &&
					!completedTaskRegex.test(originalLineText)
				) {
					const editorInfo = tr.startState.field(editorInfoField);
					const filePath = editorInfo?.file?.path || "unknown file";

					// Parse the task details using the utility function
					const task = parseTaskLine(
						filePath,
						newLineText,
						newLine.number, // line numbers are 1-based
						plugin.settings.preferMetadataFormat // Use plugin setting for format preference
					);
					console.log(task);

					// Optionally, trigger a custom event that other parts of the plugin or Obsidian could listen to
					if (task) {
						console.log("trigger task-completed event");
						app.workspace.trigger(
							"task-genius:task-completed",
							task
						);
					}

					// Optimization: If we've confirmed completion for this line,
					// no need to re-check it due to other changes within the same transaction.
					// We break the inner loop (over lines) and continue to the next change set (iterChanges).
					// Note: This assumes one completion per line per transaction is sufficient to log.
					break;
				}
			}
		}
	});
}
