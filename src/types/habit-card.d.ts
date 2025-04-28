// 基础习惯类型
interface BaseHabitProps {
	id: string;
	name: string;
	description?: string;
	icon: string; // Lucide icon id

	properties?: string[];
}

// 日常习惯类型
export interface DailyHabitProps extends BaseHabitProps {
	type: "daily";
	completions: Record<string, string | number>; // String is date, string or number is completion value
	completionText?: string; // Custom text that represents completion (default is any non-empty value)
}

// 计数习惯类型
export interface CountHabitProps extends BaseHabitProps {
	type: "count";
	min?: number; // Minimum completion value
	max?: number; // Maximum completion value
	notice?: string; // Trigger notice when completion value is reached
	completions: Record<string, number>; // String is date, number is completion value
	countUnit?: string; // Optional unit for the count (e.g., "cups", "times")
}

export interface ScheduledEvent {
	name: string;
	details: string;
}

export interface ScheduledHabitProps extends BaseHabitProps {
	type: "scheduled";
	events: ScheduledEvent[];
	completions: Record<string, Record<string, string>>; // String is date, Record<string, string> is event name and completion value
}

export interface MappingHabitProps extends BaseHabitProps {
	type: "mapping";
	mapping: Record<number, string>;
	completions: Record<string, number>; // String is date, number is completion value
}

// 所有习惯类型的联合
export type HabitProps =
	| DailyHabitProps
	| CountHabitProps
	| ScheduledHabitProps
	| MappingHabitProps;

// 习惯卡片属性
export interface HabitCardProps {
	habit: HabitProps;
	toggleCompletion: (habitId: string, ...args: any[]) => void;
	triggerConfetti?: (pos: {
		x: number;
		y: number;
		width?: number;
		height?: number;
	}) => void;
}

interface MappingHabitCardProps extends HabitCardProps {
	toggleCompletion: (habitId: string, value: number) => void;
}

interface ScheduledHabitCardProps extends HabitCardProps {
	toggleCompletion: (
		habitId: string,
		{
			id,
			details,
		}: {
			id: string;
			details: string;
		}
	) => void;
}
