/**
 * Task Details Modal Component
 * Used in mobile environments to display the full task details and editing interface.
 */

import { App, Modal, TFile, MarkdownView } from "obsidian";
import { Task } from "../../utils/types/TaskIndex";
import TaskProgressBarPlugin from "../../index";
import { TaskMetadataEditor } from "./MetadataEditor";
import { t } from "../../translations/helper";

export class TaskDetailsModal extends Modal {
	private task: Task;
	private plugin: TaskProgressBarPlugin;
	private metadataEditor: TaskMetadataEditor;
	private onTaskUpdated: (task: Task) => Promise<void>;

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin,
		task: Task,
		onTaskUpdated?: (task: Task) => Promise<void>
	) {
		super(app);
		this.task = task;
		this.plugin = plugin;
		this.onTaskUpdated = onTaskUpdated || (async () => {});

		// Set modal style
		this.modalEl.addClass("task-details-modal");
		this.titleEl.setText(t("Edit Task"));
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Create metadata editor, use full mode
		this.metadataEditor = new TaskMetadataEditor(
			contentEl,
			this.app,
			this.plugin,
			false // Full mode, not compact mode
		);

		// Initialize editor and display task
		this.metadataEditor.onload();
		this.metadataEditor.showTask(this.task);

		// Listen for metadata change events
		this.metadataEditor.onMetadataChange = async (event) => {
			// Handle special operations
			if (event.field === "save") {
				await this.onTaskUpdated(this.task);
				this.close();
				return;
			}

			if (event.field === "editInFile") {
				this.navigateToTaskInFile();
				this.close();
				return;
			}

			// Update task data
			this.updateTaskField(event.field, event.value);
		};
	}

	onClose() {
		const { contentEl } = this;
		if (this.metadataEditor) {
			this.metadataEditor.onunload();
		}
		contentEl.empty();
	}

	/**
	 * Updates a task field.
	 */
	private updateTaskField(field: string, value: any) {
		if (field in this.task) {
			(this.task as any)[field] = value;
		}
	}

	/**
	 * Navigates to the task's location in the file.
	 */
	private async navigateToTaskInFile() {
		const { filePath, line } = this.task;
		if (!filePath) return;

		// Open the file
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return;

		const leaf = this.app.workspace.getLeaf();
		await leaf.openFile(file);

		// If there's a line number, navigate to that line
		if (line !== undefined) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.editor) {
				const pos = { line: line, ch: 0 };
				view.editor.setCursor(pos);
				view.editor.scrollIntoView({ from: pos, to: pos }, true);
			}
		}
	}
}
