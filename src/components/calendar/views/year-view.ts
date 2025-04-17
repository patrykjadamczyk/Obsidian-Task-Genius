import { App, Component, moment } from "obsidian";
import { CalendarEvent } from "..";

/**
 * Renders the year view grid as a component.
 */
export class YearView extends Component {
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
		console.log("YearView onload");
		this.render();
	}

	render(): void {
		const year = this.currentDate.year();
		this.containerEl.empty();
		this.containerEl.addClass("view-year");

		// Create a grid container for the 12 months (e.g., 4x3)
		const yearGrid = this.containerEl.createDiv("calendar-year-grid");

		// Filter events relevant to the current year
		const yearStart = moment({ year: year, month: 0, day: 1 });
		const yearEnd = moment({ year: year, month: 11, day: 31 });
		const yearEvents = this.events.filter((e) => {
			const start = moment(e.start);
			const end = e.end ? moment(e.end) : start;
			return (
				start.isSameOrBefore(yearEnd) && end.isSameOrAfter(yearStart)
			);
		});

		for (let month = 0; month < 12; month++) {
			const monthContainer = yearGrid.createDiv("calendar-mini-month");
			const monthMoment = moment({ year: year, month: month, day: 1 });

			// Add month header
			const monthHeader = monthContainer.createDiv("mini-month-header");
			monthHeader.textContent = monthMoment.format("MMMM"); // Full month name

			// Add click listener to month header
			monthHeader.addEventListener("click", () => {
				console.log("Clicked month:", monthMoment.format("YYYY-MM"));
				// TODO: Implement switch to Month view for monthMoment
				// This requires passing a handler/callback from the main component.
			});
			monthHeader.style.cursor = "pointer"; // Indicate clickable

			// Add body container for the mini-calendar grid
			const monthBody = monthContainer.createDiv("mini-month-body");

			// Calculate days with events for this month
			const daysWithEvents = this.calculateDaysWithEvents(
				monthMoment,
				yearEvents
			);
			// Render the mini-grid for this month
			this.renderMiniMonthGrid(monthBody, monthMoment, daysWithEvents);
		}

		console.log(`Rendered Year View component for ${year}`);
	}

	// Helper function to calculate which days in a month have events
	private calculateDaysWithEvents(
		monthMoment: moment.Moment,
		yearEvents: CalendarEvent[]
	): Set<number> {
		const days = new Set<number>();
		const monthStart = monthMoment.clone().startOf("month");
		const monthEnd = monthMoment.clone().endOf("month");

		// Filter events relevant to this specific month
		const monthEvents = yearEvents.filter((e) => {
			const start = moment(e.start);
			const end = e.end ? moment(e.end) : start;
			return (
				start.isSameOrBefore(monthEnd) && end.isSameOrAfter(monthStart)
			);
		});

		monthEvents.forEach((event) => {
			const eventStartMoment = moment(event.start).startOf("day");
			const eventEndMoment = event.end
				? moment(event.end).startOf("day")
				: eventStartMoment.clone().add(1, "day"); // Treat dateless end as single day

			let loopMoment = eventStartMoment.clone();
			while (loopMoment.isBefore(eventEndMoment, "day")) {
				// Only consider days within the current month
				if (
					loopMoment.isSameOrAfter(monthStart) &&
					loopMoment.isSameOrBefore(monthEnd)
				) {
					days.add(loopMoment.date()); // Add the day number (1-31)
				}
				// Optimization: Break if we go past the month end
				if (loopMoment.isAfter(monthEnd)) break;
				loopMoment.add(1, "day");
			}
		});

		return days;
	}

	// Helper function to render the mini-grid for a month
	private renderMiniMonthGrid(
		container: HTMLElement,
		monthMoment: moment.Moment,
		daysWithEvents: Set<number>
	) {
		container.empty(); // Clear placeholder
		container.addClass("mini-month-grid");

		// Add mini weekday headers (optional, but helpful)
		const headerRow = container.createDiv("mini-weekday-header");
		const weekdays = moment.weekdaysMin(true); // Use minimal names like Mo, Tu
		weekdays.forEach((day) => {
			headerRow.createDiv("mini-weekday").textContent = day;
		});

		const monthStart = monthMoment.clone().startOf("month");
		const gridStart = monthStart.clone().startOf("week");
		const monthEnd = monthMoment.clone().endOf("month");
		// Ensure the grid shows the end of the month's week
		const gridEnd = monthEnd.isSame(monthEnd.clone().endOf("week"), "day")
			? monthEnd
			: monthEnd.clone().endOf("week");

		let currentDayIter = gridStart.clone();
		while (currentDayIter.isSameOrBefore(gridEnd, "day")) {
			const cell = container.createDiv("mini-day-cell");
			const dayNumber = currentDayIter.date();
			const cellMoment = currentDayIter.clone(); // Clone for the click listener
			cell.textContent = String(dayNumber);

			if (!currentDayIter.isSame(monthMoment, "month")) {
				cell.addClass("is-other-month");
			}
			if (currentDayIter.isSame(moment(), "day")) {
				cell.addClass("is-today");
			}
			if (
				currentDayIter.isSame(monthMoment, "month") &&
				daysWithEvents.has(dayNumber)
			) {
				cell.addClass("has-events");
			}

			// Add click listener to day cell
			if (currentDayIter.isSame(monthMoment, "month")) {
				cell.addEventListener("click", () => {
					console.log(
						"Clicked day:",
						cellMoment.format("YYYY-MM-DD")
					);
					// TODO: Implement navigation to Day view for cellMoment
					// This requires passing a handler/callback from the main component.
				});
			} else {
				// Optionally disable clicks or provide different behavior for other month days
				cell.style.cursor = "default";
			}

			currentDayIter.add(1, "day");
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
