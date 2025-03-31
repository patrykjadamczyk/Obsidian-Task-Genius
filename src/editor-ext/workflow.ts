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
	// Regex pattern for workflow tags: #workflow/{workflowType}/{currentStage}[/{subStage}]
	const workflowTagRegex =
		/#workflow\/([^\/\s]+)\/([^\/\s]+)(?:\/([^\/\s]+))?/;
	const match = lineText.match(workflowTagRegex);

	if (match) {
		return {
			workflowType: match[1],
			currentStage: match[2],
			subStage: match[3], // Optional sub-stage
		};
	}

	return null;
}

/**
 * Finds the next stage in a workflow based on the current stage
 * @param workflowType The type of workflow
 * @param currentStage Current stage ID
 * @param subStage Optional current sub-stage ID
 * @param plugin Plugin instance to get workflow definitions
 * @returns The next stage information or null if not found
 */
export function findNextWorkflowStage(
	workflowType: string,
	currentStage: string,
	subStage: string | undefined,
	plugin: TaskProgressBarPlugin
): {
	nextStage: string;
	nextSubStage?: string;
	shouldAddTimestamp: boolean;
	isComplete: boolean;
} | null {
	// Find the workflow definition
	const workflow = plugin.settings.workflow.definitions.find(
		(wf: WorkflowDefinition) => wf.id === workflowType
	);

	if (!workflow) return null;

	// Find the current stage in the workflow
	const stage = workflow.stages.find(
		(s: WorkflowStage) => s.id === currentStage
	);
	if (!stage) return null;

	// Handle different stage types
	if (stage.type === "terminal") {
		// Terminal stages have no next stage
		return null;
	} else if (stage.type === "cycle" && stage.subStages && subStage) {
		// Find the current sub-stage
		const currentSubStage = stage.subStages.find(
			(s: { id: string; name: string; next?: string }) =>
				s.id === subStage
		);
		if (!currentSubStage) return null;

		// If there's a next sub-stage defined, use it
		if (currentSubStage.next) {
			const nextSubStage = stage.subStages.find(
				(s: { id: string; name: string; next?: string }) =>
					s.id === currentSubStage.next
			);
			if (nextSubStage) {
				return {
					nextStage: currentStage, // Same main stage
					nextSubStage: nextSubStage.id,
					shouldAddTimestamp: true,
					isComplete: false,
				};
			}
		}

		// If no next sub-stage or it's not found, move to the first sub-stage
		// (cycle back to the beginning)
		if (stage.subStages.length > 0) {
			return {
				nextStage: currentStage,
				nextSubStage: stage.subStages[0].id,
				shouldAddTimestamp: true,
				isComplete: false,
			};
		}
	} else if (
		stage.type === "linear" ||
		(stage.type === "cycle" && !subStage)
	) {
		// For linear stages, or cycle stages without sub-stages
		// If canProceedTo is defined, use the first stage from that list
		if (stage.canProceedTo && stage.canProceedTo.length > 0) {
			const nextStageId = stage.canProceedTo[0];
			const nextStage = workflow.stages.find(
				(s: WorkflowStage) => s.id === nextStageId
			);

			if (nextStage) {
				if (
					nextStage.type === "cycle" &&
					nextStage.subStages &&
					nextStage.subStages.length > 0
				) {
					return {
						nextStage: nextStageId,
						nextSubStage: nextStage.subStages[0].id,
						shouldAddTimestamp: true,
						isComplete: false,
					};
				} else {
					return {
						nextStage: nextStageId,
						shouldAddTimestamp: true,
						isComplete: nextStage.type === "terminal",
					};
				}
			}
		}

		// If next is a string, use it
		if (typeof stage.next === "string") {
			const nextStageId = stage.next;
			const nextStage = workflow.stages.find((s) => s.id === nextStageId);

			if (nextStage) {
				if (
					nextStage.type === "cycle" &&
					nextStage.subStages &&
					nextStage.subStages.length > 0
				) {
					return {
						nextStage: nextStageId,
						nextSubStage: nextStage.subStages[0].id,
						shouldAddTimestamp: true,
						isComplete: false,
					};
				} else {
					return {
						nextStage: nextStageId,
						shouldAddTimestamp: true,
						isComplete: nextStage.type === "terminal",
					};
				}
			}
		}

		// If next is an array, use the first item
		if (Array.isArray(stage.next) && stage.next.length > 0) {
			const nextStageId = stage.next[0];
			const nextStage = workflow.stages.find((s) => s.id === nextStageId);

			if (nextStage) {
				if (
					nextStage.type === "cycle" &&
					nextStage.subStages &&
					nextStage.subStages.length > 0
				) {
					return {
						nextStage: nextStageId,
						nextSubStage: nextStage.subStages[0].id,
						shouldAddTimestamp: true,
						isComplete: false,
					};
				} else {
					return {
						nextStage: nextStageId,
						shouldAddTimestamp: true,
						isComplete: nextStage.type === "terminal",
					};
				}
			}
		}
	}

	// If no next stage found, try to move to the next stage in the workflow
	const currentIndex = workflow.stages.findIndex(
		(s) => s.id === currentStage
	);
	if (currentIndex >= 0 && currentIndex < workflow.stages.length - 1) {
		const nextStage = workflow.stages[currentIndex + 1];

		if (
			nextStage.type === "cycle" &&
			nextStage.subStages &&
			nextStage.subStages.length > 0
		) {
			return {
				nextStage: nextStage.id,
				nextSubStage: nextStage.subStages[0].id,
				shouldAddTimestamp: true,
				isComplete: false,
			};
		} else {
			return {
				nextStage: nextStage.id,
				shouldAddTimestamp: true,
				isComplete: nextStage.type === "terminal",
			};
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
		newText: string;
		newSubTask?: {
			indentation: string;
			taskText: string;
			position: EditorPosition;
		};
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
				// Check if this task has a workflow tag
				const workflowInfo = extractWorkflowInfo(lineText);

				console.log(workflowInfo);

				if (workflowInfo) {
					// Find the next stage in the workflow
					const nextStage = findNextWorkflowStage(
						workflowInfo.workflowType,
						workflowInfo.currentStage,
						workflowInfo.subStage,
						plugin
					);

					if (nextStage) {
						// Get current date for timestamp
						const now = new Date();
						const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD format

						// Create the updated workflow tag
						let newTag: string;
						if (nextStage.nextSubStage) {
							newTag = `#workflow/${workflowInfo.workflowType}/${nextStage.nextStage}/${nextStage.nextSubStage}`;
						} else {
							newTag = `#workflow/${workflowInfo.workflowType}/${nextStage.nextStage}`;
						}

						// Update the current line - replace the old workflow tag with the new one
						const oldTagRegex = new RegExp(
							`#workflow/${workflowInfo.workflowType}/${workflowInfo.currentStage}(?:/${workflowInfo.subStage})?`,
							"g"
						);

						const updatedLineText = lineText.replace(
							oldTagRegex,
							newTag
						);

						// If auto add timestamp is enabled and we should add a timestamp
						let newSubTask:
							| {
									indentation: string;
									taskText: string;
									position: EditorPosition;
							  }
							| undefined = undefined;

						// if (
						// 	plugin.settings.workflow.autoAddTimestamp &&
						// 	nextStage.shouldAddTimestamp
						// ) {
						// 	// Get the indentation of the current task
						// 	const indentation = taskMatch[1];

						// 	// Create a sub-task for the completed stage with timestamp
						// 	let historyTag: string;
						// 	if (workflowInfo.subStage) {
						// 		historyTag = `#workflow/${workflowInfo.workflowType}/${workflowInfo.currentStage}/${workflowInfo.subStage}`;
						// 	} else {
						// 		historyTag = `#workflow/${workflowInfo.workflowType}/${workflowInfo.currentStage}`;
						// 	}

						// 	const taskText = `${indentation}  - [x] ${historyTag} (${dateStr})`;

						// 	// Calculate the position for the new sub-task (after the current line)
						// 	const position = {
						// 		line: line.number,
						// 		ch: 0, // Start of line
						// 	};

						// 	newSubTask = {
						// 		indentation,
						// 		taskText,
						// 		position,
						// 	};
						// }

						// Add to our list of workflow updates
						workflowUpdates.push({
							line: line.number,
							lineText,
							newText: updatedLineText,
							newSubTask,
						});
					}
				}
			}
		}
	}

	// If we found any workflow updates to make, create a new transaction
	if (workflowUpdates.length > 0) {
		const newChanges = [];

		// Process each workflow update
		for (const update of workflowUpdates) {
			const line = tr.newDoc.line(update.line);

			// Update the current line with the new workflow tag
			newChanges.push({
				from: line.from,
				to: line.to,
				insert: update.newText,
			});

			// If we should add a new sub-task to record the history
			if (update.newSubTask) {
				newChanges.push({
					from: line.to, // End of current line
					to: line.to,
					insert: `\n${update.newSubTask.taskText}`, // Add the sub-task on the next line
				});
			}
		}

		// If plugin setting for auto-add-next-task is enabled and we're at the end of a workflow,
		// Add a new task with the next stage information
		if (plugin.settings.workflow.autoAddNextTask) {
			for (const update of workflowUpdates) {
				// Check if we should add a new task based on workflow stage
				// Logic for determining when to add a new task would go here
				// For now, we'll add a task after each workflow update

				const line = tr.newDoc.line(update.line);
				const indentMatch = update.lineText.match(/^([\s|\t]*)/);
				const indentation = indentMatch ? indentMatch[1] : "";

				// Extract the updated workflow tag
				const updatedWorkflowInfo = extractWorkflowInfo(update.newText);

				if (updatedWorkflowInfo) {
					// Create a new task with the same workflow information
					const newTaskText = `${indentation}- [ ] New task for ${
						updatedWorkflowInfo.currentStage
					} ${
						updatedWorkflowInfo.subStage
							? `(${updatedWorkflowInfo.subStage})`
							: ""
					} #workflow/${updatedWorkflowInfo.workflowType}/${
						updatedWorkflowInfo.currentStage
					}${
						updatedWorkflowInfo.subStage
							? `/${updatedWorkflowInfo.subStage}`
							: ""
					}`;

					// Add the new task after the current task and its history sub-task (if any)
					const insertPosition = update.newSubTask
						? line.to + update.newSubTask.taskText.length + 1 // After sub-task
						: line.to; // After current line

					newChanges.push({
						from: insertPosition,
						to: insertPosition,
						insert: `\n${newTaskText}`,
					});
				}
			}
		}

		console.log(newChanges);

		return {
			changes: newChanges,
			selection: tr.selection,
			annotations: workflowChangeAnnotation.of("workflowChange"),
		};
	}

	// If no changes were made, return the original transaction
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

	// Check if this task has a workflow tag
	const workflowInfo = extractWorkflowInfo(line);

	// Add context menu items
	menu.addItem((item: any) => {
		item.setTitle("Workflow");
		item.setIcon("list-ordered");

		// Create submenu
		const submenu = item.setSubmenu();

		if (workflowInfo) {
			// Find the current workflow definition
			const workflow = plugin.settings.workflow.definitions.find(
				(wf) => wf.id === workflowInfo.workflowType
			);

			if (workflow) {
				// Find the current stage
				const currentStage = workflow.stages.find(
					(s) => s.id === workflowInfo.currentStage
				);

				if (currentStage) {
					// If this is a cycle stage with sub-stages and we have a current sub-stage
					if (
						currentStage.type === "cycle" &&
						currentStage.subStages &&
						workflowInfo.subStage
					) {
						// Show available sub-stages
						currentStage.subStages.forEach((subStage) => {
							submenu.addItem((subItem: any) => {
								subItem.setTitle(`Move to ${subStage.name}`);
								// Highlight the current sub-stage
								if (subStage.id === workflowInfo.subStage) {
									subItem.setIcon("check");
								}
								subItem.onClick(() => {
									// Update the workflow tag
									const oldTagRegex = new RegExp(
										`#workflow/${workflowInfo.workflowType}/${workflowInfo.currentStage}/${workflowInfo.subStage}`,
										"g"
									);
									const newTag = `#workflow/${workflowInfo.workflowType}/${workflowInfo.currentStage}/${subStage.id}`;

									const updatedLine = line.replace(
										oldTagRegex,
										newTag
									);
									editor.setLine(cursor.line, updatedLine);
								});
							});
						});
					} else if (currentStage.canProceedTo) {
						// Show available next stages
						currentStage.canProceedTo.forEach((nextStageId) => {
							const nextStage = workflow.stages.find(
								(s) => s.id === nextStageId
							);

							if (nextStage) {
								submenu.addItem((nextItem: any) => {
									nextItem.setTitle(
										`Move to ${nextStage.name}`
									);
									nextItem.onClick(() => {
										// Update the workflow tag
										const oldTagRegex = new RegExp(
											`#workflow/${workflowInfo.workflowType}/${workflowInfo.currentStage}(?:/${workflowInfo.subStage})?`,
											"g"
										);

										let newTag: string;
										if (
											nextStage.type === "cycle" &&
											nextStage.subStages &&
											nextStage.subStages.length > 0
										) {
											newTag = `#workflow/${workflowInfo.workflowType}/${nextStage.id}/${nextStage.subStages[0].id}`;
										} else {
											newTag = `#workflow/${workflowInfo.workflowType}/${nextStage.id}`;
										}

										const updatedLine = line.replace(
											oldTagRegex,
											newTag
										);
										editor.setLine(
											cursor.line,
											updatedLine
										);
									});
								});
							}
						});
					}

					// Add option to add a child task
					submenu.addSeparator();
					submenu.addItem((addItem: any) => {
						addItem.setTitle("Add child task");
						addItem.setIcon("plus-circle");
						addItem.onClick(() => {
							// Get indentation
							const indentMatch = line.match(/^([\s|\t]*)/);
							const indentation = indentMatch
								? indentMatch[1]
								: "";

							// Create a new task with the same workflow information
							let newTaskText: string;
							if (workflowInfo.subStage) {
								newTaskText = `${indentation}  - [ ] New subtask #workflow/${workflowInfo.workflowType}/${workflowInfo.currentStage}/${workflowInfo.subStage}`;
							} else {
								newTaskText = `${indentation}  - [ ] New subtask #workflow/${workflowInfo.workflowType}/${workflowInfo.currentStage}`;
							}

							// Insert the new task after the current line
							editor.replaceRange(`\n${newTaskText}`, {
								line: cursor.line,
								ch: line.length,
							});
						});
					});
				}
			}
		} else {
			// Task has no workflow tag yet - allow adding one
			if (plugin.settings.workflow.definitions.length > 0) {
				submenu.addItem((addItem: any) => {
					addItem.setTitle("Add workflow");
					addItem.setIcon("plus-circle");

					// Create a submenu for available workflows
					const workflowSubmenu = addItem.setSubmenu();

					plugin.settings.workflow.definitions.forEach((workflow) => {
						workflowSubmenu.addItem((wfItem: any) => {
							wfItem.setTitle(workflow.name);
							wfItem.onClick(() => {
								// Add workflow tag with first stage
								if (workflow.stages.length > 0) {
									const firstStage = workflow.stages[0];

									let newTag: string;
									if (
										firstStage.type === "cycle" &&
										firstStage.subStages &&
										firstStage.subStages.length > 0
									) {
										newTag = `#workflow/${workflow.id}/${firstStage.id}/${firstStage.subStages[0].id}`;
									} else {
										newTag = `#workflow/${workflow.id}/${firstStage.id}`;
									}

									// Add the tag to the end of the task line
									editor.setLine(
										cursor.line,
										`${line} ${newTag}`
									);
								}
							});
						});
					});
				});
			}
		}
	});
}
