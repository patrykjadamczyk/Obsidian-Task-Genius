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
import TaskProgressBarPlugin from "..";
import { Annotation } from "@codemirror/state";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { syntaxTree, tokenClassNodeProp } from "@codemirror/language";

export const priorityChangeAnnotation = Annotation.define();

// Priority definitions
export const TASK_PRIORITIES = {
	highest: {
		emoji: "🔺",
		text: "Highest priority",
		regex: "🔺",
	},
	high: {
		emoji: "⏫",
		text: "High priority",
		regex: "⏫",
	},
	medium: {
		emoji: "🔼",
		text: "Medium priority",
		regex: "🔼",
	},
	none: {
		emoji: "",
		text: "No priority",
		regex: "",
	},
	low: {
		emoji: "🔽",
		text: "Low priority",
		regex: "🔽",
	},
	lowest: {
		emoji: "⏬️",
		text: "Lowest priority",
		regex: "⏬️",
	},
};

// Task plugin format priorities
export const LETTER_PRIORITIES = {
	A: {
		text: "Priority A",
		regex: "\\[#A\\]",
	},
	B: {
		text: "Priority B",
		regex: "\\[#B\\]",
	},
	C: {
		text: "Priority C",
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
		const wrapper = createEl("span", {
			cls: "priority-widget",
			attr: {
				"aria-label": "Task Priority",
			},
		});

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

			const priority = document.createElement("span");
			priority.classList.add("cm-hmd-barelink", "cm-link", "cm-list-1");
			priority.textContent = this.currentPriority.slice(1, -1); // Remove brackets

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
			wrapper.appendChild(priority);
			wrapper.appendChild(rightBracket);
		} else {
			const priorityText = document.createElement("span");
			priorityText.classList.add("task-priority");
			priorityText.textContent = this.currentPriority;
			wrapper.appendChild(priorityText);
		}

		// Handle click to show priority menu
		wrapper.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.showPriorityMenu(e);
		});

		return wrapper;
	}

	private showPriorityMenu(e: MouseEvent) {
		const menu = new Menu();

		if (this.isLetterFormat) {
			// Letter format priorities (A, B, C)
			Object.entries(LETTER_PRIORITIES).forEach(([key, priority]) => {
				menu.addItem((item) => {
					item.setTitle(priority.text);
					item.onClick(() => {
						this.setPriority(`[#${key}]`);
					});
				});
			});

			// Add option to remove priority
			menu.addItem((item) => {
				item.setTitle("Remove Priority");
				item.onClick(() => {
					this.removePriority();
				});
			});
		} else {
			// Emoji format priorities
			Object.entries(TASK_PRIORITIES).forEach(([key, priority]) => {
				if (key === "none") {
					menu.addItem((item) => {
						item.setTitle("Remove Priority");
						item.onClick(() => {
							this.removePriority();
						});
					});
				} else {
					menu.addItem((item) => {
						item.setTitle(`${priority.emoji} ${priority.text}`);
						item.onClick(() => {
							this.setPriority(priority.emoji);
						});
					});
				}
			});
		}

		menu.showAtMouseEvent(e);
	}

	private setPriority(priority: string) {
		const transaction = this.view.state.update({
			changes: { from: this.from, to: this.to, insert: priority },
			annotations: [priorityChangeAnnotation.of(true)],
		});

		this.view.dispatch(transaction);
	}

	private removePriority() {
		const transaction = this.view.state.update({
			changes: { from: this.from, to: this.to, insert: "" },
			annotations: [priorityChangeAnnotation.of(true)],
		});

		this.view.dispatch(transaction);
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
		private readonly updateThreshold: number = 50;

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
			},
		});

		constructor(view: EditorView) {
			this.view = view;
			this.plugin = plugin;
			this.updateDecorations(view);
		}

		update(update: ViewUpdate): void {
			if (update.docChanged || update.viewportChanged) {
				// Throttle updates to avoid performance issues with large documents
				const now = Date.now();
				if (now - this.lastUpdate > this.updateThreshold) {
					this.lastUpdate = now;
					this.updateDecorations(update.view);
				}
			}
		}

		destroy(): void {
			// No specific cleanup needed
		}

		updateDecorations(view: EditorView, update?: ViewUpdate) {
			// Only apply in live preview mode
			if (!this.isLivePreview(view.state)) return;

			// Since we don't currently have a priorityFormat setting, just use both
			// Keep approach simple for now, using only the emoji priorities
			this.decorations = this.emojiMatch.createDeco(view);

			// If no emoji priorities found, check for letter priorities
			if (this.decorations.size === 0) {
				this.decorations = this.letterMatch.createDeco(view);
			}
		}

		isLivePreview(state: EditorView["state"]): boolean {
			return state.field(editorLivePreviewField);
		}

		shouldRender(
			view: EditorView,
			decorationFrom: number,
			decorationTo: number
		) {
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
		}
	}

	const PriorityViewPluginSpec: PluginSpec<PriorityViewPluginValue> = {
		decorations: (plugin) => {
			return plugin.decorations.update({
				filter: (
					rangeFrom: number,
					rangeTo: number,
					deco: Decoration
				) => {
					const widget = deco.spec?.widget;
					if ((widget as any).error) {
						return false;
					}

					const selection = plugin.view.state.selection;

					for (const range of selection.ranges) {
						if (!(range.to <= rangeFrom || range.from >= rangeTo)) {
							return false;
						}
					}

					return true;
				},
			});
		},
	};

	// Create the plugin with our implementation
	const pluginInstance = ViewPlugin.fromClass(
		PriorityViewPluginValue,
		PriorityViewPluginSpec
	);

	return pluginInstance;
}
