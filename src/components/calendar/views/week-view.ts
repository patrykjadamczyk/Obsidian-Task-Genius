import { App, Component, moment } from "obsidian";
import { CalendarEvent } from "..";
import {
	calculateEventLayout,
	determineEventColor,
	EventLayout,
} from "../algorithm"; // Import layout functions
import { renderCalendarEvent } from "../rendering/event-renderer"; // Use new renderer
import { getViewSettingOrDefault } from "../../../common/setting-definition"; // Import helper
import TaskProgressBarPlugin from "../../../index"; // Import plugin type for settings access

/**
 * Renders the week view grid as a component.
 */
export class WeekView extends Component {
	private containerEl: HTMLElement;
	private currentDate: moment.Moment;
	private events: CalendarEvent[];
	private app: App;
	private plugin: TaskProgressBarPlugin; // Add plugin instance

	constructor(
		app: App,
		plugin: TaskProgressBarPlugin, // Pass plugin instance
		containerEl: HTMLElement,
		currentDate: moment.Moment,
		events: CalendarEvent[]
	) {
		super();
		this.app = app;
		this.plugin = plugin; // Store plugin instance
		this.containerEl = containerEl;
		this.currentDate = currentDate;
		this.events = events;
	}

	onload(): void {
		try {
			this.render();
		} catch (error) {
			console.error("Error rendering WeekView:", error);
		}
	}

	render(): void {
		// Get view settings, including the first day of the week override
		const viewConfig = getViewSettingOrDefault(this.plugin, "calendar"); // Assuming 'calendar' view for settings lookup, adjust if needed
		const firstDayOfWeekSetting = viewConfig.firstDayOfWeek;
		const effectiveFirstDay =
			firstDayOfWeekSetting === undefined ? 0 : firstDayOfWeekSetting - 1;

		// Calculate start and end of week based on the setting
		const startOfWeek = this.currentDate.clone().weekday(effectiveFirstDay);
		const endOfWeek = startOfWeek.clone().add(6, "days"); // Week always has 7 days

		this.containerEl.empty();
		this.containerEl.addClass("view-week");

		// 1. Render Header Row (Days of the week + Dates)
		const headerRow = this.containerEl.createDiv("calendar-week-header");
		const dayHeaderCells: { [key: string]: HTMLElement } = {};
		let currentDayIter = startOfWeek.clone();

		// Generate rotated weekdays for header
		const weekdays = moment.weekdaysShort(true); // Gets locale-aware short weekdays
		const rotatedWeekdays = [
			...weekdays.slice(effectiveFirstDay),
			...weekdays.slice(0, effectiveFirstDay),
		];
		let dayIndex = 0;

		while (currentDayIter.isSameOrBefore(endOfWeek, "day")) {
			const dateStr = currentDayIter.format("YYYY-MM-DD");
			const headerCell = headerRow.createDiv("calendar-header-cell");
			dayHeaderCells[dateStr] = headerCell; // Store header cell if needed
			const weekdayEl = headerCell.createDiv("calendar-weekday");
			weekdayEl.textContent = rotatedWeekdays[dayIndex % 7]; // Use rotated weekday name
			const dayNumEl = headerCell.createDiv("calendar-day-number");
			dayNumEl.textContent = currentDayIter.format("D"); // Date number

			if (currentDayIter.isSame(moment(), "day")) {
				headerCell.addClass("is-today");
			}
			currentDayIter.add(1, "day");
			dayIndex++;
		}

		// --- All-Day Section (Renamed for clarity, now holds all events) ---
		const weekGridSection = this.containerEl.createDiv(
			"calendar-week-grid-section" // Renamed class
		);
		const weekGrid = weekGridSection.createDiv("calendar-week-grid"); // Renamed class
		const dayEventContainers: { [key: string]: HTMLElement } = {}; // Renamed variable
		currentDayIter = startOfWeek.clone();
		while (currentDayIter.isSameOrBefore(endOfWeek, "day")) {
			const dateStr = currentDayIter.format("YYYY-MM-DD");
			const dayCell = weekGrid.createDiv(
				// Renamed class
				"calendar-day-column"
			);
			dayEventContainers[dateStr] = dayCell.createDiv(
				// Use renamed variable
				"calendar-day-events-container" // Renamed class
			);
			if (currentDayIter.isSame(moment(), "day")) {
				dayCell.addClass("is-today"); // Apply to the main day cell
			}
			if (currentDayIter.day() === 0 || currentDayIter.day() === 6) {
				// This weekend check is based on Sun/Sat, might need adjustment if start day changes weekend definition visually
				dayCell.addClass("is-weekend"); // Apply to the main day cell
			}
			currentDayIter.add(1, "day");
		}

		// --- Timeline Section (Commented Out) ---
		/*
		const timelineSection = this.containerEl.createDiv(
			"calendar-week-timeline-section"
		);
		const timeGutter = timelineSection.createDiv("calendar-time-gutter");
		const timelineGrid = timelineSection.createDiv(
			"calendar-week-timeline-grid"
		);
		const timelineEventsContainer = timelineSection.createDiv(
			"calendar-week-timeline-events-container"
		);
		const dayTimelineColumns: { [key: string]: HTMLElement } = {};

		// Populate time gutter (hours)
		for (let hour = 0; hour < 24; hour++) {
			const hourSlot = timeGutter.createDiv("calendar-hour-slot-gutter");
			const hourLabel = hourSlot.createDiv("calendar-hour-label");
			hourLabel.setText(moment({ hour }).format("ha"));
			hourSlot.createDiv("calendar-hour-line"); // Horizontal line across grid
		}

		// Create day columns and hour lines within the main timeline grid
		currentDayIter = startOfWeek.clone();
		while (currentDayIter.isSameOrBefore(endOfWeek, "day")) {
			const dateStr = currentDayIter.format("YYYY-MM-DD");
			const dayColumn = timelineGrid.createDiv(
				"calendar-day-column-timed"
			);
			dayTimelineColumns[dateStr] = dayColumn;

			if (currentDayIter.isSame(moment(), "day")) {
				dayColumn.addClass("is-today");
			}
			if (currentDayIter.day() === 0 || currentDayIter.day() === 6) {
				dayColumn.addClass("is-weekend");
			}
			// Add vertical hour lines within each day column for structure
			for (let hour = 0; hour < 24; hour++) {
				const hourLineSlot = dayColumn.createDiv(
					"calendar-hour-slot-timed"
				);
				hourLineSlot.createDiv("calendar-hour-line-vertical"); // Vertical line per day
			}

			currentDayIter.add(1, "day");
		}
		*/

		// 3. Filter Events for the Week (Uses calculated startOfWeek/endOfWeek)
		const weekEvents = this.events.filter((event) => {
			const eventStart = moment(event.start);
			const eventEnd = event.end ? moment(event.end) : eventStart;
			return (
				eventStart.isBefore(
					endOfWeek.clone().endOf("day").add(1, "millisecond")
				) && eventEnd.isSameOrAfter(startOfWeek.clone().startOf("day"))
			);
		});

		// Separate all-day vs timed (Commented out - treating all events similarly now)
		/*
		const allDayEvents = weekEvents.filter((event) => {
			if (event.allDay) return true;
			if (!event.start || !event.end) return false;
			const eventStart = moment(event.start);
			const eventEnd = moment(event.end);
			// Check if it effectively spans a full day or more
			return eventEnd.diff(eventStart, "hours") >= 24;
		});

		const timedEvents = weekEvents.filter(
			(event) => !allDayEvents.includes(event) && event.start
		);
		*/

		// 4. Render All Events (Modified from original All-Day rendering)
		weekEvents.forEach((event) => {
			// Iterate through all weekEvents
			if (!event.start) return; // Skip events without a start date

			const eventStartMoment = moment(event.start).startOf("day");
			// Use end date if available, otherwise treat as single-day event
			const eventEndMoment = event.end
				? moment(event.end).startOf("day")
				: // Treat events ending exactly at midnight as ending on the previous day for rendering
				  eventStartMoment;
			const eventEffectiveEndMoment =
				event.end &&
				moment(event.end).isAfter(eventStartMoment, "day") &&
				moment(event.end).hour() === 0 &&
				moment(event.end).minute() === 0
					? moment(event.end)
							.subtract(1, "millisecond")
							.startOf("day")
					: eventEndMoment;

			// Use calculated week boundaries
			const weekStartMoment = startOfWeek.clone().startOf("day");
			const weekEndMoment = endOfWeek.clone().endOf("day");

			// Clamp the event's rendering range to the current week view
			const renderStartMoment = moment.max(
				eventStartMoment,
				weekStartMoment
			);
			const renderEndMoment = moment.min(
				eventEffectiveEndMoment,
				weekEndMoment
			);

			let loopMoment = renderStartMoment.clone();
			const isMultiDayEvent = !eventStartMoment.isSame(
				eventEffectiveEndMoment,
				"day"
			);

			while (loopMoment.isSameOrBefore(renderEndMoment, "day")) {
				const dateStr = loopMoment.format("YYYY-MM-DD");
				const container = dayEventContainers[dateStr]; // Use renamed variable
				if (container) {
					// Determine if this segment is the start/end *of the original event*
					const isOriginalStart = loopMoment.isSame(
						eventStartMoment,
						"day"
					);
					const isOriginalEnd = loopMoment.isSame(
						eventEffectiveEndMoment,
						"day"
					);

					// Determine if this segment is the start/end *within the current view*
					// Needed for proper visual connection hints
					const isViewStart = loopMoment.isSame(
						renderStartMoment,
						"day"
					);
					const isViewEnd = loopMoment.isSame(renderEndMoment, "day");

					const { eventEl, component } = renderCalendarEvent({
						event: event,
						viewType: "week-allday", // Use consistent view type
						positioningHints: {
							isMultiDay: isMultiDayEvent,
							// Pass both original and view-based start/end for potential styling
							isStart: isOriginalStart,
							isEnd: isOriginalEnd,
							isViewStart: isViewStart,
							isViewEnd: isViewEnd,
						},
						app: this.app,
					});
					this.addChild(component);
					container.appendChild(eventEl);
				}
				loopMoment.add(1, "day");
			}
		});

		// 5. Calculate and Render Timed Events (Commented Out)
		/*
		const allTimedLayouts: EventLayout[] = [];
		const dayIndices = new Map<string, number>();
		currentDayIter = startOfWeek.clone();
		let dayIndex = 0;
		while (currentDayIter.isSameOrBefore(endOfWeek, "day")) {
			dayIndices.set(currentDayIter.format("YYYY-MM-DD"), dayIndex++);
			currentDayIter.add(1, "day");
		}

		// Process events day by day for layout
		for (let i = 0; i < 7; i++) {
			const dayMoment = startOfWeek.clone().add(i, "days");
			const dayStr = dayMoment.format("YYYY-MM-DD");
			const dayStart = dayMoment.clone().startOf("day");
			const dayEnd = dayMoment.clone().endOf("day");

			const eventsOnThisDay = timedEvents.filter((event) => {
				const start = moment(event.start);
				const end = event.end ? moment(event.end) : start;
				return start.isBefore(dayEnd) && end.isAfter(dayStart);
			});

			if (eventsOnThisDay.length > 0) {
				const dayLayouts = calculateEventLayout(
					eventsOnThisDay,
					dayStart.toDate(),
					dayEnd.toDate()
				);
				// Adjust layout coordinates for the week view
				dayLayouts.forEach((layout) => {
					const event = timedEvents.find((e) => e.id === layout.id);
					if (!event || !event.start) return;

					const eventStart = moment(event.start);
					const eventEnd = event.end
						? moment(event.end)
						: eventStart.clone().add(1, "hour"); // Default duration

					// Calculate position relative to the week's timeline grid
					const dayColWidthPercent = 100 / 7;
					const dayColStartPercent =
						(dayIndices.get(dayStr) || 0) * dayColWidthPercent;

					// Base horizontal position on the day column
					layout.left =
						dayColStartPercent +
						(layout.left / 100) * dayColWidthPercent; // Adjust left based on day
					layout.width = (layout.width / 100) * dayColWidthPercent; // Adjust width based on day width

					// Convert event start/end times to vertical pixel offsets
					// Assuming timeline height represents 24 hours
					// TODO: Get actual height of timeline container for accurate pixel calculation
					const totalMinutesInDay = 24 * 60;
					const startMinutes = Math.max(
						0,
						eventStart.diff(dayStart, "minutes")
					);
					const endMinutes = Math.min(
						totalMinutesInDay,
						eventEnd.diff(dayStart, "minutes")
					);
					const durationMinutes = Math.max(
						15,
						endMinutes - startMinutes
					); // Min 15 min height

					// Example: If timelineSection height is 1000px
					const timelineHeightPx = 1000; // FIXME: This should be dynamic!
					layout.top =
						(startMinutes / totalMinutesInDay) * timelineHeightPx;
					layout.height =
						(durationMinutes / totalMinutesInDay) *
						timelineHeightPx;

					allTimedLayouts.push(layout);
				});
			}
		}

		// Render timed events using adjusted layouts
		allTimedLayouts.forEach((layout) => {
			const event = timedEvents.find((e) => e.id === layout.id);
			if (!event || !event.start) return;

			const { eventEl, component } = renderCalendarEvent({
				event: event,
				viewType: "week-timed",
				layout: layout,
				app: this.app,
			});
			this.addChild(component);
			timelineEventsContainer.appendChild(eventEl);
		});
		*/

		console.log(
			`Rendered Simplified Week View from ${startOfWeek.format(
				"YYYY-MM-DD"
			)} to ${endOfWeek.format(
				"YYYY-MM-DD"
			)} (First day: ${effectiveFirstDay})`
		);
	}

	// Update methods to allow changing data after initial render
	updateEvents(events: CalendarEvent[]): void {
		this.events = events;
		this.render(); // Re-render will pick up current settings
	}

	updateCurrentDate(date: moment.Moment): void {
		this.currentDate = date;
		this.render(); // Re-render will pick up current settings and date
	}
}
