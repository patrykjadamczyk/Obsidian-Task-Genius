import { AbstractInputSuggest, App, prepareFuzzySearch } from "obsidian";
import TaskProgressBarPlugin from "src";

abstract class BaseSuggest<T> extends AbstractInputSuggest<T> {
	constructor(app: App, public inputEl: HTMLInputElement) {
		super(app, inputEl);
	}

	// Common method to render suggestions
	renderSuggestion(item: T, el: HTMLElement): void {
		el.setText(this.getSuggestionText(item));
	}

	// Common method to select suggestion
	selectSuggestion(item: T, evt: MouseEvent | KeyboardEvent): void {
		this.inputEl.value = this.getSuggestionValue(item);
		this.inputEl.trigger("input"); // Trigger change event
		this.close();
	}

	// Abstract methods to be implemented by subclasses
	abstract getSuggestionText(item: T): string;
	abstract getSuggestionValue(item: T): string;
}

class CustomSuggest extends BaseSuggest<string> {
	private availableChoices: string[] = [];

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		availableChoices: string[]
	) {
		super(app, inputEl);
		this.availableChoices = availableChoices;
	}

	getSuggestions(query: string): string[] {
		if (!query) {
			return this.availableChoices.slice(0, 100); // Limit initial suggestions
		}
		const fuzzySearch = prepareFuzzySearch(query.toLowerCase());
		return this.availableChoices
			.filter(
				(
					cmd: string // Add type to cmd
				) => fuzzySearch(cmd.toLowerCase()) // Call the returned function
			)
			.slice(0, 100);
	}

	getSuggestionText(item: string): string {
		return item;
	}

	getSuggestionValue(item: string): string {
		return item;
	}
}

/**
 * ProjectSuggest - Provides autocomplete for project names
 */
export class ProjectSuggest extends CustomSuggest {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		plugin: TaskProgressBarPlugin
	) {
		// Get project list
		const projects =
			plugin.taskManager?.getAvailableContextOrProjects().projects || [];
		super(app, inputEl, projects);
	}
}

/**
 * ContextSuggest - Provides autocomplete for context names
 */
export class ContextSuggest extends CustomSuggest {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		plugin: TaskProgressBarPlugin
	) {
		// Get context list
		const contexts =
			plugin.taskManager?.getAvailableContextOrProjects().contexts || [];
		super(app, inputEl, contexts);
	}
}

/**
 * TagSuggest - Provides autocomplete for tag names
 */
export class TagSuggest extends CustomSuggest {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		plugin: TaskProgressBarPlugin
	) {
		// Get tag list, removing # prefix
		const tags = Object.keys(plugin.app.metadataCache.getTags() || {}).map(
			(tag) => tag.substring(1)
		);

		super(app, inputEl, tags);
	}

	// Override to add # prefix
	getSuggestionValue(item: string): string {
		return `#${item}`;
	}

	// Override to display full tag
	getSuggestionText(item: string): string {
		return `#${item}`;
	}
}
