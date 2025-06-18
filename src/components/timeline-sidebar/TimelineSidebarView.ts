import {
	ItemView,
	WorkspaceLeaf,
	setIcon,
	moment,
	Component,
	debounce,
	ButtonComponent,
	Platform,
	TFile,
} from "obsidian";
import { Task } from "../../types/task";
import { t } from "../../translations/helper";
import TaskProgressBarPlugin from "../../index";
import { QuickCaptureModal } from "../QuickCaptureModal";
import {
	createEmbeddableMarkdownEditor,
	EmbeddableMarkdownEditor,
} from "../../editor-ext/markdownEditor";
import { saveCapture } from "../../utils/fileUtils";
import "../../styles/timeline-sidebar.css";

export const TIMELINE_SIDEBAR_VIEW_TYPE = "timeline-sidebar-view";

interface TimelineEvent {
	id: string;
	content: string;
	time: Date;
	type: "task" | "event";
	status?: string;
	task?: Task;
	isToday?: boolean;
}

export class TimelineSidebarView extends ItemView {
	private plugin: TaskProgressBarPlugin;
	public containerEl: HTMLElement;
	private timelineContainerEl: HTMLElement;
	private quickInputContainerEl: HTMLElement;
	private markdownEditor: EmbeddableMarkdownEditor | null = null;
	private currentDate: moment.Moment = moment();
	private events: TimelineEvent[] = [];
	private isAutoScrolling: boolean = false;

	// Debounced methods
	private debouncedRender = debounce(this.renderTimeline.bind(this), 300);
	private debouncedScroll = debounce(this.handleScroll.bind(this), 100);

	constructor(leaf: WorkspaceLeaf, plugin: TaskProgressBarPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TIMELINE_SIDEBAR_VIEW_TYPE;
	}

	getDisplayText(): string {
		return t("Timeline");
	}

	getIcon(): string {
		return "calendar-clock";
	}

	async onOpen(): Promise<void> {
		this.containerEl = this.contentEl;
		this.containerEl.empty();
		this.containerEl.addClass("timeline-sidebar-container");

		this.createHeader();
		this.createTimelineArea();
		this.createQuickInputArea();

		// Load initial data
		await this.loadEvents();
		this.renderTimeline();

		// Auto-scroll to today on open
		setTimeout(() => {
			this.scrollToToday();
		}, 100);

		// Register for task updates
		this.registerEvent(
			this.plugin.app.vault.on("modify", () => {
				this.debouncedRender();
			})
		);
	}

	onClose(): Promise<void> {
		if (this.markdownEditor) {
			this.markdownEditor.destroy();
			this.markdownEditor = null;
		}
		return Promise.resolve();
	}

	private createHeader(): void {
		const headerEl = this.containerEl.createDiv("timeline-header");

		// Title
		const titleEl = headerEl.createDiv("timeline-title");
		titleEl.setText(t("Timeline"));

		// Controls
		const controlsEl = headerEl.createDiv("timeline-controls");

		// Today button
		const todayBtn = controlsEl.createDiv(
			"timeline-btn timeline-today-btn"
		);
		setIcon(todayBtn, "calendar");
		todayBtn.setAttribute("aria-label", t("Go to today"));
		this.registerDomEvent(todayBtn, "click", () => {
			this.scrollToToday();
		});

		// Refresh button
		const refreshBtn = controlsEl.createDiv(
			"timeline-btn timeline-refresh-btn"
		);
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.setAttribute("aria-label", t("Refresh"));
		this.registerDomEvent(refreshBtn, "click", () => {
			this.loadEvents().then(() => this.renderTimeline());
		});

		// Focus mode toggle
		const focusBtn = controlsEl.createDiv(
			"timeline-btn timeline-focus-btn"
		);
		setIcon(focusBtn, "focus");
		focusBtn.setAttribute("aria-label", t("Focus on today"));
		this.registerDomEvent(focusBtn, "click", () => {
			this.toggleFocusMode();
		});
	}

	private createTimelineArea(): void {
		this.timelineContainerEl =
			this.containerEl.createDiv("timeline-content");

		// Add scroll listener for infinite scroll
		this.registerDomEvent(this.timelineContainerEl, "scroll", () => {
			this.debouncedScroll();
		});
	}

	private createQuickInputArea(): void {
		this.quickInputContainerEl = this.containerEl.createDiv(
			"timeline-quick-input"
		);

		// Input header with target info
		const inputHeaderEl =
			this.quickInputContainerEl.createDiv("quick-input-header");

		const headerTitle = inputHeaderEl.createDiv("quick-input-title");
		headerTitle.setText(t("Quick Capture"));

		const targetInfo = inputHeaderEl.createDiv("quick-input-target-info");
		this.updateTargetInfo(targetInfo);

		// Editor container
		const editorContainer =
			this.quickInputContainerEl.createDiv("quick-input-editor");

		// Initialize markdown editor
		setTimeout(() => {
			this.markdownEditor = createEmbeddableMarkdownEditor(
				this.app,
				editorContainer,
				{
					placeholder: t("What's on your mind?"),
					onEnter: (editor, mod, shift) => {
						if (mod) {
							// Submit on Cmd/Ctrl+Enter
							this.handleQuickCapture();
							return true;
						}
						return false;
					},
					onEscape: () => {
						// Clear input on Escape
						if (this.markdownEditor) {
							this.markdownEditor.set("", false);
						}
					},
					onChange: () => {
						// Auto-resize or other behaviors
					},
				}
			);

			// Focus the editor
			this.markdownEditor?.editor?.focus();
		}, 50);

		// Action buttons
		const actionsEl = this.quickInputContainerEl.createDiv(
			"quick-input-actions"
		);

		const captureBtn = actionsEl.createEl("button", {
			cls: "quick-capture-btn mod-cta",
			text: t("Capture"),
		});
		this.registerDomEvent(captureBtn, "click", () => {
			this.handleQuickCapture();
		});

		const fullModalBtn = actionsEl.createEl("button", {
			cls: "quick-modal-btn",
			text: t("More options"),
		});
		this.registerDomEvent(fullModalBtn, "click", () => {
			new QuickCaptureModal(this.app, this.plugin, {}, true).open();
		});
	}

	private async loadEvents(): Promise<void> {
		// Get tasks from the plugin's task manager
		const allTasks = await this.plugin.taskManager.getAllTasks();

		this.events = [];

		// Convert tasks to timeline events
		allTasks.forEach((task) => {
			const dates = this.extractDatesFromTask(task);
			dates.forEach(({ date, type }) => {
				const event: TimelineEvent = {
					id: `${task.id}-${type}`,
					content: task.content,
					time: date,
					type: "task",
					status: task.status,
					task: task,
					isToday: moment(date).isSame(moment(), "day"),
				};
				this.events.push(event);
			});
		});

		// Sort events by time (newest first for timeline display)
		this.events.sort((a, b) => b.time.getTime() - a.time.getTime());
	}

	private extractDatesFromTask(
		task: Task
	): Array<{ date: Date; type: string }> {
		const dates: Array<{ date: Date; type: string }> = [];

		if (task.metadata.dueDate) {
			dates.push({ date: new Date(task.metadata.dueDate), type: "due" });
		}
		if (task.metadata.scheduledDate) {
			dates.push({
				date: new Date(task.metadata.scheduledDate),
				type: "scheduled",
			});
		}
		if (task.metadata.startDate) {
			dates.push({
				date: new Date(task.metadata.startDate),
				type: "start",
			});
		}
		if (task.metadata.completedDate) {
			dates.push({
				date: new Date(task.metadata.completedDate),
				type: "completed",
			});
		}

		return dates;
	}

	private renderTimeline(): void {
		this.timelineContainerEl.empty();

		if (this.events.length === 0) {
			const emptyEl =
				this.timelineContainerEl.createDiv("timeline-empty");
			emptyEl.setText(t("No events to display"));
			return;
		}

		// Group events by date
		const eventsByDate = this.groupEventsByDate();

		// Render each date group
		for (const [dateStr, dayEvents] of eventsByDate) {
			this.renderDateGroup(dateStr, dayEvents);
		}
	}

	private groupEventsByDate(): Map<string, TimelineEvent[]> {
		const grouped = new Map<string, TimelineEvent[]>();

		this.events.forEach((event) => {
			const dateKey = moment(event.time).format("YYYY-MM-DD");
			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, []);
			}
			grouped.get(dateKey)!.push(event);
		});

		return grouped;
	}

	private renderDateGroup(dateStr: string, events: TimelineEvent[]): void {
		const dateGroupEl = this.timelineContainerEl.createDiv(
			"timeline-date-group"
		);
		const dateMoment = moment(dateStr);
		const isToday = dateMoment.isSame(moment(), "day");
		const isYesterday = dateMoment.isSame(
			moment().subtract(1, "day"),
			"day"
		);
		const isTomorrow = dateMoment.isSame(moment().add(1, "day"), "day");

		if (isToday) {
			dateGroupEl.addClass("is-today");
		}

		// Date header
		const dateHeaderEl = dateGroupEl.createDiv("timeline-date-header");

		let displayDate = dateMoment.format("MMM DD, YYYY");
		if (isToday) {
			displayDate = t("Today");
		} else if (isYesterday) {
			displayDate = t("Yesterday");
		} else if (isTomorrow) {
			displayDate = t("Tomorrow");
		}

		dateHeaderEl.setText(displayDate);

		// Add relative time
		const relativeEl = dateHeaderEl.createSpan("timeline-date-relative");
		if (!isToday && !isYesterday && !isTomorrow) {
			relativeEl.setText(dateMoment.fromNow());
		}

		// Events list
		const eventsListEl = dateGroupEl.createDiv("timeline-events-list");

		events.forEach((event) => {
			this.renderEvent(eventsListEl, event);
		});
	}

	private renderEvent(containerEl: HTMLElement, event: TimelineEvent): void {
		const eventEl = containerEl.createDiv("timeline-event");

		if (event.task?.completed) {
			eventEl.addClass("is-completed");
		}

		// Event time
		const timeEl = eventEl.createDiv("timeline-event-time");
		timeEl.setText(moment(event.time).format("HH:mm"));

		// Event content
		const contentEl = eventEl.createDiv("timeline-event-content");

		// Task checkbox if it's a task
		if (event.task) {
			const checkboxEl = contentEl.createDiv("timeline-event-checkbox");
			const checkbox = checkboxEl.createEl("input", {
				type: "checkbox",
				cls: "task-list-item-checkbox",
			});
			checkbox.checked = event.task.completed;

			this.registerDomEvent(checkbox, "change", async () => {
				if (event.task) {
					await this.toggleTaskCompletion(event.task);
					this.debouncedRender();
				}
			});
		}

		// Event text with icon
		const textEl = contentEl.createDiv("timeline-event-text");

		// Add icon based on event type
		const iconEl = textEl.createSpan("timeline-event-icon");
		if (event.task) {
			if (event.task.completed) {
				iconEl.setText("✅");
			} else {
				iconEl.setText("📝");
			}
		} else {
			iconEl.setText("📅");
		}

		const contentSpan = textEl.createSpan("timeline-event-content-text");
		contentSpan.setText(event.content);

		// Event actions
		const actionsEl = eventEl.createDiv("timeline-event-actions");

		if (event.task) {
			// Go to task
			const gotoBtn = actionsEl.createDiv("timeline-event-action");
			setIcon(gotoBtn, "external-link");
			gotoBtn.setAttribute("aria-label", t("Go to task"));
			this.registerDomEvent(gotoBtn, "click", () => {
				this.goToTask(event.task!);
			});
		}

		// Click to focus
		this.registerDomEvent(eventEl, "click", () => {
			if (event.task) {
				this.goToTask(event.task);
			}
		});
	}

	private async goToTask(task: Task): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(task.filePath);
		if (!(file instanceof TFile)) return;

		// Check if it's a canvas file
		if ((task.metadata as any).sourceType === "canvas") {
			// For canvas files, open directly
			const leaf = this.app.workspace.getLeaf("tab");
			await leaf.openFile(file);
			this.app.workspace.setActiveLeaf(leaf, { focus: true });
			return;
		}

		// For markdown files, prefer activating existing leaf if file is open
		const existingLeaf = this.app.workspace
			.getLeavesOfType("markdown")
			.find(
				(leaf) => (leaf.view as any).file === file // Type assertion needed here
			);

		const leafToUse = existingLeaf || this.app.workspace.getLeaf("tab"); // Open in new tab if not open

		await leafToUse.openFile(file, {
			active: true, // Ensure the leaf becomes active
			eState: {
				line: task.line,
			},
		});
		// Focus the editor after opening
		this.app.workspace.setActiveLeaf(leafToUse, { focus: true });
	}

	private async handleQuickCapture(): Promise<void> {
		if (!this.markdownEditor) return;

		const content = this.markdownEditor.value.trim();
		if (!content) return;

		try {
			// Use the plugin's quick capture settings
			const captureOptions = this.plugin.settings.quickCapture;
			await saveCapture(this.app, content, captureOptions);

			// Clear the input
			this.markdownEditor.set("", false);

			// Refresh timeline
			await this.loadEvents();
			this.renderTimeline();

			// Focus back to input
			this.markdownEditor.editor?.focus();
		} catch (error) {
			console.error("Failed to capture:", error);
		}
	}

	private scrollToToday(): void {
		const todayEl = this.timelineContainerEl.querySelector(
			".timeline-date-group.is-today"
		);
		if (todayEl) {
			this.isAutoScrolling = true;
			todayEl.scrollIntoView({ behavior: "smooth", block: "start" });
			setTimeout(() => {
				this.isAutoScrolling = false;
			}, 1000);
		}
	}

	private toggleFocusMode(): void {
		this.timelineContainerEl.toggleClass(
			"focus-mode",
			!this.timelineContainerEl.hasClass("focus-mode")
		);
		// In focus mode, only show today's events
		// Implementation depends on specific requirements
	}

	private handleScroll(): void {
		if (this.isAutoScrolling) return;

		// Implement infinite scroll or lazy loading if needed
		const { scrollTop, scrollHeight, clientHeight } =
			this.timelineContainerEl;

		// Load more events when near bottom
		if (scrollTop + clientHeight >= scrollHeight - 100) {
			// Load more historical events
			this.loadMoreEvents();
		}
	}

	private async loadMoreEvents(): Promise<void> {
		// Implement loading more historical events
		// This could involve loading older tasks or extending the date range
	}

	private async toggleTaskCompletion(task: Task): Promise<void> {
		const updatedTask = { ...task, completed: !task.completed };

		if (updatedTask.completed) {
			updatedTask.metadata.completedDate = Date.now();
			const completedMark = (
				this.plugin.settings.taskStatuses.completed || "x"
			).split("|")[0];
			if (updatedTask.status !== completedMark) {
				updatedTask.status = completedMark;
			}
		} else {
			updatedTask.metadata.completedDate = undefined;
			const notStartedMark =
				this.plugin.settings.taskStatuses.notStarted || " ";
			if (updatedTask.status.toLowerCase() === "x") {
				updatedTask.status = notStartedMark;
			}
		}

		const taskManager = this.plugin.taskManager;
		if (!taskManager) return;

		await taskManager.updateTask(updatedTask);
	}

	private updateTargetInfo(targetInfoEl: HTMLElement): void {
		targetInfoEl.empty();

		const settings = this.plugin.settings.quickCapture;
		let targetText = "";

		if (settings.targetType === "daily-note") {
			const dateStr = moment().format(settings.dailyNoteSettings.format);
			const fileName = `${dateStr}.md`;
			const fullPath = settings.dailyNoteSettings.folder
				? `${settings.dailyNoteSettings.folder}/${fileName}`
				: fileName;
			targetText = `${t("to")} ${fullPath}`;
		} else {
			targetText = `${t("to")} ${
				settings.targetFile || "Quick Capture.md"
			}`;
		}

		if (settings.targetHeading) {
			targetText += ` → ${settings.targetHeading}`;
		}

		targetInfoEl.setText(targetText);
		targetInfoEl.setAttribute("title", targetText);
	}
}
