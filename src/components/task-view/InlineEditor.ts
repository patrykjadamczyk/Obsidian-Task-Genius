import { App, Component, debounce, setIcon, Menu } from "obsidian";
import { Task } from "../../types/task";
import TaskProgressBarPlugin from "../../index";
import { ContextSuggest, ProjectSuggest, TagSuggest } from "../AutoComplete";
import "../../styles/inline-editor.css";

export interface InlineEditorOptions {
	onTaskUpdate: (task: Task, updatedTask: Task) => Promise<void>;
	onContentEditFinished?: (targetEl: HTMLElement) => void;
	onCancel?: () => void;
}

export class InlineEditor extends Component {
	private containerEl: HTMLElement;
	private task: Task;
	private options: InlineEditorOptions;
	private isEditing: boolean = false;
	private originalTask: Task;

	// Edit elements
	private contentInput: HTMLTextAreaElement;
	private projectInput: HTMLInputElement;
	private tagsInput: HTMLInputElement;
	private contextInput: HTMLInputElement;
	private dueDateInput: HTMLInputElement;
	private startDateInput: HTMLInputElement;
	private scheduledDateInput: HTMLInputElement;
	private prioritySelect: HTMLSelectElement;
	private recurrenceInput: HTMLInputElement;

	// Debounced save function
	private debouncedSave: () => void;

	constructor(
		private app: App,
		private plugin: TaskProgressBarPlugin,
		task: Task,
		options: InlineEditorOptions
	) {
		super();
		this.task = { ...task };
		this.originalTask = { ...task };
		this.options = options;

		// Create debounced save function
		this.debouncedSave = debounce(this.saveTask.bind(this), 500);
	}

	onload() {
		this.containerEl = createDiv({ cls: "inline-editor" });
	}

	/**
	 * Show inline editor for task content
	 */
	public showContentEditor(targetEl: HTMLElement): void {
		this.isEditing = true;

		// Store original content before clearing
		const originalContent = targetEl.innerHTML;
		targetEl.empty();

		// Create content editor
		this.contentInput = targetEl.createEl("textarea", {
			cls: "inline-content-editor",
			value: this.task.content,
		});

		// Auto-resize textarea
		this.contentInput.style.height = "auto";
		this.contentInput.style.height = this.contentInput.scrollHeight + "px";

		// Focus and select all text
		this.contentInput.focus();
		this.contentInput.select();

		// Register events
		this.registerDomEvent(this.contentInput, "input", () => {
			// Auto-resize
			this.contentInput.style.height = "auto";
			this.contentInput.style.height =
				this.contentInput.scrollHeight + "px";

			// Update task and save
			this.task.content = this.contentInput.value;
			this.debouncedSave();
		});

		this.registerDomEvent(this.contentInput, "blur", () => {
			this.finishContentEdit(targetEl);
		});

		this.registerDomEvent(this.contentInput, "keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.contentInput.blur();
			} else if (e.key === "Escape") {
				e.preventDefault();
				this.cancelContentEdit(targetEl);
			}
		});
	}

	/**
	 * Show inline editor for metadata field
	 */
	public showMetadataEditor(
		targetEl: HTMLElement,
		fieldType:
			| "project"
			| "tags"
			| "context"
			| "dueDate"
			| "startDate"
			| "scheduledDate"
			| "priority"
			| "recurrence",
		currentValue?: string
	): void {
		this.isEditing = true;
		targetEl.empty();

		const editorContainer = targetEl.createDiv({
			cls: "inline-metadata-editor",
		});

		switch (fieldType) {
			case "project":
				this.createProjectEditor(editorContainer, currentValue);
				break;
			case "tags":
				this.createTagsEditor(editorContainer, currentValue);
				break;
			case "context":
				this.createContextEditor(editorContainer, currentValue);
				break;
			case "dueDate":
			case "startDate":
			case "scheduledDate":
				this.createDateEditor(editorContainer, fieldType, currentValue);
				break;
			case "priority":
				this.createPriorityEditor(editorContainer, currentValue);
				break;
			case "recurrence":
				this.createRecurrenceEditor(editorContainer, currentValue);
				break;
		}
	}

	/**
	 * Show add metadata button
	 */
	public showAddMetadataButton(targetEl: HTMLElement): void {
		const addBtn = targetEl.createEl("button", {
			cls: "add-metadata-btn",
			attr: { "aria-label": "Add metadata" },
		});
		setIcon(addBtn, "plus");

		this.registerDomEvent(addBtn, "click", (e) => {
			e.stopPropagation();
			this.showMetadataMenu(addBtn);
		});
	}

	private createProjectEditor(
		container: HTMLElement,
		currentValue?: string
	): void {
		this.projectInput = container.createEl("input", {
			cls: "inline-project-input",
			type: "text",
			value: currentValue || "",
			placeholder: "Enter project name...",
		});

		// Add autocomplete
		new ProjectSuggest(this.app, this.projectInput, this.plugin);

		this.setupInputEvents(this.projectInput, (value) => {
			this.task.project = value || undefined;
		});
	}

	private createTagsEditor(
		container: HTMLElement,
		currentValue?: string
	): void {
		this.tagsInput = container.createEl("input", {
			cls: "inline-tags-input",
			type: "text",
			value: currentValue || "",
			placeholder: "Enter tags (comma separated)...",
		});

		// Add autocomplete
		new TagSuggest(this.app, this.tagsInput, this.plugin);

		this.setupInputEvents(this.tagsInput, (value) => {
			this.task.tags = value
				? value
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag)
				: [];
		});
	}

	private createContextEditor(
		container: HTMLElement,
		currentValue?: string
	): void {
		this.contextInput = container.createEl("input", {
			cls: "inline-context-input",
			type: "text",
			value: currentValue || "",
			placeholder: "Enter context...",
		});

		// Add autocomplete
		new ContextSuggest(this.app, this.contextInput, this.plugin);

		this.setupInputEvents(this.contextInput, (value) => {
			this.task.context = value || undefined;
		});
	}

	private createDateEditor(
		container: HTMLElement,
		fieldType: "dueDate" | "startDate" | "scheduledDate",
		currentValue?: string
	): void {
		const dateInput = container.createEl("input", {
			cls: "inline-date-input",
			type: "date",
			value: currentValue || "",
		});

		this.setupInputEvents(dateInput, (value) => {
			if (value) {
				const [year, month, day] = value.split("-").map(Number);
				const dateValue = new Date(year, month - 1, day).getTime();
				this.task[fieldType] = dateValue;
			} else {
				this.task[fieldType] = undefined;
			}
		});
	}

	private createPriorityEditor(
		container: HTMLElement,
		currentValue?: string
	): void {
		this.prioritySelect = container.createEl("select", {
			cls: "inline-priority-select",
		});

		const options = [
			{ value: "", text: "None" },
			{ value: "1", text: "⏬ Lowest" },
			{ value: "2", text: "🔽 Low" },
			{ value: "3", text: "🔼 Medium" },
			{ value: "4", text: "⏫ High" },
			{ value: "5", text: "🔺 Highest" },
		];

		options.forEach((option) => {
			const optionEl = this.prioritySelect.createEl("option", {
				value: option.value,
				text: option.text,
			});
			if (option.value === currentValue) {
				optionEl.selected = true;
			}
		});

		this.setupInputEvents(this.prioritySelect, (value) => {
			this.task.priority = value ? parseInt(value) : undefined;
		});
	}

	private createRecurrenceEditor(
		container: HTMLElement,
		currentValue?: string
	): void {
		this.recurrenceInput = container.createEl("input", {
			cls: "inline-recurrence-input",
			type: "text",
			value: currentValue || "",
			placeholder: "e.g. every day, every 2 weeks",
		});

		this.setupInputEvents(this.recurrenceInput, (value) => {
			this.task.recurrence = value || undefined;
		});
	}

	private setupInputEvents(
		input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
		updateCallback: (value: string) => void
	): void {
		// Focus the input
		input.focus();
		if (input instanceof HTMLInputElement && input.type === "text") {
			input.select();
		}

		// Register events
		this.registerDomEvent(input, "input", () => {
			updateCallback(input.value);
			this.debouncedSave();
		});

		this.registerDomEvent(input, "blur", () => {
			this.finishEdit();
		});

		this.registerDomEvent(input, "keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				input.blur();
			} else if (e.key === "Escape") {
				e.preventDefault();
				this.cancelEdit();
			}
		});
	}

	private showMetadataMenu(buttonEl: HTMLElement): void {
		const menu = new Menu();

		const availableFields = [
			{ key: "project", label: "Project", icon: "folder" },
			{ key: "tags", label: "Tags", icon: "tag" },
			{ key: "context", label: "Context", icon: "at-sign" },
			{ key: "dueDate", label: "Due Date", icon: "calendar" },
			{ key: "startDate", label: "Start Date", icon: "play" },
			{ key: "scheduledDate", label: "Scheduled Date", icon: "clock" },
			{ key: "priority", label: "Priority", icon: "alert-triangle" },
			{ key: "recurrence", label: "Recurrence", icon: "repeat" },
		];

		availableFields.forEach((field) => {
			menu.addItem((item) => {
				item.setTitle(field.label)
					.setIcon(field.icon)
					.onClick(() => {
						this.showMetadataEditor(
							buttonEl.parentElement!,
							field.key as any
						);
					});
			});
		});

		menu.showAtPosition({
			x: buttonEl.getBoundingClientRect().left,
			y: buttonEl.getBoundingClientRect().bottom,
		});
	}

	private async saveTask(): Promise<void> {
		if (!this.isEditing) return;

		try {
			await this.options.onTaskUpdate(this.originalTask, this.task);
			this.originalTask = { ...this.task };
		} catch (error) {
			console.error("Failed to save task:", error);
			// Revert changes on error
			this.task = { ...this.originalTask };
		}
	}

	private finishContentEdit(targetEl: HTMLElement): void {
		this.isEditing = false;
		// Notify parent component to restore content display
		if (this.options.onContentEditFinished) {
			this.options.onContentEditFinished(targetEl);
		} else {
			// Fallback: just set text content
			targetEl.textContent = this.task.content;
		}
	}

	private cancelContentEdit(targetEl: HTMLElement): void {
		this.isEditing = false;
		// Revert changes
		this.task.content = this.originalTask.content;
		// Notify parent component to restore content display
		if (this.options.onContentEditFinished) {
			this.options.onContentEditFinished(targetEl);
		} else {
			// Fallback: just set text content
			targetEl.textContent = this.task.content;
		}
	}

	private finishEdit(): void {
		this.isEditing = false;
		// The parent component should handle restoring the display
	}

	private cancelEdit(): void {
		this.isEditing = false;
		// Revert all changes
		this.task = { ...this.originalTask };
		// The parent component should handle restoring the display
	}

	public isCurrentlyEditing(): boolean {
		return this.isEditing;
	}

	public getUpdatedTask(): Task {
		return this.task;
	}

	onunload() {
		if (this.containerEl) {
			this.containerEl.remove();
		}
	}
}
