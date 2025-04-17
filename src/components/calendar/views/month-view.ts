import { App, Component, moment } from "obsidian";
import { CalendarEvent } from "../index";
import { renderCalendarEvent } from "../rendering/event-renderer"; // Import the new renderer

/**
 * Renders the month view grid as a component.
 */
export class MonthView extends Component {
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
		// 1. Calculate the date range for the grid
		const startOfMonth = this.currentDate.clone().startOf("month");
		const endOfMonth = this.currentDate.clone().endOf("month");
		const gridStart = startOfMonth.clone().startOf("week");
		let gridEnd = endOfMonth.clone().endOf("week");

		// Ensure grid covers at least 6 weeks (42 days) for consistent layout
		if (gridEnd.diff(gridStart, "days") + 1 < 42) {
			gridEnd.add(42 - (gridEnd.diff(gridStart, "days") + 1), "days");
		}

		this.containerEl.empty();

		// 2. Add weekday headers
		const headerRow = this.containerEl.createDiv("calendar-weekday-header");
		const weekdays = moment.weekdaysShort(true);
		weekdays.forEach((day) => {
			const weekdayEl = headerRow.createDiv("calendar-weekday");
			weekdayEl.textContent = day;
		});

		// 3. Create day cells grid container
		const gridContainer = this.containerEl.createDiv("calendar-month-grid");
		const dayCells: { [key: string]: HTMLElement } = {}; // Store cells by date string 'YYYY-MM-DD'
		let currentDayIter = gridStart.clone();

		while (currentDayIter.isSameOrBefore(gridEnd, "day")) {
			const cell = gridContainer.createDiv("calendar-day-cell");
			const dateStr = currentDayIter.format("YYYY-MM-DD");
			dayCells[dateStr] = cell;

			// Add day number
			const dayNumberEl = cell.createDiv("calendar-day-number");
			dayNumberEl.textContent = currentDayIter.format("D");

			// Add styling classes
			if (!currentDayIter.isSame(this.currentDate, "month")) {
				cell.addClass("is-other-month");
			}
			if (currentDayIter.isSame(moment(), "day")) {
				cell.addClass("is-today");
			}
			if (currentDayIter.day() === 0 || currentDayIter.day() === 6) {
				// Sunday or Saturday
				cell.addClass("is-weekend");
			}

			// Add events container within the cell
			cell.createDiv("calendar-events-container"); // This is where events will be appended

			currentDayIter.add(1, "day");
		}

		// 4. Filter and Render Events into the appropriate cells
		this.events.forEach((event) => {
			const eventStartMoment = moment(event.start).startOf("day");
			// Ensure the event is relevant to the displayed grid dates
			if (
				event.start.valueOf() > gridEnd.valueOf() ||
				(event.end && event.end.valueOf() < gridStart.valueOf())
			) {
				return; // Event is completely outside the current grid view
			}

			if (event.end) {
				const eventEndMoment = moment(event.end).startOf("day"); // End is exclusive for all-day
				let loopMoment = eventStartMoment.clone();

				// Iterate through each day the event spans
				while (loopMoment.isBefore(eventEndMoment, "day")) {
					// Only render segment if it falls within the grid dates
					if (
						loopMoment.isSameOrAfter(gridStart) &&
						loopMoment.isSameOrBefore(gridEnd)
					) {
						const dateStr = loopMoment.format("YYYY-MM-DD");
						const targetCell = dayCells[dateStr];
						if (targetCell) {
							const eventsContainer = targetCell.querySelector(
								".calendar-events-container"
							);
							if (eventsContainer) {
								const isStart = loopMoment.isSame(
									eventStartMoment,
									"day"
								);
								const isEnd = loopMoment.isSame(
									eventEndMoment.clone().subtract(1, "day"),
									"day"
								);

								const { eventEl, component } =
									renderCalendarEvent({
										event: event,
										viewType: "month",
										positioningHints: {
											isMultiDay: true,
											isStart,
											isEnd,
										},
										app: this.app,
									});
								this.addChild(component);
								eventsContainer.appendChild(eventEl);
							}
						}
					}
					loopMoment.add(1, "day");
					// Optimization: break if loop goes past grid end
					if (loopMoment.isAfter(gridEnd)) break;
				}
			} else {
				// Single day event - check if it's within the grid dates
				if (
					eventStartMoment.isSameOrAfter(gridStart) &&
					eventStartMoment.isSameOrBefore(gridEnd)
				) {
					const dateStr = eventStartMoment.format("YYYY-MM-DD");
					const targetCell = dayCells[dateStr];
					if (targetCell) {
						const eventsContainer = targetCell.querySelector(
							".calendar-events-container"
						);
						if (eventsContainer) {
							const { eventEl, component } = renderCalendarEvent({
								event: event,
								viewType: "month",
								app: this.app,
							});
							this.addChild(component);
							eventsContainer.appendChild(eventEl);
						}
					}
				}
			}
		});

		console.log(
			`Rendered Month View component from ${gridStart.format(
				"YYYY-MM-DD"
			)} to ${gridEnd.format("YYYY-MM-DD")}`
		);
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
