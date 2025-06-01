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
import { App, editorLivePreviewField, Keymap, Menu } from "obsidian";
import TaskProgressBarPlugin from "../index";
import { Annotation } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { t } from "../translations/helper";
export const priorityChangeAnnotation = Annotation.define();

// Priority definitions
export const TASK_PRIORITIES = {
	highest: {
		emoji: "🔺",
		text: t("Highest priority"),
		regex: "🔺",
	},
	high: {
		emoji: "⏫",
		text: t("High priority"),
		regex: "⏫",
	},
	medium: {
		emoji: "🔼",
		text: t("Medium priority"),
		regex: "🔼",
	},
	none: {
		emoji: "",
		text: t("No priority"),
		regex: "",
	},
	low: {
		emoji: "🔽",
		text: t("Low priority"),
		regex: "🔽",
	},
	lowest: {
		emoji: "⏬️",
		text: t("Lowest priority"),
		regex: "⏬️",
	},
};

// Task plugin format priorities
export const LETTER_PRIORITIES = {
	A: {
		text: t("Priority A"),
		regex: "\\[#A\\]",
	},
	B: {
		text: t("Priority B"),
		regex: "\\[#B\\]",
	},
	C: {
		text: t("Priority C"),
		regex: "\\[#C\\]",
	},
};

// Combined regular expressions for detecting priorities
const emojiPriorityRegex = Object.values(TASK_PRIORITIES)
	.map((p) => p.regex)
	.filter((r) => r)
	.join("|");

const letterPriorityRegex = Object.values(LETTER_PRIORITIES)
	.map((p) => p.regex)
	.join("|");

// Dataview priorities regex
const dataviewPriorityRegex = /\[priority::\s*(highest|high|medium|none|low|lowest)\]/i;

// Helper to detect mode for a given line
function detectPriorityMode(lineText: string): 'tasks' | 'dataview' | 'letter' | 'none' {
	if (/\[priority::\s*(highest|high|medium|none|low|lowest)\]/i.test(lineText)) {
		return 'dataview';
	}
	if (/(🔺|⏫|🔼|🔽|⏬️)/.test(lineText)) {
		return 'tasks';
	}
	if (/\[#([ABC])\]/.test(lineText)) {
		return 'letter';
	}
	return 'none';
}

class PriorityWidget extends WidgetType {
	constructor(
		readonly app: App,
		readonly plugin: TaskProgressBarPlugin,
		readonly view: EditorView,
		readonly from: number,
		readonly to: number,
		readonly currentPriority: string,
		readonly isLetterFormat: boolean
	) {
		super();
	}

	eq(other: PriorityWidget): boolean {
		return (
			this.from === other.from &&
			this.to === other.to &&
			this.currentPriority === other.currentPriority &&
			this.isLetterFormat === other.isLetterFormat
		);
	}

	toDOM(): HTMLElement {
		try {
			const wrapper = createEl("span", {
				cls: "priority-widget",
				attr: {
					"aria-label": t("Task Priority"),
				},
			});

			// Get the line text to detect mode
			const line = this.view.state.doc.lineAt(this.from);
			const mode = detectPriorityMode(line.text);

			let prioritySpan: HTMLElement;

			if (this.isLetterFormat) {
				// Create spans for letter format priority [#A]
				const leftBracket = document.createElement("span");
				leftBracket.classList.add(
					"cm-formatting",
					"cm-formatting-link",
					"cm-hmd-barelink",
					"cm-link",
					"cm-list-1"
				);
				leftBracket.setAttribute("spellcheck", "false");
				leftBracket.textContent = "[";

				prioritySpan = document.createElement("span");
				prioritySpan.classList.add(
					"cm-hmd-barelink",
					"cm-link",
					"cm-list-1"
				);
				prioritySpan.textContent = this.currentPriority.slice(1, -1); // Remove brackets

				const rightBracket = document.createElement("span");
				rightBracket.classList.add(
					"cm-formatting",
					"cm-formatting-link",
					"cm-hmd-barelink",
					"cm-link",
					"cm-list-1"
				);
				rightBracket.setAttribute("spellcheck", "false");
				rightBracket.textContent = "]";

				wrapper.appendChild(leftBracket);
				wrapper.appendChild(prioritySpan);
				wrapper.appendChild(rightBracket);
			} else if (mode === 'dataview') {
				prioritySpan = document.createElement("span");
				prioritySpan.classList.add("task-priority-dataview");
				prioritySpan.textContent = this.currentPriority;
				wrapper.appendChild(prioritySpan);
			} else {
				prioritySpan = document.createElement("span");
				prioritySpan.classList.add("task-priority");
				prioritySpan.textContent = this.currentPriority;
				wrapper.appendChild(prioritySpan);
			}

			// Attach click event to the inner span (like datePicker)
			prioritySpan.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.showPriorityMenu(e);
			});

			return wrapper;
		} catch (error) {
			console.error("Error creating priority widget DOM:", error);
			// Return a fallback element to prevent crashes
			const fallback = createEl("span", {
				cls: "priority-widget-error",
				text: this.currentPriority,
			});
			return fallback;
		}
	}

	private showPriorityMenu(e: MouseEvent) {
		try {
			const menu = new Menu();
			const line = this.view.state.doc.lineAt(this.from);
			const mode = detectPriorityMode(line.text);

			if (this.isLetterFormat) {
				// Only show letter priorities
				Object.entries(LETTER_PRIORITIES).forEach(([key, priority]) => {
					menu.addItem((item) => {
						item.setTitle(priority.text);
						item.onClick(() => {
							this.setPriority(`[#${key}]`, 'letter');
						});
					});
				});
				menu.addItem((item) => {
					item.setTitle(t("Remove Priority"));
					item.onClick(() => {
						this.removePriority('letter');
					});
				});
			} else {
				// Only show the 6 levels (Highest, High, Medium, None, Low, Lowest)
				Object.entries(TASK_PRIORITIES).forEach(([key, priority]) => {
					if (key === "none") {
						menu.addItem((item) => {
							item.setTitle(t("Remove Priority"));
							item.onClick(() => {
								this.removePriority(mode === 'dataview' ? 'dataview' : 'tasks');
							});
						});
					} else {
						menu.addItem((item) => {
							item.setTitle(mode === 'dataview' ? priority.text : `${priority.emoji} ${priority.text}`);
							item.onClick(() => {
								if (mode === 'dataview') {
									this.setPriority(`[priority:: ${key}]`, 'dataview');
								} else {
									this.setPriority(priority.emoji, 'tasks');
								}
							});
						});
					}
				});
			}

			menu.showAtMouseEvent(e);
		} catch (error) {
			console.error("Error showing priority menu:", error);
		}
	}

	private setPriority(priority: string, mode: 'tasks' | 'dataview' | 'letter') {
		try {
			// Validate view state before making changes
			if (!this.view || this.view.state.doc.length < this.to) {
				console.warn("Invalid view state, skipping priority update");
				return;
			}

			const line = this.view.state.doc.lineAt(this.from);
			let newLine = line.text;

			if (mode === 'dataview') {
				// Replace or insert [priority:: ...]
				if (/\[priority::\s*\w+\]/i.test(newLine)) {
					newLine = newLine.replace(/\[priority::\s*\w+\]/i, priority);
				} else {
					// Insert at end
					newLine = newLine.trimEnd() + ' ' + priority;
				}
			} else if (mode === 'tasks') {
				// Replace emoji priority
				if (/(🔺|⏫|🔼|🔽|⏬️)/.test(newLine)) {
					newLine = newLine.replace(/(🔺|⏫|🔼|🔽|⏬️)/, priority);
				} else {
					// Insert at end
					newLine = newLine.trimEnd() + ' ' + priority;
				}
			} else if (mode === 'letter') {
				// Replace or insert [#A], [#B], [#C]
				if (/\[#([ABC])\]/.test(newLine)) {
					newLine = newLine.replace(/\[#([ABC])\]/, priority);
				} else {
					// Insert at end
					newLine = newLine.trimEnd() + ' ' + priority;
				}
			}

			const transaction = this.view.state.update({
				changes: { from: line.from, to: line.to, insert: newLine },
				annotations: [priorityChangeAnnotation.of(true)],
			});
			this.view.dispatch(transaction);
		} catch (error) {
			console.error("Error setting priority:", error);
		}
	}

	private removePriority(mode: 'tasks' | 'dataview' | 'letter') {
		try {
			// Validate view state before making changes
			if (!this.view || this.view.state.doc.length < this.to) {
				console.warn("Invalid view state, skipping priority removal");
				return;
			}
			const line = this.view.state.doc.lineAt(this.from);
			let newLine = line.text;
			if (mode === 'dataview') {
				newLine = newLine.replace(/\[priority::\s*\w+\]/i, '').trimEnd();
			} else if (mode === 'tasks') {
				newLine = newLine.replace(/(🔺|⏫|🔼|🔽|⏬️)/, '').trimEnd();
			} else if (mode === 'letter') {
				newLine = newLine.replace(/\[#([ABC])\]/, '').trimEnd();
			}
			const transaction = this.view.state.update({
				changes: { from: line.from, to: line.to, insert: newLine },
				annotations: [priorityChangeAnnotation.of(true)],
			});
			this.view.dispatch(transaction);
		} catch (error) {
			console.error("Error removing priority:", error);
		}
	}
}

export function priorityPickerExtension(
	app: App,
	plugin: TaskProgressBarPlugin
) {
	// Don't enable if the setting is off
	if (!plugin.settings.enablePriorityPicker) {
		return [];
	}

	class PriorityViewPluginValue implements PluginValue {
		public readonly view: EditorView;
		public readonly plugin: TaskProgressBarPlugin;
		decorations: DecorationSet = Decoration.none;
		private lastUpdate: number = 0;
		private readonly updateThreshold: number = 50; // Increased threshold for better stability
		public isDestroyed: boolean = false;

		// Emoji priorities matcher
		private readonly emojiMatch = new MatchDecorator({
			regexp: new RegExp(`(${emojiPriorityRegex})`, "g"),
			decorate: (
				add,
				from: number,
				to: number,
				match: RegExpExecArray,
				view: EditorView
			) => {
				try {
					if (!this.shouldRender(view, from, to)) {
						return;
					}

					add(
						from,
						to,
						Decoration.replace({
							widget: new PriorityWidget(
								app,
								plugin,
								view,
								from,
								to,
								match[0],
								false
							),
						})
					);
				} catch (error) {
					console.warn("Error decorating emoji priority:", error);
				}
			},
		});

		// Letter priorities matcher
		private readonly letterMatch = new MatchDecorator({
			regexp: new RegExp(`(${letterPriorityRegex})`, "g"),
			decorate: (
				add,
				from: number,
				to: number,
				match: RegExpExecArray,
				view: EditorView
			) => {
				try {
					if (!this.shouldRender(view, from, to)) {
						return;
					}

					add(
						from,
						to,
						Decoration.replace({
							widget: new PriorityWidget(
								app,
								plugin,
								view,
								from,
								to,
								match[0],
								true
							),
						})
					);
				} catch (error) {
					console.warn("Error decorating letter priority:", error);
				}
			},
		});

		// Dataview priorities matcher
		private readonly dataviewMatch = new MatchDecorator({
			regexp: /\[priority::\s*(highest|high|medium|none|low|lowest)\]/gi,
			decorate: (
				add,
				from: number,
				to: number,
				match: RegExpExecArray,
				view: EditorView
			) => {
				try {
					if (!this.shouldRender(view, from, to)) {
						return;
					}
					add(
						from,
						to,
						Decoration.replace({
							widget: new PriorityWidget(
								app,
								plugin,
								view,
								from,
								to,
								match[0],
								false
							),
						})
					);
				} catch (error) {
					console.warn("Error decorating dataview priority:", error);
				}
			},
		});

		constructor(view: EditorView) {
			this.view = view;
			this.plugin = plugin;
			this.updateDecorations(view);
		}

		update(update: ViewUpdate): void {
			if (this.isDestroyed) return;

			try {
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.selectionSet ||
					update.transactions.some((tr) =>
						tr.annotation(priorityChangeAnnotation)
					)
				) {
					// Throttle updates to avoid performance issues with large documents
					const now = Date.now();
					if (now - this.lastUpdate > this.updateThreshold) {
						this.lastUpdate = now;
						this.updateDecorations(update.view, update);
					} else {
						// Schedule an update in the near future to ensure rendering
						setTimeout(() => {
							if (this.view && !this.isDestroyed) {
								this.updateDecorations(this.view);
							}
						}, this.updateThreshold);
					}
				}
			} catch (error) {
				console.error("Error in priority picker update:", error);
			}
		}

		destroy(): void {
			this.isDestroyed = true;
			this.decorations = Decoration.none;
		}

		updateDecorations(view: EditorView, update?: ViewUpdate) {
			if (this.isDestroyed) return;

			// Only apply in live preview mode
			if (!this.isLivePreview(view.state)) {
				this.decorations = Decoration.none;
				return;
			}

			try {
				// Use incremental update when possible for better performance
				if (update && !update.docChanged && this.decorations.size > 0) {
					// Try to update emoji decorations
					const emojiDecos = this.emojiMatch.updateDeco(
						update,
						this.decorations
					);
					if (emojiDecos.size > 0) {
						this.decorations = emojiDecos;
						return;
					}

					// If no emoji decorations, try dataview format
					const dataviewDecos = this.dataviewMatch.updateDeco(
						update,
						this.decorations
					);
					if (dataviewDecos.size > 0) {
						this.decorations = dataviewDecos;
						return;
					}

					// If no dataview decorations, try letter format
					const letterDecos = this.letterMatch.updateDeco(
						update,
						this.decorations
					);
					this.decorations = letterDecos;
				} else {
					// Create new decorations from scratch
					// First try emoji priorities
					const emojiDecos = this.emojiMatch.createDeco(view);
					if (emojiDecos.size > 0) {
						this.decorations = emojiDecos;
						return;
					}

					// If no emoji priorities found, check for dataview priorities
					const dataviewDecos = this.dataviewMatch.createDeco(view);
					if (dataviewDecos.size > 0) {
						this.decorations = dataviewDecos;
						return;
					}

					// If no dataview priorities found, check for letter priorities
					this.decorations = this.letterMatch.createDeco(view);
				}
			} catch (e) {
				console.warn(
					"Error updating priority decorations, clearing decorations",
					e
				);
				// Clear decorations on error to prevent crashes
				this.decorations = Decoration.none;
			}
		}

		isLivePreview(state: EditorView["state"]): boolean {
			try {
				return state.field(editorLivePreviewField);
			} catch (error) {
				console.warn("Error checking live preview state:", error);
				return false;
			}
		}

		shouldRender(
			view: EditorView,
			decorationFrom: number,
			decorationTo: number
		) {
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

				const overlap = selection.ranges.some((r) => {
					return !(r.to <= decorationFrom || r.from >= decorationTo);
				});

				return !overlap && this.isLivePreview(view.state);
			} catch (e) {
				// If an error occurs, default to not rendering to avoid breaking the editor
				console.warn("Error checking if priority should render", e);
				return false;
			}
		}
	}

	const PriorityViewPluginSpec: PluginSpec<PriorityViewPluginValue> = {
		decorations: (plugin) => {
			try {
				if (plugin.isDestroyed) {
					return Decoration.none;
				}

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
								"Error filtering priority decoration",
								e
							);
							return false; // Remove decoration on error
						}
					},
				});
			} catch (e) {
				console.error("Failed to update decorations filter", e);
				return plugin.decorations; // Return current decorations to avoid breaking the editor
			}
		},
	};

	// Create the plugin with our implementation
	const pluginInstance = ViewPlugin.fromClass(
		PriorityViewPluginValue,
		PriorityViewPluginSpec
	);

	return pluginInstance;
}
