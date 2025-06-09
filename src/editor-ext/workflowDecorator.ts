import {
	EditorView,
	ViewPlugin,
	ViewUpdate,
	Decoration,
	DecorationSet,
	WidgetType,
	MatchDecorator,
	PluginValue,
	PluginSpec,
} from "@codemirror/view";
import { App, setTooltip } from "obsidian";
import TaskProgressBarPlugin from "../index";
import { Annotation } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { t } from "../translations/helper";
import {
	extractWorkflowInfo,
	resolveWorkflowInfo,
	determineNextStage,
} from "./workflow";
import { taskStatusChangeAnnotation } from "./taskStatusSwitcher";

// Annotation that marks a transaction as a workflow decorator change
export const workflowDecoratorAnnotation = Annotation.define<string>();

/**
 * Widget for displaying workflow stage information with tooltip and click functionality
 */
class WorkflowStageWidget extends WidgetType {
	constructor(
		private app: App,
		private plugin: TaskProgressBarPlugin,
		private view: EditorView,
		private from: number,
		private to: number,
		private workflowType: string,
		private currentStage: string,
		private currentSubStage?: string
	) {
		super();
	}

	eq(other: WorkflowStageWidget): boolean {
		return (
			this.from === other.from &&
			this.to === other.to &&
			this.workflowType === other.workflowType &&
			this.currentStage === other.currentStage &&
			this.currentSubStage === other.currentSubStage
		);
	}

	toDOM(): HTMLElement {
		const container = document.createElement("span");
		container.className = "workflow-stage-indicator";
		container.style.cssText = `
			display: inline-block;
			margin-left: 4px;
			padding: 2px 6px;
			border-radius: 3px;
			font-size: 11px;
			font-weight: 500;
			background-color: var(--background-secondary-alt);
			color: var(--text-muted);
			cursor: pointer;
			border: 1px solid var(--background-modifier-border);
			transition: all 0.2s ease;
		`;

		// Get workflow definition
		const workflow = this.plugin.settings.workflow.definitions.find(
			(wf) => wf.id === this.workflowType
		);

		if (!workflow) {
			container.textContent = "❓";
			container.title = t("Workflow not found");
			return container;
		}

		// Find current stage
		const stage = workflow.stages.find((s) => s.id === this.currentStage);
		if (!stage) {
			container.textContent = "❓";
			container.title = t("Stage not found");
			return container;
		}

		// Set stage indicator based on type
		let stageIcon = "";
		let stageColor = "";
		switch (stage.type) {
			case "linear":
				stageIcon = "→";
				stageColor = "var(--text-accent)";
				break;
			case "cycle":
				stageIcon = "↻";
				stageColor = "var(--task-in-progress-color)";
				break;
			case "terminal":
				stageIcon = "✓";
				stageColor = "var(--task-completed-color)";
				break;
			default:
				stageIcon = "•";
				stageColor = "var(--text-muted)";
		}

		container.textContent = stageIcon;
		container.style.color = stageColor;

		// Create tooltip content
		let tooltipContent = `${t("Workflow")}: ${workflow.name}\n`;
		tooltipContent += `${t("Current stage")}: ${stage.name}`;

		if (this.currentSubStage && stage.subStages) {
			const subStage = stage.subStages.find(
				(ss: any) => ss.id === this.currentSubStage
			);
			if (subStage) {
				tooltipContent += ` (${subStage.name})`;
			}
		}

		tooltipContent += `\n${t("Type")}: ${stage.type}`;

		// Add next stage information
		const { nextStageId } = determineNextStage(stage, workflow);
		if (nextStageId && nextStageId !== stage.id) {
			const nextStage = workflow.stages.find((s) => s.id === nextStageId);
			if (nextStage) {
				tooltipContent += `\n${t("Next")}: ${nextStage.name}`;
			}
		}

		// Set tooltip using Obsidian's setTooltip
		container.addEventListener("mouseenter", () => {
			setTooltip(container, tooltipContent, {
				placement: "top",
			});
		});

		// Add click handler for stage transition
		container.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.handleStageClick();
		});

		// Add hover effects
		container.addEventListener("mouseenter", () => {
			container.style.backgroundColor = "var(--interactive-hover)";
			container.style.borderColor = "var(--interactive-accent)";
		});

		container.addEventListener("mouseleave", () => {
			container.style.backgroundColor = "var(--background-secondary-alt)";
			container.style.borderColor = "var(--background-modifier-border)";
		});

		return container;
	}

	/**
	 * Handle click on workflow stage indicator
	 */
	private handleStageClick(): void {
		const line = this.view.state.doc.lineAt(this.from);
		const lineText = line.text;

		// Resolve complete workflow information
		const resolvedInfo = resolveWorkflowInfo(
			lineText,
			this.view.state.doc,
			line.number,
			this.plugin
		);

		if (!resolvedInfo) {
			return;
		}

		const { currentStage, currentSubStage, workflow } = resolvedInfo;

		// Determine next stage
		const { nextStageId, nextSubStageId } = determineNextStage(
			currentStage,
			workflow,
			currentSubStage
		);

		// Find the next stage object
		const nextStage = workflow.stages.find((s) => s.id === nextStageId);
		if (!nextStage) {
			return;
		}

		// Create stage transition
		this.createStageTransition(line, nextStage, nextSubStageId);
	}

	/**
	 * Create a stage transition by updating the task
	 */
	private createStageTransition(
		line: any,
		nextStage: any,
		nextSubStageId?: string
	): void {
		const changes = [];

		// Mark current task as completed
		const taskRegex = /^([\s|\t]*)([-*+]|\d+\.)\s+\[(.)]/;
		const taskMatch = line.text.match(taskRegex);
		if (taskMatch) {
			const taskStart = line.from + taskMatch[0].indexOf("[");
			changes.push({
				from: taskStart + 1,
				to: taskStart + 2,
				insert: "x",
			});
		}

		// Remove current stage marker if enabled
		if (this.plugin.settings.workflow.autoRemoveLastStageMarker) {
			const stageMarkerRegex = /\s*\[stage::[^\]]+\]/;
			const stageMarker = line.text.match(stageMarkerRegex);
			if (stageMarker && stageMarker.index !== undefined) {
				changes.push({
					from: line.from + stageMarker.index,
					to: line.from + stageMarker.index + stageMarker[0].length,
					insert: "",
				});
			}
		}

		// Create new task for next stage if not terminal
		if (nextStage.type !== "terminal") {
			const indentMatch = line.text.match(/^([\s|\t]*)/);
			const indentation = indentMatch ? indentMatch[1] : "";

			// Generate new task text
			let newTaskText = `\n${indentation}- [ ] ${nextStage.name}`;

			// Add substage if specified
			if (nextSubStageId && nextStage.subStages) {
				const nextSubStage = nextStage.subStages.find(
					(ss: any) => ss.id === nextSubStageId
				);
				if (nextSubStage) {
					newTaskText += ` (${nextSubStage.name})`;
				}
			}

			// Add stage marker
			const stageId = nextSubStageId
				? `${nextStage.id}.${nextSubStageId}`
				: nextStage.id;
			newTaskText += ` [stage::${stageId}]`;

			// Add timestamp if enabled
			if (this.plugin.settings.workflow.autoAddTimestamp) {
				const timestamp = new Date()
					.toISOString()
					.replace("T", " ")
					.substring(0, 19);
				newTaskText += ` 🛫 ${timestamp}`;
			}

			changes.push({
				from: line.to,
				to: line.to,
				insert: newTaskText,
			});
		}

		// Apply changes
		if (changes.length > 0) {
			this.view.dispatch({
				changes,
				annotations: [
					taskStatusChangeAnnotation.of("workflowStageTransition"),
					workflowDecoratorAnnotation.of("stageClick"),
				],
			});
		}
	}
}

/**
 * Creates an editor extension that decorates workflow stage markers with interactive indicators
 * @param app The Obsidian app instance
 * @param plugin The plugin instance
 * @returns An editor extension that can be registered with the plugin
 */
export function workflowDecoratorExtension(
	app: App,
	plugin: TaskProgressBarPlugin
) {
	// Don't enable if workflow feature is disabled
	if (!plugin.settings.workflow.enableWorkflow) {
		return [];
	}

	class WorkflowDecoratorViewPluginValue implements PluginValue {
		public readonly view: EditorView;
		decorations: DecorationSet = Decoration.none;
		private lastUpdate: number = 0;
		private readonly updateThreshold: number = 50;

		// Matcher for workflow tags and stage markers
		private readonly workflowMatch = new MatchDecorator({
			regexp: /(#workflow\/[^\/\s]+|\[stage::[^\]]+\])/g,
			decorate: (
				add,
				from: number,
				to: number,
				match: RegExpExecArray,
				view: EditorView
			) => {
				if (!this.shouldRender(view, from, to)) {
					return;
				}

				const line = view.state.doc.lineAt(from);
				const lineText = line.text;

				// Check if this line contains a task
				const taskRegex = /^([\s|\t]*)([-*+]|\d+\.)\s+\[(.)]/;
				if (!taskRegex.test(lineText)) {
					return;
				}

				// Extract workflow information
				const workflowInfo = extractWorkflowInfo(lineText);
				if (!workflowInfo) {
					return;
				}

				// Resolve complete workflow information
				const resolvedInfo = resolveWorkflowInfo(
					lineText,
					view.state.doc,
					line.number,
					plugin
				);

				if (!resolvedInfo) {
					return;
				}

				const { workflowType, currentStage, currentSubStage } =
					resolvedInfo;

				// Add decoration after the matched text
				add(
					to,
					to,
					Decoration.widget({
						widget: new WorkflowStageWidget(
							app,
							plugin,
							view,
							from,
							to,
							workflowType,
							currentStage.id,
							currentSubStage?.id
						),
						side: 1,
					})
				);
			},
		});

		constructor(view: EditorView) {
			this.view = view;
			this.updateDecorations(view);
		}

		update(update: ViewUpdate) {
			const now = Date.now();
			if (now - this.lastUpdate < this.updateThreshold) {
				return;
			}
			this.lastUpdate = now;

			if (
				update.docChanged ||
				update.selectionSet ||
				update.viewportChanged
			) {
				this.updateDecorations(update.view, update);
			}
		}

		destroy(): void {
			this.decorations = Decoration.none;
		}

		updateDecorations(view: EditorView, update?: ViewUpdate) {
			if (
				!update ||
				update.docChanged ||
				update.selectionSet ||
				this.decorations.size === 0
			) {
				this.decorations = this.workflowMatch.createDeco(view);
			} else {
				this.decorations = this.workflowMatch.updateDeco(
					update,
					this.decorations
				);
			}
		}

		shouldRender(
			view: EditorView,
			decorationFrom: number,
			decorationTo: number
		): boolean {
			try {
				// Validate positions
				if (
					decorationFrom < 0 ||
					decorationTo > view.state.doc.length ||
					decorationFrom >= decorationTo
				) {
					return false;
				}

				const syntaxNode = syntaxTree(view.state).resolveInner(
					decorationFrom + 1
				);
				const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);

				if (nodeProps) {
					const props = nodeProps.split(" ");
					if (
						props.includes("hmd-codeblock") ||
						props.includes("hmd-frontmatter")
					) {
						return false;
					}
				}

				const selection = view.state.selection;

				// Don't render if cursor is in the decoration area
				const overlap = selection.ranges.some((r) => {
					return !(r.to <= decorationFrom || r.from >= decorationTo);
				});

				return !overlap;
			} catch (e) {
				console.warn(
					"Error checking if workflow decorator should render",
					e
				);
				return false;
			}
		}

		isLivePreview(state: any): boolean {
			// Check if we're in live preview mode
			try {
				return state.field(
					(app as any).workspace.editorLivePreviewField,
					false
				);
			} catch {
				return false;
			}
		}
	}

	const WorkflowDecoratorViewPluginSpec: PluginSpec<WorkflowDecoratorViewPluginValue> =
		{
			decorations: (plugin) => {
				try {
					return plugin.decorations.update({
						filter: (
							rangeFrom: number,
							rangeTo: number,
							deco: Decoration
						) => {
							try {
								const widget = deco.spec?.widget;
								if ((widget as any).error) {
									return false;
								}

								// Validate range
								if (
									rangeFrom < 0 ||
									rangeTo > plugin.view.state.doc.length ||
									rangeFrom >= rangeTo
								) {
									return false;
								}

								const selection = plugin.view.state.selection;

								// Remove decorations when cursor is inside them
								for (const range of selection.ranges) {
									if (
										!(
											range.to <= rangeFrom ||
											range.from >= rangeTo
										)
									) {
										return false;
									}
								}

								return true;
							} catch (e) {
								console.warn(
									"Error filtering workflow decorator decoration",
									e
								);
								return false;
							}
						},
					});
				} catch (e) {
					console.error(
						"Failed to update workflow decorations filter",
						e
					);
					return plugin.decorations;
				}
			},
		};

	return ViewPlugin.fromClass(
		WorkflowDecoratorViewPluginValue,
		WorkflowDecoratorViewPluginSpec
	);
}
