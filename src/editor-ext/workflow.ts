import { App, Editor, EditorPosition } from "obsidian";
import {
	EditorState,
	Transaction,
	TransactionSpec,
	StateEffect,
	Text,
} from "@codemirror/state";
import { Annotation } from "@codemirror/state";
import TaskProgressBarPlugin from "..";
import { taskStatusChangeAnnotation } from "./taskStatusSwitcher";
import { priorityChangeAnnotation } from "./priorityPicker";
import { getTabSize } from "../utils";
// @ts-ignore
import { foldable } from "@codemirror/language";

// Annotation that marks a transaction as a workflow change
export const workflowChangeAnnotation = Annotation.define<string>();

// Interface for workflow definition
export interface WorkflowStage {
	id: string;
	name: string;
	type: "linear" | "cycle" | "terminal";
	next?: string | string[];
	subStages?: Array<{
		id: string;
		name: string;
		next?: string;
	}>;
	canProceedTo?: string[];
}

export interface WorkflowDefinition {
	id: string;
	name: string;
	description: string;
	stages: WorkflowStage[];
	metadata?: {
		version: string;
		created: string;
		lastModified: string;
	};
}

// Define a simple TextRange interface to match the provided code
interface TextRange {
	from: number;
	to: number;
}

/**
 * Calculate the foldable range for a position
 * @param state The editor state
 * @param pos The position to calculate the range for
 * @returns The text range or null if no foldable range is found
 */
function calculateRangeForTransform(
	state: EditorState,
	pos: number
): TextRange | null {
	const line = state.doc.lineAt(pos);
	const foldRange = foldable(state, line.from, line.to);

	if (!foldRange) {
		return null;
	}

	return { from: line.from, to: foldRange.to };
}

/**
 * Creates an editor extension that handles task workflow stage updates
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function workflowExtension(app: App, plugin: TaskProgressBarPlugin) {
	return EditorState.transactionFilter.of((tr: Transaction) => {
		return handleWorkflowTransaction(tr, app, plugin);
	});
}

/**
 * Extract workflow tag from a line of text
 * @param lineText The line text to analyze
 * @returns An object containing workflow information or null if no workflow tag found
 */
export function extractWorkflowInfo(lineText: string): {
	workflowType: string;
	currentStage: string;
	subStage?: string;
} | null {
	// First check if this line has a stage marker [stage::id]
	const stageRegex = /\[stage::([^\]]+)\]/;
	const stageMatch = lineText.match(stageRegex);

	if (stageMatch) {
		const stageId = stageMatch[1];

		// Check if this is a substage ID (contains a dot or other separator)
		// In a real implementation, you might want to use a more specific pattern
		// based on how your substage IDs are formatted
		if (stageId.includes(".")) {
			const parts = stageId.split(".");
			return {
				workflowType: "fromParent", // Will be resolved later
				currentStage: parts[0],
				subStage: parts[1],
			};
		}

		return {
			workflowType: "fromParent", // Will be resolved later
			currentStage: stageId,
			subStage: undefined,
		};
	}

	// If no stage marker, check for workflow tag
	const workflowTagRegex = /#workflow\/([^\/\s]+)/;
	const match = lineText.match(workflowTagRegex);

	if (match) {
		return {
			workflowType: match[1],
			currentStage: "root",
			subStage: undefined,
		};
	}

	return null;
}

/**
 * Find the parent workflow for a task by looking up the document
 * @param doc The document text
 * @param lineNum The current line number
 * @returns The workflow type or null if not found
 */
function findParentWorkflow(doc: Text, lineNum: number): string | null {
	// Get the current line's indentation
	const currentLine = doc.line(lineNum);
	const currentIndentMatch = currentLine.text.match(/^([\s|\t]*)/);
	const currentIndent = currentIndentMatch ? currentIndentMatch[1].length : 0;

	// Look upward through the document
	for (let i = lineNum - 1; i >= 1; i--) {
		const line = doc.line(i);
		const lineText = line.text;

		// Check the indentation level
		const indentMatch = lineText.match(/^([\s|\t]*)/);
		const indent = indentMatch ? indentMatch[1].length : 0;

		// If this line has less indentation than our current line
		// and contains a workflow tag, it's a potential parent
		if (indent < currentIndent) {
			const workflowMatch = lineText.match(/#workflow\/([^\/\s]+)/);
			if (workflowMatch) {
				return workflowMatch[1];
			}
		}
	}

	return null;
}

/**
 * Handles transactions to detect task status changes to workflow-tagged tasks
 * @param tr The transaction to handle
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns The original transaction or a modified transaction
 */
export function handleWorkflowTransaction(
	tr: Transaction,
	app: App,
	plugin: TaskProgressBarPlugin
): TransactionSpec {
	// Only process if workflow feature is enabled
	if (!plugin.settings.workflow.enableWorkflow) {
		return tr;
	}

	// Only process transactions that change the document and are user input events
	if (!tr.docChanged) {
		return tr;
	}

	console.log(tr.annotation(taskStatusChangeAnnotation));

	// Skip if this transaction already has a workflow or task status annotation
	if (
		tr.annotation(workflowChangeAnnotation) ||
		tr.annotation(priorityChangeAnnotation)
	) {
		return tr;
	}

	// We want to detect when a task status changes to a completed status
	// Find all the changes in this transaction
	const changes: {
		fromA: number;
		toA: number;
		fromB: number;
		toB: number;
		text: string;
	}[] = [];

	tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
		changes.push({
			fromA,
			toA,
			fromB,
			toB,
			text: inserted.toString(),
		});
	});

	// Check if any completed tasks have workflow tags
	let workflowUpdates: {
		line: number;
		lineText: string;
		workflowType: string;
		currentStage: string;
		currentSubStage?: string;
	}[] = [];

	for (const change of changes) {
		// Check if this is a task status change to completed
		if (
			change.text === "x" ||
			change.text === "X" ||
			change.text === "- [x]" ||
			change.text === "- [X]"
		) {
			const line = tr.newDoc.lineAt(change.fromB);
			const lineText = line.text;

			// Check if this line contains a task
			const taskRegex = /^([\s|\t]*)([-*+]|\d+\.)\s+\[(.)]/;
			const taskMatch = lineText.match(taskRegex);

			if (taskMatch) {
				// Check if this task has a stage marker or is a workflow root
				const workflowInfo = extractWorkflowInfo(lineText);

				if (workflowInfo) {
					let workflowType = workflowInfo.workflowType;

					// If this is a stage marker, we need to find the parent workflow
					if (workflowType === "fromParent") {
						const parentWorkflow = findParentWorkflow(
							tr.newDoc,
							line.number
						);
						if (parentWorkflow) {
							workflowType = parentWorkflow;
						} else {
							// Couldn't find parent workflow, skip this task
							continue;
						}
					}

					// Find the workflow definition
					const workflow = plugin.settings.workflow.definitions.find(
						(wf: WorkflowDefinition) => wf.id === workflowType
					);

					if (!workflow) continue;

					// Find the current stage in the workflow
					let currentStage: WorkflowStage | undefined;
					let currentSubStage:
						| { id: string; name: string; next?: string }
						| undefined;

					if (workflowInfo.currentStage === "root") {
						// For root tasks, we should use a special marker to indicate
						// that we need to start at the very beginning of the workflow
						currentStage = {
							id: "_root_task_", // Special ID to mark root tasks
							name: "Root Task",
							type: "linear",
							next:
								workflow.stages.length > 0
									? workflow.stages[0].id
									: undefined,
						};
					} else {
						// For sub-tasks, use the stage specified by the stage marker
						currentStage = workflow.stages.find(
							(s: WorkflowStage) =>
								s.id === workflowInfo.currentStage
						);

						// If we have a substage, find it
						if (
							workflowInfo.subStage &&
							currentStage &&
							currentStage.subStages
						) {
							currentSubStage = currentStage.subStages.find(
								(ss) => ss.id === workflowInfo.subStage
							);
						}
					}

					if (!currentStage) continue;

					// Add to our list of workflow updates
					workflowUpdates.push({
						line: line.number,
						lineText,
						workflowType,
						currentStage: currentStage.id,
						currentSubStage: currentSubStage?.id,
					});
				}
			}
		}
	}

	const newChanges = [];

	console.log(workflowUpdates);

	// If we found any workflow updates to make, create a new transaction
	if (workflowUpdates.length > 0) {
		// Process each workflow update
		for (const update of workflowUpdates) {
			const line = tr.newDoc.line(update.line);
			const indentMatch = update.lineText.match(/^([\s|\t]*)/);
			const indentation = indentMatch ? indentMatch[1] : "";
			const tabSize = getTabSize(app);

			// Find the workflow definition
			const workflow = plugin.settings.workflow.definitions.find(
				(wf) => wf.id === update.workflowType
			);

			if (!workflow) continue;

			// Find the current stage in the workflow
			let currentStage: WorkflowStage | undefined;
			let currentSubStage:
				| { id: string; name: string; next?: string }
				| undefined;

			if (update.currentStage === "_root_task_") {
				// This is a special marker for root tasks
				// We should start with the first stage of the workflow
				if (workflow.stages.length > 0) {
					currentStage = {
						id: "_root_task_",
						name: "Root Task",
						type: "linear",
						next: workflow.stages[0].id,
					};
				} else {
					continue; // No stages in this workflow
				}
			} else {
				currentStage = workflow.stages.find(
					(s) => s.id === update.currentStage
				);

				// Check for substage
				if (
					update.currentSubStage &&
					currentStage &&
					currentStage.subStages
				) {
					currentSubStage = currentStage.subStages.find(
						(ss) => ss.id === update.currentSubStage
					);
				}
			}

			if (!currentStage) continue;

			// Determine the next stage
			let nextStageId: string;
			let nextSubStageId: string | undefined;

			if (currentStage.id === "_root_task_") {
				// For root tasks, always use the first stage
				nextStageId = workflow.stages[0].id;
			} else if (currentStage.type === "terminal") {
				// Terminal stages have no next stage
				continue;
			} else if (currentStage.type === "cycle" && currentSubStage) {
				// If we have a substage in a cycle stage, check if it has a next substage
				if (currentSubStage.next) {
					// Move to the next substage within this cycle
					nextStageId = currentStage.id;
					nextSubStageId = currentSubStage.next;
				} else if (
					currentStage.canProceedTo &&
					currentStage.canProceedTo.length > 0
				) {
					// If no next substage, try to move to the next main stage
					nextStageId = currentStage.canProceedTo[0];
					nextSubStageId = undefined;
				} else {
					// If no canProceedTo, cycle back to the first substage
					nextStageId = currentStage.id;
					nextSubStageId =
						currentStage.subStages &&
						currentStage.subStages.length > 0
							? currentStage.subStages[0].id
							: undefined;
				}
			} else if (currentStage.type === "linear") {
				// For linear stages, find the next stage
				if (typeof currentStage.next === "string") {
					nextStageId = currentStage.next;
				} else if (
					Array.isArray(currentStage.next) &&
					currentStage.next.length > 0
				) {
					nextStageId = currentStage.next[0];
				} else if (
					currentStage.canProceedTo &&
					currentStage.canProceedTo.length > 0
				) {
					nextStageId = currentStage.canProceedTo[0];
				} else {
					// Find the next stage in sequence
					const currentIndex = workflow.stages.findIndex(
						(s) => s.id === currentStage.id
					);
					if (
						currentIndex >= 0 &&
						currentIndex < workflow.stages.length - 1
					) {
						nextStageId = workflow.stages[currentIndex + 1].id;
					} else {
						continue; // No next stage found
					}
				}
			} else if (currentStage.type === "cycle") {
				// For cycle stages, check if there are canProceedTo options
				if (
					currentStage.canProceedTo &&
					currentStage.canProceedTo.length > 0
				) {
					nextStageId = currentStage.canProceedTo[0];
				} else {
					// Stay in the same stage
					nextStageId = currentStage.id;
				}
			} else {
				// Default fallback - stay in the same stage
				nextStageId = currentStage.id;
			}

			// Find the next stage object
			const nextStage = workflow.stages.find((s) => s.id === nextStageId);

			if (!nextStage) continue;

			// Find the next substage object if needed
			let nextSubStage:
				| { id: string; name: string; next?: string }
				| undefined;
			if (nextSubStageId && nextStage.subStages) {
				nextSubStage = nextStage.subStages.find(
					(ss) => ss.id === nextSubStageId
				);
			}

			// Create the new task text with stage marker
			const stageName = nextStage.name;

			// Determine if this is a root task or a subtask
			const isRootTask =
				update.lineText.includes(`#workflow/${update.workflowType}`) &&
				!update.lineText.includes("[stage::");

			// If this is a root task, add additional indentation for the new task
			const newTaskIndentation = isRootTask
				? indentation + " ".repeat(tabSize)
				: indentation;

			// Create task for the main stage
			let completeTaskText;

			if (nextSubStage) {
				// If we already have a specific next substage, create a task with that substage
				completeTaskText = `${newTaskIndentation}- [ ] New task for ${stageName} (${nextSubStage.name}) [stage::${nextStage.id}.${nextSubStage.id}]`;
			} else {
				// Otherwise, create a task for the main stage
				completeTaskText = `${newTaskIndentation}- [ ] New task for ${stageName} [stage::${nextStage.id}]`;

				// If this next stage has sub-stages, also create a sub-task for the first sub-stage
				if (
					nextStage.type === "cycle" &&
					nextStage.subStages &&
					nextStage.subStages.length > 0
				) {
					const firstSubStage = nextStage.subStages[0];
					const subTaskIndentation =
						newTaskIndentation + " ".repeat(tabSize);
					// Use a more explicit format for substages that includes the parent stage ID
					completeTaskText += `\n${subTaskIndentation}- [ ] New sub-task for ${firstSubStage.name} [stage::${nextStage.id}.${firstSubStage.id}]`;
				}
			}

			// Determine insertion point - either after the folded range (if present) or after the current line
			let insertionPoint = line.to;

			// Try to find the foldable range for this task
			// This only works if we have access to the full editor state with language info
			// so we make a reasonable approximation

			// Check if there are child tasks by looking for lines with greater indentation
			const lineIndent = indentation.length;
			let lastChildLine = line.number;
			let foundChildren = false;

			// Look at the next 20 lines to find potential child tasks
			// This is a reasonable limit for most task hierarchies
			for (
				let i = line.number + 1;
				i <= Math.min(line.number + 20, tr.newDoc.lines);
				i++
			) {
				const checkLine = tr.newDoc.line(i);
				const checkIndentMatch = checkLine.text.match(/^([\s|\t]*)/);
				const checkIndent = checkIndentMatch
					? checkIndentMatch[1].length
					: 0;

				// If this line has greater indentation, it's a child task
				if (checkIndent > lineIndent) {
					lastChildLine = i;
					foundChildren = true;
				}
				// If indentation is less than or equal and we've already found children,
				// we've moved out of the child tasks block
				else if (foundChildren) {
					break;
				}
			}

			// If we found child tasks, insert after the last child
			if (foundChildren) {
				insertionPoint = tr.newDoc.line(lastChildLine).to;
			}

			// Add the new task(s) after the determined insertion point
			newChanges.push({
				from: insertionPoint,
				to: insertionPoint,
				insert: `\n${completeTaskText}`,
			});
		}

		console.log(newChanges, tr.changes.toJSON());

		// Use the original changes from the transaction (which completed the task)
		// plus our new changes to add the next task
	}

	if (newChanges.length > 0) {
		return {
			changes: [tr.changes, ...newChanges],
			selection: tr.selection,
			annotations: workflowChangeAnnotation.of("workflowChange"),
		};
	}

	return tr;
}

/**
 * Updates the context menu with workflow options
 * @param menu The context menu to update
 * @param editor The editor instance
 * @param plugin The plugin instance
 */
export function updateWorkflowContextMenu(
	menu: any,
	editor: Editor,
	plugin: TaskProgressBarPlugin
) {
	if (!plugin.settings.workflow.enableWorkflow) {
		return;
	}

	const cursor = editor.getCursor();
	const line = editor.getLine(cursor.line);

	// Check if this line contains a task
	const taskRegex = /^([\s|\t]*)([-*+]|\d+\.)\s+\[(.)]/;
	const taskMatch = line.match(taskRegex);

	if (!taskMatch) {
		return;
	}

	// Check if this task has a workflow tag or stage marker
	const workflowInfo = extractWorkflowInfo(line);

	if (!workflowInfo) {
		// Add option to add workflow
		menu.addItem((item: any) => {
			item.setTitle("Workflow");
			item.setIcon("list-ordered");

			// Create submenu
			const submenu = item.setSubmenu();

			// Add option to add workflow root
			submenu.addItem((addItem: any) => {
				addItem.setTitle("Add as workflow root");
				addItem.setIcon("plus-circle");

				// Create a submenu for available workflows
				const workflowSubmenu = addItem.setSubmenu();

				plugin.settings.workflow.definitions.forEach((workflow) => {
					workflowSubmenu.addItem((wfItem: any) => {
						wfItem.setTitle(workflow.name);
						wfItem.onClick(() => {
							// Add workflow tag
							editor.setLine(
								cursor.line,
								`${line} #workflow/${workflow.id}`
							);
						});
					});
				});
			});

			// Add option to add stage marker
			submenu.addItem((addItem: any) => {
				addItem.setTitle("Add stage marker");
				addItem.setIcon("plus-circle");

				// Create a submenu for available workflows
				const workflowSubmenu = addItem.setSubmenu();

				plugin.settings.workflow.definitions.forEach((workflow) => {
					const workflowItem = workflowSubmenu.addItem(
						(wfItem: any) => {
							wfItem.setTitle(workflow.name);

							// Create submenu for stages
							const stageSubmenu = wfItem.setSubmenu();

							workflow.stages.forEach((stage) => {
								stageSubmenu.addItem((stageItem: any) => {
									stageItem.setTitle(stage.name);
									stageItem.onClick(() => {
										// Add stage marker
										editor.setLine(
											cursor.line,
											`${line} [stage::${stage.id}]`
										);
									});
								});
							});
						}
					);
				});
			});
		});
		return;
	}

	// If we're here, the task has a workflow tag or stage marker
	menu.addItem((item: any) => {
		item.setTitle("Workflow");
		item.setIcon("list-ordered");

		// Create submenu
		const submenu = item.setSubmenu();

		let workflowType = workflowInfo.workflowType;
		let stageId = workflowInfo.currentStage;

		// If this is a stage marker, we need to find the parent workflow
		if (workflowType === "fromParent") {
			// Get the document
			const doc = editor.getDoc();
			const parentWorkflow = findParentWorkflow(
				{
					line: (n: number) => ({
						text: doc.getLine(n - 1),
						number: n,
					}),
				} as any,
				cursor.line + 1
			);

			if (parentWorkflow) {
				workflowType = parentWorkflow;
			} else {
				// No parent workflow found
				return;
			}
		}

		// Find the workflow definition
		const workflow = plugin.settings.workflow.definitions.find(
			(wf) => wf.id === workflowType
		);

		if (!workflow) return;

		// Find the current stage
		let currentStage: WorkflowStage | undefined;

		if (stageId === "root") {
			// For root tasks, use the first stage
			if (workflow.stages.length > 0) {
				currentStage = {
					id: "_root_task_",
					name: "Root Task",
					type: "linear",
					next: workflow.stages[0].id,
				};
			} else {
				return; // No stages in this workflow
			}
		} else {
			// For sub-tasks, use the stage specified by the stage marker
			currentStage = workflow.stages.find((s) => s.id === stageId);
		}

		if (!currentStage) return;

		// Show available next stages
		if (currentStage.id === "_root_task_") {
			// For root tasks, show the first stage
			if (workflow.stages.length > 0) {
				const firstStage = workflow.stages[0];
				submenu.addItem((nextItem: any) => {
					nextItem.setTitle(`Move to ${firstStage.name}`);
					nextItem.onClick(() => {
						// Add the stage marker
						editor.setLine(
							cursor.line,
							`${line} [stage::${firstStage.id}]`
						);
					});
				});
			}
		} else if (currentStage.canProceedTo) {
			currentStage.canProceedTo.forEach((nextStageId) => {
				const nextStage = workflow.stages.find(
					(s) => s.id === nextStageId
				);

				if (nextStage) {
					submenu.addItem((nextItem: any) => {
						nextItem.setTitle(`Move to ${nextStage.name}`);
						nextItem.onClick(() => {
							// Update the stage marker
							const oldStageRegex = /\[stage::[^\]]+\]/;

							if (workflowInfo.currentStage === "root") {
								// For root tasks, add a stage marker
								editor.setLine(
									cursor.line,
									`${line} [stage::${nextStage.id}]`
								);
							} else {
								// For tasks with stage markers, update the marker
								const updatedLine = line.replace(
									oldStageRegex,
									`[stage::${nextStage.id}]`
								);
								editor.setLine(cursor.line, updatedLine);
							}
						});
					});
				}
			});
		} else {
			// Show all stages from the workflow
			workflow.stages.forEach((stage) => {
				// Skip the current stage
				if (stage.id === currentStage?.id) return;

				submenu.addItem((nextItem: any) => {
					nextItem.setTitle(`Move to ${stage.name}`);
					nextItem.onClick(() => {
						// Update the stage marker
						const oldStageRegex = /\[stage::[^\]]+\]/;

						if (workflowInfo.currentStage === "root") {
							// For root tasks, add a stage marker
							editor.setLine(
								cursor.line,
								`${line} [stage::${stage.id}]`
							);
						} else {
							// For tasks with stage markers, update the marker
							const updatedLine = line.replace(
								oldStageRegex,
								`[stage::${stage.id}]`
							);
							editor.setLine(cursor.line, updatedLine);
						}
					});
				});
			});
		}

		// Add option to add a child task with same stage
		submenu.addSeparator();
		submenu.addItem((addItem: any) => {
			addItem.setTitle("Add child task with same stage");
			addItem.setIcon("plus-circle");
			addItem.onClick(() => {
				// Get indentation
				const indentMatch = line.match(/^([\s|\t]*)/);
				const indentation = indentMatch ? indentMatch[1] : "";
				const tabSize = getTabSize(app);

				// Check if this is a root task
				const isRootTask =
					line.includes(`#workflow/${workflowType}`) &&
					!line.includes("[stage::");

				// Create a new task with the same stage information
				let newTaskText: string;
				if (workflowInfo.currentStage === "root") {
					// For root tasks, child task should have first stage
					if (workflow.stages.length > 0) {
						// Get the first stage
						const firstStage = workflow.stages[0];
						newTaskText = `${indentation}${" ".repeat(
							tabSize
						)}- [ ] New subtask [stage::${firstStage.id}]`;

						// If the first stage has substages, also add a subtask for the first substage
						if (
							firstStage.type === "cycle" &&
							firstStage.subStages &&
							firstStage.subStages.length > 0
						) {
							const subTaskIndent =
								indentation + " ".repeat(tabSize + tabSize);
							const firstSubStage = firstStage.subStages[0];
							newTaskText += `\n${subTaskIndent}- [ ] New sub-subtask [stage::${firstStage.id}.${firstSubStage.id}]`;
						}
					} else {
						newTaskText = `${indentation}${" ".repeat(
							tabSize
						)}- [ ] New subtask`;
					}
				} else if (currentStage && currentStage.id === "_root_task_") {
					// Also handle the special _root_task_ marker
					if (workflow.stages.length > 0) {
						// Get the first stage
						const firstStage = workflow.stages[0];
						newTaskText = `${indentation}${" ".repeat(
							tabSize
						)}- [ ] New subtask [stage::${firstStage.id}]`;

						// If the first stage has substages, also add a subtask for the first substage
						if (
							firstStage.type === "cycle" &&
							firstStage.subStages &&
							firstStage.subStages.length > 0
						) {
							const subTaskIndent =
								indentation + " ".repeat(tabSize + tabSize);
							const firstSubStage = firstStage.subStages[0];
							newTaskText += `\n${subTaskIndent}- [ ] New sub-subtask [stage::${firstStage.id}.${firstSubStage.id}]`;
						}
					} else {
						newTaskText = `${indentation}${" ".repeat(
							tabSize
						)}- [ ] New subtask`;
					}
				} else {
					// For tasks with stage markers, use the same stage
					// Always add proper indentation for subtasks
					newTaskText = `${indentation}${" ".repeat(
						tabSize
					)}- [ ] New subtask [stage::${workflowInfo.currentStage}]`;

					// Check if the current stage has substages
					const stage = workflow.stages.find(
						(s) => s.id === workflowInfo.currentStage
					);
					if (
						stage &&
						stage.type === "cycle" &&
						stage.subStages &&
						stage.subStages.length > 0
					) {
						const subTaskIndent =
							indentation + " ".repeat(tabSize + tabSize);
						const firstSubStage = stage.subStages[0];
						newTaskText += `\n${subTaskIndent}- [ ] New sub-subtask [stage::${stage.id}.${firstSubStage.id}]`;
					}
				}

				// Insert the new task after the current line
				editor.replaceRange(`\n${newTaskText}`, {
					line: cursor.line,
					ch: line.length,
				});
			});
		});
	});
}
