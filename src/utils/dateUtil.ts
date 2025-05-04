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
