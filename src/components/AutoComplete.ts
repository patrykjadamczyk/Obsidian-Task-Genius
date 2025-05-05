import { AbstractInputSuggest, App, prepareFuzzySearch, TFile } from "obsidian";
import TaskProgressBarPlugin from "../index";

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
	protected availableChoices: string[] = [];

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

	// Override getSuggestions to handle comma-separated tags
	getSuggestions(query: string): string[] {
		const parts = query.split(",");
		const currentTagInput = parts[parts.length - 1].trim();

		if (!currentTagInput) {
			return this.availableChoices.slice(0, 100);
		}

		const fuzzySearch = prepareFuzzySearch(currentTagInput.toLowerCase());
		return this.availableChoices
			.filter((tag) => fuzzySearch(tag.toLowerCase()))
			.slice(0, 100);
	}

	// Override to add # prefix and keep previous tags
	getSuggestionValue(item: string): string {
		const currentValue = this.inputEl.value;
		const parts = currentValue.split(",");

		// Replace the last part with the selected tag
		parts[parts.length - 1] = `#${item}`;

		// Join back with commas and add a new comma for the next tag
		return `${parts.join(",")},`;
	}

	// Override to display full tag
	getSuggestionText(item: string): string {
		return `#${item}`;
	}
}

export class SingleFolderSuggest extends CustomSuggest {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		plugin: TaskProgressBarPlugin
	) {
		const folders = app.vault.getAllFolders();
		const paths = folders.map((file) => file.path);
		super(app, inputEl, ["/", ...paths]);
	}
}
/**
 * PathSuggest - Provides autocomplete for file paths
 */
export class FolderSuggest extends CustomSuggest {
	private plugin: TaskProgressBarPlugin;

	constructor(
		app: App,
		inputEl: HTMLInputElement,
		plugin: TaskProgressBarPlugin
	) {
		// Get all markdown files in the vault
		const folders = app.vault.getAllFolders();
		const paths = folders.map((file) => file.path);
		super(app, inputEl, paths);
		this.plugin = plugin;
	}

	// Override getSuggestions to handle comma-separated paths
	getSuggestions(query: string): string[] {
		const parts = query.split(",");
		const currentPathInput = parts[parts.length - 1].trim();

		if (!currentPathInput) {
			return this.availableChoices.slice(0, 20);
		}

		const fuzzySearch = prepareFuzzySearch(currentPathInput.toLowerCase());
		return this.availableChoices
			.filter((path) => fuzzySearch(path.toLowerCase()))
			.sort((a, b) => {
				// Sort by path length (shorter paths first)
				// This helps prioritize files in the root or with shorter paths
				return a.length - b.length;
			})
			.slice(0, 20);
	}

	// Override to display the path with folder structure
	getSuggestionText(item: string): string {
		return item;
	}

	// Override to keep previous paths and add the selected one
	getSuggestionValue(item: string): string {
		const currentValue = this.inputEl.value;
		const parts = currentValue.split(",");

		// Replace the last part with the selected path
		parts[parts.length - 1] = item;

		// Join back with commas and add a new comma for the next path
		return `${parts.join(",")},`;
	}
}

/**
 * ImageSuggest - Provides autocomplete for image paths
 */
export class ImageSuggest extends CustomSuggest {
	constructor(
		app: App,
		inputEl: HTMLInputElement,
		plugin: TaskProgressBarPlugin
	) {
		// Get all images in the vault
		const images = app.vault
			.getFiles()
			.filter(
				(file) =>
					file.extension === "png" ||
					file.extension === "jpg" ||
					file.extension === "jpeg" ||
					file.extension === "gif" ||
					file.extension === "svg" ||
					file.extension === "webp"
			);
		const paths = images.map((file) => file.path);
		super(app, inputEl, paths);
	}
}
