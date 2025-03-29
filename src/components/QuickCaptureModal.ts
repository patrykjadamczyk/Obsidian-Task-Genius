import { App, Modal, Setting, TFile, Notice } from "obsidian";
import { EmbeddableMarkdownEditor } from "../editor-ext/markdownEditor";
import TaskProgressBarPlugin from "../index";
import { formatDate } from "../utils";

export class QuickCaptureModal extends Modal {
	plugin: TaskProgressBarPlugin;
	markdownEditor: EmbeddableMarkdownEditor | null = null;
	capturedContent: string = "";

	constructor(app: App, plugin: TaskProgressBarPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;

		// Modal title
		contentEl.createEl("h2", { text: "Quick Capture" });

		// Create container for the editor
		const editorContainer = contentEl.createDiv({
			cls: "quick-capture-modal-editor",
		});

		// Create the markdown editor with our EmbeddableMarkdownEditor
		setTimeout(() => {
			this.markdownEditor = new EmbeddableMarkdownEditor(
				this.app,
				editorContainer,
				{
					placeholder: this.plugin.settings.quickCapture.placeholder,

					onEnter: (editor, mod, shift) => {
						if (mod) {
							// Submit on Cmd/Ctrl+Enter
							this.handleSubmit();
							return true;
						}
						// Allow normal Enter key behavior
						return false;
					},

					onEscape: (editor) => {
						// Close the modal on Escape
						this.close();
					},

					onBlur: (editor) => {
						// Optional: auto-save content on blur
						this.capturedContent = editor.value;
					},

					onSubmit: (editor) => {
						this.handleSubmit();
					},

					onPaste: (e, editor) => {
						// Handle paste events if needed
					},

					onChange: (update) => {
						// Handle changes if needed
						this.capturedContent = this.markdownEditor?.value || "";
					},
				}
			);

			// Focus the editor when it's created
			this.markdownEditor?.editor?.focus();
		}, 50);

		// Create button container
		const buttonContainer = contentEl.createDiv({
			cls: "quick-capture-modal-buttons",
		});

		// Create the buttons
		const submitButton = buttonContainer.createEl("button", {
			text: "Capture",
			cls: "mod-cta",
		});
		submitButton.addEventListener("click", () => this.handleSubmit());

		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
		});
		cancelButton.addEventListener("click", () => this.close());

		// Add some CSS
		contentEl.addClass("quick-capture-modal");
		contentEl.createEl("style", {
			text: `
                .quick-capture-modal {
                    padding: 20px;
                }
                .quick-capture-modal-editor {
                    min-height: 150px;
                    margin-bottom: 20px;
                }
                .quick-capture-modal-buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }
            `,
		});
	}

	async handleSubmit() {
		const content =
			this.capturedContent.trim() ||
			this.markdownEditor?.value.trim() ||
			"";

		if (!content) {
			new Notice("Nothing to capture");
			return;
		}

		try {
			await this.saveCapture(content);
			new Notice("Captured successfully");
			this.close();
		} catch (error) {
			new Notice(`Failed to save: ${error}`);
		}
	}

	async saveCapture(content: string): Promise<void> {
		const settings = this.plugin.settings.quickCapture;
		const { targetFile, entryPrefix, appendToFile, dateFormat } = settings;

		// Format the content to be saved
		let formattedContent = entryPrefix + content;

		// Check if target file exists, create if not
		const filePath = targetFile || "Quick Capture.md";
		let file = this.app.vault.getAbstractFileByPath(filePath);

		if (!file) {
			// Create directory structure if needed
			const pathParts = filePath.split("/");
			if (pathParts.length > 1) {
				const dirPath = pathParts.slice(0, -1).join("/");
				try {
					await this.app.vault.createFolder(dirPath);
				} catch (e) {
					// Directory might already exist, ignore error
				}
			}

			// Create the file
			file = await this.app.vault.create(
				filePath,
				appendToFile
					? `# Quick Capture\n\n${formattedContent}`
					: formattedContent
			);
		} else if (file instanceof TFile) {
			// Append or replace content in existing file
			if (appendToFile) {
				const existingContent = await this.app.vault.read(file);
				// Add a newline before the new content if needed
				const separator = existingContent.endsWith("\n") ? "" : "\n";
				await this.app.vault.modify(
					file,
					existingContent + separator + formattedContent
				);
			} else {
				await this.app.vault.modify(file, formattedContent);
			}
		} else {
			throw new Error("Target is not a file");
		}

		return;
	}

	onClose() {
		const { contentEl } = this;

		// Clean up the markdown editor
		if (this.markdownEditor) {
			this.markdownEditor.destroy();
			this.markdownEditor = null;
		}

		// Clear the content
		contentEl.empty();
	}
}
