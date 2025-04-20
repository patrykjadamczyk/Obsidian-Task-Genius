/**
 * Generates a unique identifier for filtering elements
 */
export function generateId(): string {
	return `filter-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
