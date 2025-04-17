import { App, Component, moment } from "obsidian";
import { CalendarEvent } from "..";
import { getViewSettingOrDefault } from "../../../common/setting-definition"; // Import helper
import TaskProgressBarPlugin from "../../../index"; // Import plugin type for settings access

/**
 * Renders the year view grid as a component.
 */
export class YearView extends Component {
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
		console.log("YearView onload");
		this.render();
	}

	render(): void {
		const year = this.currentDate.year();
		this.containerEl.empty();
		this.containerEl.addClass("view-year");
		console.log(
			`YearView: Rendering year ${year}. Total events received: ${this.events.length}`
		); // Log total events

		// Create a grid container for the 12 months (e.g., 4x3)
		const yearGrid = this.containerEl.createDiv("calendar-year-grid");

		// Filter events relevant to the current year
		const yearStart = moment({ year: year, month: 0, day: 1 });
		const yearEnd = moment({ year: year, month: 11, day: 31 });
		const startTimeFilter = performance.now();
		const yearEvents = this.events.filter((e) => {
			const start = moment(e.start);
			const end = e.end ? moment(e.end) : start;
			return (
				start.isSameOrBefore(yearEnd.endOf("day")) &&
				end.isSameOrAfter(yearStart.startOf("day"))
			);
		});
		const endTimeFilter = performance.now();
		console.log(
			`YearView: Filtered ${
				yearEvents.length
			} events for year ${year} in ${endTimeFilter - startTimeFilter}ms`
		); // Log filtering time

		// Get view settings (assuming 'calendar' or a 'year' specific setting)
		const viewConfig = getViewSettingOrDefault(this.plugin, "calendar"); // Adjust if needed
		const firstDayOfWeekSetting = viewConfig.firstDayOfWeek;
		const effectiveFirstDay =
			firstDayOfWeekSetting === undefined ? 0 : firstDayOfWeekSetting - 1;

		console.log("Effective first day:", effectiveFirstDay);

		const totalRenderStartTime = performance.now(); // Start total render time

		for (let month = 0; month < 12; month++) {
			const monthStartTime = performance.now(); // Start time for this month
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
			const calcStartTime = performance.now();
			const daysWithEvents = this.calculateDaysWithEvents(
				monthMoment,
				yearEvents // Pass already filtered year events
			);
			const calcEndTime = performance.now();

			// Render the mini-grid for this month, passing the effective first day
			const gridStartTime = performance.now();
			this.renderMiniMonthGrid(
				monthBody,
				monthMoment,
				daysWithEvents,
				effectiveFirstDay
			);
			const gridEndTime = performance.now();

			const monthEndTime = performance.now(); // End time for this month
			console.log(
				`YearView: Month ${month + 1} processed in ${
					monthEndTime - monthStartTime
				}ms ` +
					`(Calc: ${calcEndTime - calcStartTime}ms, Grid: ${
						gridEndTime - gridStartTime
					}ms, Days with events: ${daysWithEvents.size})`
			);
		}

		const totalRenderEndTime = performance.now(); // End total render time
		console.log(
			`YearView: Finished rendering year ${year} in ${
				totalRenderEndTime - totalRenderStartTime
			}ms. (First day: ${effectiveFirstDay})`
		);
	}

	// Helper function to calculate which days in a month have events
	private calculateDaysWithEvents(
		monthMoment: moment.Moment,
		relevantEvents: CalendarEvent[] // Use the pre-filtered events
	): Set<number> {
		const days = new Set<number>();
		const monthStart = monthMoment.clone().startOf("month");
		const monthEnd = monthMoment.clone().endOf("month");

		relevantEvents.forEach((event) => {
			// Check if event has a specific date (start, scheduled, or due) within the current month
			const datesToCheck: (
				| string
				| moment.Moment
				| Date
				| number
				| null
				| undefined
			)[] = [
				event.start,
				event.scheduledDate, // Assuming 'scheduled' exists on CalendarEvent
				event.dueDate, // Assuming 'due' exists on CalendarEvent
			];

			datesToCheck.forEach((dateInput) => {
				if (dateInput) {
					const dateMoment = moment(dateInput);
					// Check if the date falls within the current month
					if (
						dateMoment.isBetween(monthStart, monthEnd, "day", "[]")
					) {
						// '[]' includes start and end days
						days.add(dateMoment.date()); // Add the day number (1-31)
					}
				}
			});
		});

		return days;
	}

	// Helper function to render the mini-grid for a month
	private renderMiniMonthGrid(
		container: HTMLElement,
		monthMoment: moment.Moment,
		daysWithEvents: Set<number>,
		effectiveFirstDay: number // Pass the effective first day
	) {
		container.empty(); // Clear placeholder
		container.addClass("mini-month-grid");

		// Add mini weekday headers (optional, but helpful), rotated
		const headerRow = container.createDiv("mini-weekday-header");
		const weekdays = moment.weekdaysMin(true); // Use minimal names like Mo, Tu
		const rotatedWeekdays = [
			...weekdays.slice(effectiveFirstDay),
			...weekdays.slice(0, effectiveFirstDay),
		];
		rotatedWeekdays.forEach((day) => {
			headerRow.createDiv("mini-weekday").textContent = day;
		});

		// Calculate grid boundaries using effective first day
		const monthStart = monthMoment.clone().startOf("month");
		const daysToSubtractStart =
			(monthStart.weekday() - effectiveFirstDay + 7) % 7;
		const gridStart = monthStart
			.clone()
			.subtract(daysToSubtractStart, "days");

		const monthEnd = monthMoment.clone().endOf("month");
		const daysToAddEnd =
			(effectiveFirstDay + 6 - monthEnd.weekday() + 7) % 7;
		const gridEnd = monthEnd.clone().add(daysToAddEnd, "days");

		let currentDayIter = gridStart.clone();
		while (currentDayIter.isSameOrBefore(gridEnd, "day")) {
			const cell = container.createDiv("mini-day-cell");
			const dayNumber = currentDayIter.date();
			const cellMoment = currentDayIter.clone(); // Clone for the click listener
			// Only show day number if it's in the current month
			if (currentDayIter.isSame(monthMoment, "month")) {
				cell.textContent = String(dayNumber);
			} else {
				cell.addClass("is-other-month");
				cell.textContent = String(dayNumber); // Still show number but dimmed
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

			// Add click listener to day cell only for days in the current month
			if (currentDayIter.isSame(monthMoment, "month")) {
				cell.style.cursor = "pointer"; // Indicate clickable
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
		this.render(); // Re-render will pick up current settings
	}

	updateCurrentDate(date: moment.Moment): void {
		this.currentDate = date;
		this.render(); // Re-render will pick up current settings and date
	}
}
