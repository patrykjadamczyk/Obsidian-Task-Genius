import { App, TFile, Notice } from "obsidian";
import { StateField, StateEffect, Facet, Transaction } from "@codemirror/state";
import {
	EditorView,
	showPanel,
	ViewPlugin,
	ViewUpdate,
	Panel,
	keymap,
} from "@codemirror/view";
import { EmbeddableMarkdownEditor } from "./markdownEditor";
import TaskProgressBarPlugin from "../index";
import { formatDate } from "../utils";

// Effect to toggle the quick capture panel
export const toggleQuickCapture = StateEffect.define<boolean>();

// State field to track the visibility of the quick capture panel
export const quickCaptureState = StateField.define<boolean>({
	create: () => false,
	update(value, tr) {
		for (let e of tr.effects) {
			if (e.is(toggleQuickCapture)) {
				value = e.value;
			}
		}
		return value;
	},
	provide: (f) =>
		showPanel.from(f, (on) => (on ? createQuickCapturePanel : null)),
});

// Configuration options for the quick capture panel
export interface QuickCaptureOptions {
	targetFile?: string;
	entryPrefix?: string;
	placeholder?: string;
	appendToFile?: boolean;
	dateFormat?: string;
}

// Facet to provide configuration options for the quick capture
export const quickCaptureOptions = Facet.define<
	QuickCaptureOptions,
	QuickCaptureOptions
>({
	combine: (values) => {
		return {
			targetFile:
				values.find((v) => v.targetFile)?.targetFile ||
				"Quick capture.md",
			entryPrefix: values.find((v) => v.entryPrefix)?.entryPrefix || "- ",
			placeholder:
				values.find((v) => v.placeholder)?.placeholder ||
				"Capture thoughts, tasks, or ideas...",
			appendToFile:
				values.find((v) => v.appendToFile !== undefined)
					?.appendToFile ?? true,
			dateFormat:
				values.find((v) => v.dateFormat)?.dateFormat || "YYYY-MM-DD",
		};
	},
});

// Create the quick capture panel
function createQuickCapturePanel(view: EditorView): Panel {
	const dom = document.createElement("div");
	dom.className = "quick-capture-panel";

	const headerDiv = document.createElement("div");
	headerDiv.className = "quick-capture-header";
	headerDiv.textContent = "Quick Capture";
	dom.appendChild(headerDiv);

	const editorDiv = document.createElement("div");
	editorDiv.className = "quick-capture-editor";
	dom.appendChild(editorDiv);

	const app = view.state.facet(appFacet);
	const plugin = view.state.facet(pluginFacet);
	const options = view.state.facet(quickCaptureOptions);

	let markdownEditor: EmbeddableMarkdownEditor | null = null;

	// Create an instance of the embedded markdown editor
	setTimeout(() => {
		markdownEditor = new EmbeddableMarkdownEditor(app, editorDiv, {
			placeholder: options.placeholder,

			onEnter: (editor, mod, shift) => {
				if (mod) {
					// Submit on Cmd/Ctrl+Enter
					handleSubmit();
					return true;
				}
				// Allow normal Enter key behavior
				return false;
			},

			onEscape: (editor) => {
				// Close the panel on Escape
				view.dispatch({
					effects: toggleQuickCapture.of(false),
				});
			},

			onBlur: (editor) => {
				// Optional: close on blur if desired
				// view.dispatch({
				//   effects: toggleQuickCapture.of(false)
				// });
			},

			onSubmit: (editor) => {
				handleSubmit();
			},

			onPaste: (e, editor) => {
				// Handle paste events if needed
			},

			onChange: (update) => {
				// Handle changes if needed
			},
		});

		// Focus the editor when it's created
		markdownEditor?.editor?.focus();
	}, 10); // Small delay to ensure the DOM is ready

	// Function to handle submission of the captured text
	const handleSubmit = async () => {
		if (!markdownEditor) return;

		const content = markdownEditor.value.trim();
		if (!content) {
			new Notice("Nothing to capture");
			return;
		}

		try {
			await saveCapture(app, content, options, plugin);
			// Clear the editor
			markdownEditor.set("", false);
			// Optionally close the panel after successful capture
			view.dispatch({
				effects: toggleQuickCapture.of(false),
			});

			new Notice("Captured successfully");
		} catch (error) {
			new Notice(`Failed to save: ${error}`);
		}
	};

	// Button container for actions
	const buttonContainer = document.createElement("div");
	buttonContainer.className = "quick-capture-buttons";

	const submitButton = document.createElement("button");
	submitButton.className = "quick-capture-submit";
	submitButton.textContent = "Capture";
	submitButton.addEventListener("click", handleSubmit);
	buttonContainer.appendChild(submitButton);

	const cancelButton = document.createElement("button");
	cancelButton.className = "quick-capture-cancel";
	cancelButton.textContent = "Cancel";
	cancelButton.addEventListener("click", () => {
		view.dispatch({
			effects: toggleQuickCapture.of(false),
		});
	});
	buttonContainer.appendChild(cancelButton);

	dom.appendChild(buttonContainer);

	return {
		dom,
		top: true,
		// Update method gets called on every editor update
		update: (update: ViewUpdate) => {
			// Implement if needed to update panel content based on editor state
		},
		// Destroy method gets called when the panel is removed
		destroy: () => {
			markdownEditor?.destroy();
			markdownEditor = null;
		},
	};
}

// Save the captured content to the target file
async function saveCapture(
	app: App,
	content: string,
	options: QuickCaptureOptions,
	plugin: TaskProgressBarPlugin
): Promise<void> {
	const { targetFile, entryPrefix, appendToFile, dateFormat } = options;

	// Format date if needed
	const formattedDate = formatDate(new Date(), dateFormat || "YYYY-MM-DD");

	// Format the content to be saved (with prefix and possibly date)
	let formattedContent = (entryPrefix || "- ") + content;

	// Check if target file exists, create if not
	const filePath = targetFile || "Quick Capture.md";
	let file = app.vault.getAbstractFileByPath(filePath);

	if (!file) {
		// Create directory structure if needed
		const pathParts = filePath.split("/");
		if (pathParts.length > 1) {
			const dirPath = pathParts.slice(0, -1).join("/");
			try {
				await app.vault.createFolder(dirPath);
			} catch (e) {
				// Directory might already exist, ignore error
			}
		}

		// Create the file
		file = await app.vault.create(
			filePath,
			appendToFile
				? `# Quick Capture\n\n${formattedContent}`
				: formattedContent
		);
	} else if (file instanceof TFile) {
		// Append or replace content in existing file
		if (appendToFile) {
			const existingContent = await app.vault.read(file);
			// Add a newline before the new content if needed
			const separator = existingContent.endsWith("\n") ? "" : "\n";
			await app.vault.modify(
				file,
				existingContent + separator + formattedContent
			);
		} else {
			await app.vault.modify(file, formattedContent);
		}
	} else {
		throw new Error("Target is not a file");
	}

	return;
}

// Facets to make app and plugin instances available to the panel
export const appFacet = Facet.define<App, App>({
	combine: (values) => values[0],
});

export const pluginFacet = Facet.define<
	TaskProgressBarPlugin,
	TaskProgressBarPlugin
>({
	combine: (values) => values[0],
});

// Key binding to toggle the quick capture panel
const quickCaptureKeymap = [
	{
		key: "Alt-c",
		run: (view: EditorView) => {
			view.dispatch({
				effects: toggleQuickCapture.of(
					!view.state.field(quickCaptureState)
				),
			});
			return true;
		},
	},
];

// Theme for styling the quick capture panel
const quickCaptureTheme = EditorView.baseTheme({
	".quick-capture-panel": {
		padding: "8px",
		backgroundColor: "var(--background-primary)",
		borderTop: "1px solid var(--background-modifier-border)",
		display: "flex",
		flexDirection: "column",
		gap: "8px",
	},
	".quick-capture-header": {
		fontSize: "16px",
		fontWeight: "bold",
		color: "var(--text-normal)",
	},
	".quick-capture-editor": {
		minHeight: "100px",
		backgroundColor: "var(--background-primary)",
	},
	".quick-capture-buttons": {
		display: "flex",
		justifyContent: "flex-end",
		gap: "8px",
	},
	".quick-capture-submit, .quick-capture-cancel": {
		padding: "6px 12px",
		borderRadius: "4px",
		cursor: "pointer",
	},
	".quick-capture-submit": {
		backgroundColor: "var(--interactive-accent)",
		color: "var(--text-on-accent)",
	},
	".quick-capture-cancel": {
		backgroundColor: "var(--background-modifier-border)",
		color: "var(--text-normal)",
	},
});

// Create the extension to enable quick capture in an editor
export function quickCaptureExtension(app: App, plugin: TaskProgressBarPlugin) {
	return [
		quickCaptureState,
		quickCaptureOptions.of({
			targetFile:
				plugin.settings.quickCapture?.targetFile || "Quick Capture.md",
			entryPrefix: plugin.settings.quickCapture?.entryPrefix || "- ",
			placeholder:
				plugin.settings.quickCapture?.placeholder ||
				"Capture thoughts, tasks, or ideas...",
			appendToFile: plugin.settings.quickCapture?.appendToFile ?? true,
			dateFormat:
				plugin.settings.quickCapture?.dateFormat || "YYYY-MM-DD",
		}),
		appFacet.of(app),
		pluginFacet.of(plugin),
		keymap.of(quickCaptureKeymap),
		quickCaptureTheme,
	];
}
