import { ActiveFilter } from "./filter-type";

export interface ContentItem {
	id: number;
	title: string;
	status: string;
	priority: string;
	assignee: string;
	due: string;
	tags: string[];
}

export class ContentFilter {
	private items: ContentItem[];

	constructor(items: ContentItem[]) {
		this.items = items;
	}

	public filter(filters: ActiveFilter[]): ContentItem[] {
		if (filters.length === 0) {
			return this.items;
		}

		return this.items.filter((item) => {
			return filters.every((filter) => {
				switch (filter.category) {
					case "tags":
						return item.tags.includes(filter.value);
					case "status":
						return item.status === filter.value;
					case "priority":
						return item.priority === filter.value;
					case "assignee":
						return item.assignee === filter.value;
					case "due":
						return item.due === filter.value;
					default:
						return true;
				}
			});
		});
	}
}
