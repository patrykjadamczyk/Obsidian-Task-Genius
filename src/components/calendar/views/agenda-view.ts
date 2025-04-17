import { App, Component, moment } from "obsidian";
import { CalendarEvent } from "..";
import { renderCalendarEvent } from "../rendering/event-renderer"; // Use new renderer

export class AgendaView extends Component {
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
		this.containerEl.addClass("view-agenda");

		// 1. Define date range (e.g., next 7 days starting from currentDate)
		const rangeStart = this.currentDate.clone().startOf("day");
		const rangeEnd = this.currentDate.clone().add(6, "days").endOf("day"); // 7 days total

		// 2. Filter and Sort Events within the range
		const agendaEvents = this.events
			.filter((event) => {
				const eventStart = moment(event.start);
				if (event.end) {
					const eventEnd = moment(event.end);
					return (
						eventStart.isBefore(rangeEnd) &&
						eventEnd.isAfter(rangeStart)
					);
				} else {
					return eventStart.isBetween(
						rangeStart,
						rangeEnd,
						null,
						"[]"
					);
				}
			})
			.sort((a, b) => a.start.getTime() - b.start.getTime());

		// 3. Group events by day
		const eventsByDay: { [key: string]: CalendarEvent[] } = {};
		agendaEvents.forEach((event) => {
			const eventStartMoment = moment(event.start).startOf("day");
			const eventEndMoment = event.end
				? moment(event.end).startOf("day")
				: eventStartMoment.clone().add(1, "day");
			let loopMoment = eventStartMoment.clone();
			while (loopMoment.isBefore(eventEndMoment)) {
				if (
					loopMoment.isBetween(rangeStart, rangeEnd, undefined, "[]")
				) {
					const dateStr = loopMoment.format("YYYY-MM-DD");
					if (!eventsByDay[dateStr]) {
						eventsByDay[dateStr] = [];
					}
					if (!eventsByDay[dateStr].some((e) => e.id === event.id)) {
						eventsByDay[dateStr].push(event);
					}
				}
				loopMoment.add(1, "day");
				if (
					loopMoment.isAfter(rangeEnd) &&
					loopMoment.isAfter(eventEndMoment)
				)
					break;
			}
		});

		// 4. Render the list
		if (Object.keys(eventsByDay).length === 0) {
			this.containerEl.setText(
				`No upcoming events from ${rangeStart.format(
					"MMM D"
				)} to ${rangeEnd.format("MMM D, YYYY")}.`
			);
			return;
		}

		let currentDayIter = rangeStart.clone();
		while (currentDayIter.isSameOrBefore(rangeEnd, "day")) {
			const dateStr = currentDayIter.format("YYYY-MM-DD");
			if (eventsByDay[dateStr] && eventsByDay[dateStr].length > 0) {
				// Create a container for the two-column layout for the day
				const daySection =
					this.containerEl.createDiv("agenda-day-section");

				// Left column for the date
				const dateColumn = daySection.createDiv(
					"agenda-day-date-column"
				);
				const dayHeader = dateColumn.createDiv("agenda-day-header");
				dayHeader.textContent = currentDayIter.format("dddd, MMMM D");
				if (currentDayIter.isSame(moment(), "day")) {
					dayHeader.addClass("is-today");
				}

				// Right column for the events
				const eventsColumn = daySection.createDiv(
					"agenda-day-events-column"
				);
				const eventsList = eventsColumn.createDiv("agenda-events-list"); // Keep the original list class if needed

				eventsByDay[dateStr]
					.sort((a, b) => {
						const timeA = a.start ? moment(a.start).valueOf() : 0;
						const timeB = b.start ? moment(b.start).valueOf() : 0;
						return timeA - timeB;
					})
					.forEach((event) => {
						const eventItem =
							eventsList.createDiv("agenda-event-item");
						const { eventEl, component } = renderCalendarEvent({
							event: event,
							viewType: "agenda",
							app: this.app,
						});
						this.addChild(component);
						eventItem.appendChild(eventEl);
					});
			}
			currentDayIter.add(1, "day");
		}

		console.log(
			`Rendered Agenda View component from ${rangeStart.format(
				"YYYY-MM-DD"
			)} to ${rangeEnd.format("YYYY-MM-DD")}`
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
