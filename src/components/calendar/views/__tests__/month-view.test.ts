import { App, moment } from "obsidian";
import { MonthView } from "../month-view";
import { CalendarEvent } from "../../index";
import TaskProgressBarPlugin from "../../../../index";
import "../../../../__mocks__/dom-helpers";

// Mock dependencies
jest.mock("obsidian", () => ({
	App: jest.fn(),
	Component: class MockComponent {
		addChild = jest.fn();
		registerDomEvent = jest.fn();
		onunload = jest.fn();
	},
	moment: require("moment"),
	debounce: (fn: Function) => fn,
}));

jest.mock("../../../../index", () => ({
	default: jest.fn(),
}));

jest.mock("../../rendering/event-renderer", () => ({
	renderCalendarEvent: jest.fn(() => ({
		eventEl: document.createElement("div"),
		component: { onunload: jest.fn() },
	})),
}));

jest.mock("../../../../common/setting-definition", () => ({
	getViewSettingOrDefault: jest.fn(),
	CalendarSpecificConfig: {},
}));

jest.mock("sortablejs", () => ({
	default: {
		create: jest.fn(() => ({
			destroy: jest.fn(),
		})),
	},
}));

describe("MonthView Weekend Hiding", () => {
	let mockApp: App;
	let mockPlugin: TaskProgressBarPlugin;
	let containerEl: HTMLElement;
	let monthView: MonthView;

	beforeEach(() => {
		// Setup DOM environment
		document.body.innerHTML = "";
		containerEl = document.createElement("div");
		document.body.appendChild(containerEl);

		// Mock app and plugin
		mockApp = {} as App;
		mockPlugin = {
			settings: {
				viewConfiguration: [
					{
						id: "calendar",
						specificConfig: {
							firstDayOfWeek: 1, // Monday
							hideWeekends: true,
						},
					},
				],
			},
		} as any;

		// Create test events
		const testEvents: CalendarEvent[] = [
			{
				id: "test-1",
				title: "Test Event 1",
				start: moment("2024-01-15").toDate(), // Monday
				metadata: {
					dueDate: moment("2024-01-15").valueOf(),
				},
			},
			{
				id: "test-2",
				title: "Test Event 2",
				start: moment("2024-01-20").toDate(), // Saturday (weekend)
				metadata: {
					dueDate: moment("2024-01-20").valueOf(),
				},
			},
		];

		// Create MonthView instance
		monthView = new MonthView(
			mockApp,
			mockPlugin,
			containerEl,
			"calendar",
			moment("2024-01-15"), // January 2024
			testEvents,
			{
				onDayClick: jest.fn(),
				onEventClick: jest.fn(),
			}
		);
	});

	afterEach(() => {
		monthView.onunload();
		document.body.innerHTML = "";
	});

	test("should render only 5 weekday headers when hideWeekends is true", () => {
		// Render the month view
		monthView.render();

		// Check weekday headers
		const weekdayHeaders = containerEl.querySelectorAll(".calendar-weekday");
		expect(weekdayHeaders.length).toBe(5);

		// Verify the headers are work days only (Mon-Fri)
		const headerTexts = Array.from(weekdayHeaders).map(
			(el) => el.textContent
		);
		expect(headerTexts).not.toContain("Sat");
		expect(headerTexts).not.toContain("Sun");
		expect(headerTexts).toContain("Mon");
		expect(headerTexts).toContain("Tue");
		expect(headerTexts).toContain("Wed");
		expect(headerTexts).toContain("Thu");
		expect(headerTexts).toContain("Fri");
	});

	test("should have hide-weekends CSS class when hideWeekends is true", () => {
		monthView.render();

		expect(containerEl.classList.contains("hide-weekends")).toBe(true);
	});

	test("should not create day cells for weekend dates", () => {
		monthView.render();

		// Get all day cells
		const dayCells = containerEl.querySelectorAll(".calendar-day-cell");

		// Check that no weekend dates are created
		Array.from(dayCells).forEach((cell) => {
			const dateStr = cell.getAttribute("data-date");
			if (dateStr) {
				const date = moment(dateStr);
				const dayOfWeek = date.day();
				// Should not be Saturday (6) or Sunday (0)
				expect(dayOfWeek).not.toBe(0);
				expect(dayOfWeek).not.toBe(6);
			}
		});
	});

	test("should render only work days in a typical week", () => {
		monthView.render();

		// Get all day cells for a specific week
		const dayCells = containerEl.querySelectorAll(".calendar-day-cell");
		const datesInView = Array.from(dayCells).map((cell) =>
			cell.getAttribute("data-date")
		);

		// Find a complete work week (e.g., Jan 15-19, 2024 is Mon-Fri)
		const workWeekDates = [
			"2024-01-15", // Monday
			"2024-01-16", // Tuesday
			"2024-01-17", // Wednesday
			"2024-01-18", // Thursday
			"2024-01-19", // Friday
		];

		// All work days should be present
		workWeekDates.forEach((date) => {
			expect(datesInView).toContain(date);
		});

		// Weekend days should not be present
		const weekendDates = [
			"2024-01-13", // Saturday
			"2024-01-14", // Sunday
			"2024-01-20", // Saturday
			"2024-01-21", // Sunday
		];

		weekendDates.forEach((date) => {
			expect(datesInView).not.toContain(date);
		});
	});

	test("should have correct grid layout with 5 columns when weekends hidden", () => {
		monthView.render();

		// Check that the container has the hide-weekends class
		expect(containerEl.classList.contains("hide-weekends")).toBe(true);

		// The CSS should set grid-template-columns to repeat(5, 1fr)
		// We can't directly test CSS, but we can verify the class is applied
		const monthGrid = containerEl.querySelector(".calendar-month-grid");
		expect(monthGrid).toBeTruthy();

		const weekdayHeader = containerEl.querySelector(
			".calendar-weekday-header"
		);
		expect(weekdayHeader).toBeTruthy();
	});

	test("should render 7 days when hideWeekends is false", () => {
		// Update plugin settings to show weekends
		mockPlugin.settings.viewConfiguration[0].specificConfig.hideWeekends = false;

		// Create new instance with weekends enabled
		const monthViewWithWeekends = new MonthView(
			mockApp,
			mockPlugin,
			containerEl,
			"calendar",
			moment("2024-01-15"),
			[],
			{}
		);

		monthViewWithWeekends.render();

		// Should have 7 weekday headers
		const weekdayHeaders = containerEl.querySelectorAll(".calendar-weekday");
		expect(weekdayHeaders.length).toBe(7);

		// Should not have hide-weekends class
		expect(containerEl.classList.contains("hide-weekends")).toBe(false);

		monthViewWithWeekends.onunload();
	});
});
