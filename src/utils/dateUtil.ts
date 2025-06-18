/**
 * Format a date in a human-readable format
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);

	// Check if date is today or tomorrow
	if (date.getTime() === today.getTime()) {
		return "Today";
	} else if (date.getTime() === tomorrow.getTime()) {
		return "Tomorrow";
	}

	// Format as Month Day, Year for other dates
	const options: Intl.DateTimeFormatOptions = {
		month: "short",
		day: "numeric",
	};

	// Only add year if it's not the current year
	if (date.getFullYear() !== now.getFullYear()) {
		options.year = "numeric";
	}

	return date.toLocaleDateString(undefined, options);
}

/**
 * Parse a date string in the format YYYY-MM-DD
 * @param dateString Date string to parse
 * @returns Parsed date as a number or undefined if invalid
 */
export function parseLocalDate(dateString: string): number | undefined {
	if (!dateString) return undefined;
	// Basic regex check for YYYY-MM-DD format
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		console.warn(`Worker: Invalid date format encountered: ${dateString}`);
		return undefined;
	}
	const parts = dateString.split("-");
	if (parts.length === 3) {
		const year = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10); // 1-based month
		const day = parseInt(parts[2], 10);
		// Validate date parts
		if (
			!isNaN(year) &&
			!isNaN(month) &&
			month >= 1 &&
			month <= 12 &&
			!isNaN(day) &&
			day >= 1 &&
			day <= 31
		) {
			// Use local time to create date object
			const date = new Date(year, month - 1, day);
			// Check if constructed date is valid (e.g., handle 2/30 case)
			if (
				date.getFullYear() === year &&
				date.getMonth() === month - 1 &&
				date.getDate() === day
			) {
				date.setHours(0, 0, 0, 0); // Standardize time part for date comparison
				return date.getTime();
			}
		}
	}
	console.warn(`Worker: Invalid date values after parsing: ${dateString}`);
	return undefined;
}

/**
 * Get today's date in local timezone as YYYY-MM-DD format
 * This fixes the issue where using toISOString() can return yesterday's date
 * for users in timezones ahead of UTC
 * @returns Today's date in YYYY-MM-DD format in local timezone
 */
export function getTodayLocalDateString(): string {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Convert a Date object to YYYY-MM-DD format in local timezone
 * This fixes the issue where using toISOString() can return wrong date
 * for users in timezones ahead of UTC
 * @param date The date to format
 * @returns Date in YYYY-MM-DD format in local timezone
 */
export function getLocalDateString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Convert a date to a relative time string, such as
 * "yesterday", "today", "tomorrow", etc.
 * using Intl.RelativeTimeFormat
 */
export function getRelativeTimeString(
	date: Date | number,
	lang = navigator.language
): string {
	// 允许传入日期对象或时间戳
	const timeMs = typeof date === "number" ? date : date.getTime();

	// 获取当前日期（去除时分秒）
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	// 获取传入日期（去除时分秒）
	const targetDate = new Date(timeMs);
	targetDate.setHours(0, 0, 0, 0);

	// 计算日期差（以天为单位）
	const deltaDays = Math.round(
		(targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
	);

	// 创建相对时间格式化器
	const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });

	// 返回格式化后的相对时间字符串
	return rtf.format(deltaDays, "day");
}
