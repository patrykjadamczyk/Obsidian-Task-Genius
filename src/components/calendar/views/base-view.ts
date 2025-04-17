import { App, Component } from "obsidian";
import { CalendarEvent } from "..";
import TaskProgressBarPlugin from "src";

interface EventMap {
	onEventClick: (ev: MouseEvent, event: CalendarEvent) => void;
	onEventHover: (ev: MouseEvent, event: CalendarEvent) => void;
	onDayClick: (
		ev: MouseEvent,
		data: {
			day: number; // Unix timestamp
		}
	) => void;
	onDayHover: (
		ev: MouseEvent,
		data: {
			day: number; // Unix timestamp
		}
	) => void;
	onMonthClick: (
		ev: MouseEvent,
		data: {
			month: number; // Unix timestamp
		}
	) => void;
	onMonthHover: (
		ev: MouseEvent,
		data: {
			month: number; // Unix timestamp
		}
	) => void;
	onYearClick: (
		ev: MouseEvent,
		data: {
			year: number; // Unix timestamp
		}
	) => void;
	onYearHover: (
		ev: MouseEvent,
		data: {
			year: number; // Unix timestamp
		}
	) => void;
}

// Combine event handlers into a single options object, making them optional
export interface CalendarViewOptions extends Partial<EventMap> {
	// Add other common view options here if needed
}

export abstract class CalendarViewComponent extends Component {
	protected containerEl: HTMLElement;
	protected events: CalendarEvent[];
	protected options: CalendarViewOptions;

	constructor(
		plugin: TaskProgressBarPlugin,
		app: App,
		containerEl: HTMLElement,
		events: CalendarEvent[],
		options: CalendarViewOptions = {} // Provide default empty options
	) {
		super(); // Call the base class constructor
		this.containerEl = containerEl;
		this.events = events;
		this.options = options;
	}

	// Abstract method for rendering the specific view content
	// Subclasses (MonthView, WeekView, DayView) must implement this
	abstract render(): void;

	// Example common method (can be implemented here or left abstract)
	protected handleEventClick(ev: MouseEvent, event: CalendarEvent): void {
		if (this.options.onEventClick) {
			this.options.onEventClick(ev, event);
		}
	}

	// Lifecycle methods from Component might be overridden here or in subclasses
	onload(): void {
		super.onload();
		this.render(); // Initial render on load
	}

	onunload(): void {
		// Clean up resources, remove event listeners, etc.
		this.containerEl.empty();
		super.onunload();
	}
}
