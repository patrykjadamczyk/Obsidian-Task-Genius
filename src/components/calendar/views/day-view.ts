import { App, Component, moment } from "obsidian";
import { CalendarEvent } from "..";
import {
	renderCalendarEvent,
	EventViewType,
} from "../rendering/event-renderer";

export class DayView extends Component {
	private containerEl: HTMLElement;
	private currentDate: moment.Moment;
	private events: CalendarEvent[];
	private app: App;

	constructor(
		app: App,
		containerEl: HTMLElement,
		currentDate: moment.Moment,
		events: CalendarEvent[]
	) {
		super();
		this.app = app;
		this.containerEl = containerEl;
		this.currentDate = currentDate;
		this.events = events;
	}

	onload(): void {
		this.render();
	}

	render(): void {
		this.containerEl.empty();
		this.containerEl.addClass("view-day");

		// 1. Filter events for the current day
		const todayStart = this.currentDate.clone().startOf("day");
		const todayEnd = this.currentDate.clone().endOf("day");

		const dayEvents = this.events
			.filter((event) => {
				// Check if event occurs today (handles multi-day)
				const eventStart = moment(event.start);
				// Treat events without end date as starting today if they start before today ends
				const eventEnd = event.end
					? moment(event.end)
					: eventStart.clone().endOf("day"); // Assume end of day if no end time
				// Event overlaps if its start is before today ends AND its end is after today starts
				return (
					eventStart.isBefore(todayEnd) &&
					eventEnd.isAfter(todayStart)
				);
			})
			.sort((a, b) => {
				// Sort events by ID
				if (a.id < b.id) return -1;
				if (a.id > b.id) return 1;
				return 0;
			});

		// 2. Render Timeline Section (Combined List)
		const timelineSection = this.containerEl.createDiv(
			"calendar-timeline-section" // Keep this class for general styling? Or rename?
		);
		const timelineEventsContainer = timelineSection.createDiv(
			"calendar-timeline-events-container" // Renamed? maybe calendar-day-events-list
		);

		// 3. Render events in a simple list
		if (dayEvents.length === 0) {
			timelineEventsContainer.addClass("is-empty");
			timelineEventsContainer.setText("(No events for this day)");
		} else {
			dayEvents.forEach((event) => {
				// Remove layout finding logic
				/*
				const layout = eventLayouts.find((l) => l.id === event.id);
				if (!layout) {
					console.warn("Layout not found for event:", event);
					// Optionally render it somewhere as a fallback?
					return;
				}
				*/

				// Use the renderer, adjust viewType if needed, remove layout
				const { eventEl, component } = renderCalendarEvent({
					event: event,
					// Use a generic type or reuse 'timed' but styles will handle layout
					viewType: "day-timed", // Changed back to day-timed, CSS will handle layout
					// layout: layout, // Removed layout
					app: this.app,
				});
				this.addChild(component);
				timelineEventsContainer.appendChild(eventEl); // Append directly to the container
			});
		}
	}

	// Update methods to allow changing data after initial render
	updateEvents(events: CalendarEvent[]): void {
		this.events = events;
		this.render();
	}

	updateCurrentDate(date: moment.Moment): void {
		this.currentDate = date;
		this.render();
	}
}
