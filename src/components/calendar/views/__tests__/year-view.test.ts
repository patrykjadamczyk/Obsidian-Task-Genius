import { App, moment } from "obsidian";
import { YearView } from "../year-view";
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

jest.mock("../../../../common/setting-definition", () => ({
	getViewSettingOrDefault: jest.fn(() => ({
		specificConfig: {
			firstDayOfWeek: 1, // Monday
			hideWeekends: true,
		},
	})),
	CalendarSpecificConfig: {},
}));

describe("YearView Weekend Hiding", () => {
	let mockApp: App;
	let mockPlugin: TaskProgressBarPlugin;
	let containerEl: HTMLElement;
	let yearView: YearView;

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
				start: moment("2024-06-15").toDate(), // Saturday (weekend)
				metadata: {
					dueDate: moment("2024-06-15").valueOf(),
				},
			},
		];

		// Create YearView instance
		yearView = new YearView(
			mockApp,
			mockPlugin,
			containerEl,
			moment("2024-01-01"), // Year 2024
			testEvents,
			{
				onDayClick: jest.fn(),
				onMonthClick: jest.fn(),
			}
		);
	});

	afterEach(() => {
		yearView.onunload();
		document.body.innerHTML = "";
	});

	test("should render only 5 weekday headers in mini-months when hideWeekends is true", () => {
		// Render the year view
		yearView.render();

		// Check mini-month weekday headers
		const miniWeekdayHeaders = containerEl.querySelectorAll(".mini-weekday");
		
		// Each mini-month should have 5 weekday headers (one for each month)
		// Since we have 12 months, we should have 12 * 5 = 60 mini-weekday headers
		expect(miniWeekdayHeaders.length).toBe(60);

		// Verify no weekend day names are present
		const headerTexts = Array.from(miniWeekdayHeaders).map(
			(el) => el.textContent
		);
		
		// Should not contain Saturday or Sunday abbreviations
		expect(headerTexts.filter(text => text === "Sa" || text === "Su")).toHaveLength(0);
		
		// Should contain work day abbreviations
		expect(headerTexts.filter(text => text === "Mo")).toHaveLength(12); // 12 months
		expect(headerTexts.filter(text => text === "Tu")).toHaveLength(12);
		expect(headerTexts.filter(text => text === "We")).toHaveLength(12);
		expect(headerTexts.filter(text => text === "Th")).toHaveLength(12);
		expect(headerTexts.filter(text => text === "Fr")).toHaveLength(12);
	});

	test("should have hide-weekends CSS class when hideWeekends is true", () => {
		yearView.render();

		expect(containerEl.classList.contains("hide-weekends")).toBe(true);
	});

	test("should not create day cells for weekend dates in mini-months", () => {
		yearView.render();

		// Get all mini-day cells from all mini-months
		const miniDayCells = containerEl.querySelectorAll(".mini-day-cell");

		// Check that no weekend dates are created
		Array.from(miniDayCells).forEach((cell) => {
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

	test("should render 12 mini-months", () => {
		yearView.render();

		// Should have 12 mini-month containers
		const miniMonths = containerEl.querySelectorAll(".calendar-mini-month");
		expect(miniMonths.length).toBe(12);

		// Each should have a header with month name
		const monthHeaders = containerEl.querySelectorAll(".mini-month-header");
		expect(monthHeaders.length).toBe(12);

		// Verify month names are present
		const monthNames = Array.from(monthHeaders).map(
			(el) => el.textContent
		);
		expect(monthNames).toContain("January");
		expect(monthNames).toContain("December");
	});

	test("should render only work days in January 2024 mini-month", () => {
		yearView.render();

		// Get the first mini-month (January)
		const miniMonths = containerEl.querySelectorAll(".calendar-mini-month");
		const januaryMonth = miniMonths[0];
		
		// Get day cells from January mini-month
		const januaryDayCells = januaryMonth.querySelectorAll(".mini-day-cell");
		const datesInJanuary = Array.from(januaryDayCells).map((cell) =>
			cell.getAttribute("data-date")
		);

		// Check that work days are present and weekend days are not
		// January 1, 2024 is a Monday
		const workDays = [
			"2024-01-01", // Monday
			"2024-01-02", // Tuesday
			"2024-01-03", // Wednesday
			"2024-01-04", // Thursday
			"2024-01-05", // Friday
		];

		const weekendDays = [
			"2024-01-06", // Saturday
			"2024-01-07", // Sunday
		];

		// Work days should be present
		workDays.forEach((date) => {
			expect(datesInJanuary).toContain(date);
		});

		// Weekend days should not be present
		weekendDays.forEach((date) => {
			expect(datesInJanuary).not.toContain(date);
		});
	});

	test("should have correct grid layout with 5 columns for mini-months when weekends hidden", () => {
		yearView.render();

		// Check that the container has the hide-weekends class
		expect(containerEl.classList.contains("hide-weekends")).toBe(true);

		// All mini-month grids should be present
		const miniMonthGrids = containerEl.querySelectorAll(".mini-month-grid");
		expect(miniMonthGrids.length).toBe(12);

		// Each mini-month should have weekday headers
		const miniWeekdayHeaders = containerEl.querySelectorAll(".mini-weekday-header");
		expect(miniWeekdayHeaders.length).toBe(12);
	});

	test("should render 7 days when hideWeekends is false", () => {
		// Mock getViewSettingOrDefault to return hideWeekends: false
		const { getViewSettingOrDefault } = require("../../../../common/setting-definition");
		getViewSettingOrDefault.mockReturnValue({
			specificConfig: {
				firstDayOfWeek: 1,
				hideWeekends: false,
			},
		});

		// Create new instance with weekends enabled
		const yearViewWithWeekends = new YearView(
			mockApp,
			mockPlugin,
			containerEl,
			moment("2024-01-01"),
			[],
			{}
		);

		yearViewWithWeekends.render();

		// Should have 7 * 12 = 84 weekday headers (7 per month, 12 months)
		const miniWeekdayHeaders = containerEl.querySelectorAll(".mini-weekday");
		expect(miniWeekdayHeaders.length).toBe(84);

		// Should not have hide-weekends class
		expect(containerEl.classList.contains("hide-weekends")).toBe(false);

		yearViewWithWeekends.onunload();
	});
});
