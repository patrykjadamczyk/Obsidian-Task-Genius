import { Component } from "obsidian";
import {
	CountHabitProps,
	DailyHabitProps,
	HabitProps,
	MappingHabitProps,
	ScheduledHabitProps,
} from "src/types/habit-card";

export class HabitCard extends Component {
	constructor(public habit: HabitProps, public container: HTMLElement) {
		super();
	}
}

export class DailyHabitCard extends HabitCard {
	constructor(habit: DailyHabitProps, container: HTMLElement) {
		super(habit, container);
	}
}

export class CountHabitCard extends HabitCard {
	constructor(habit: CountHabitProps, container: HTMLElement) {
		super(habit, container);
	}
}

export class ScheduledHabitCard extends HabitCard {
	constructor(habit: ScheduledHabitProps, container: HTMLElement) {
		super(habit, container);
	}
}

export class MappingHabitCard extends HabitCard {
	constructor(habit: MappingHabitProps, container: HTMLElement) {
		super(habit, container);
	}
}
