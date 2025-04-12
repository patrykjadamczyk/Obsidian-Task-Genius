import { Component, setIcon, Plugin } from "obsidian";
import { t } from "../../translations/helper";

export type ViewMode =
	| "forecast"
	| "projects"
	| "inbox"
	| "review"
	| "flagged"
	| "tags";

export class SidebarComponent extends Component {
	// UI elements
	public containerEl: HTMLElement;
	private projectTreeEl: HTMLElement;
	private navEl: HTMLElement;

	// State
	private selectedProject: string | null = null;
	private selectedViewMode: ViewMode = "forecast";
	private isCollapsed: boolean = false;

	// Events
	public onProjectSelected: (project: string) => void;
	public onViewModeChanged: (mode: ViewMode) => void;

	constructor(private parentEl: HTMLElement, private plugin: Plugin) {
		super();
	}

	onload() {
		// Create sidebar container
		this.containerEl = this.parentEl.createDiv({
			cls: "task-sidebar",
		});

		// Create navigation items in sidebar
		this.createSidebarNavigation();

		// Create tree view container in sidebar
		// this.projectTreeEl = this.containerEl.createDiv({
		// 	cls: "project-tree",
		// });
	}

	private createSidebarNavigation() {
		this.navEl = this.containerEl.createDiv({ cls: "sidebar-nav" });

		// Create navigation items
		const createNavItem = (id: ViewMode, text: string, icon: string) => {
			const item = this.navEl.createDiv({ cls: "sidebar-nav-item" });
			item.dataset.view = id;

			const iconEl = item.createDiv({ cls: "sidebar-nav-icon" });
			setIcon(iconEl, icon);

			const textEl = item.createDiv({ cls: "sidebar-nav-text" });
			textEl.setText(text);

			this.registerDomEvent(item, "click", () => {
				this.setViewMode(id);
			});

			return item;
		};

		createNavItem("inbox", t("Inbox"), "inbox");
		createNavItem("forecast", t("Forecast"), "calendar");
		createNavItem("projects", t("Projects"), "list-todo");
		createNavItem("tags", t("Tags"), "tag");
		createNavItem("flagged", t("Flagged"), "flag");
		createNavItem("review", t("Review"), "eye");
	}

	public setViewMode(mode: ViewMode) {
		this.selectedViewMode = mode;

		// Update sidebar active item
		const navItems = this.containerEl.querySelectorAll(".sidebar-nav-item");
		navItems.forEach((el) => {
			const isSelected = el.getAttribute("data-view") === mode;
			if (isSelected) {
				el.classList.add("selected");
			} else {
				el.classList.remove("selected");
			}
		});

		// Trigger the callback
		if (this.onViewModeChanged) {
			this.onViewModeChanged(mode);
		}
	}

	public setCollapsed(collapsed: boolean) {
		this.isCollapsed = collapsed;
		this.containerEl.toggleClass("collapsed", collapsed);

		// When collapsed, hide all text elements and tree
		if (collapsed && this.projectTreeEl) {
			this.projectTreeEl.hide();

			// Hide text elements
			const textEls = this.navEl.querySelectorAll(".sidebar-nav-text");
			textEls.forEach((el) => el.addClass("hidden"));
		} else if (!collapsed && this.projectTreeEl) {
			this.projectTreeEl.show();

			// Show text elements
			const textEls = this.navEl.querySelectorAll(".sidebar-nav-text");
			textEls.forEach((el) => el.removeClass("hidden"));
		}
	}

	public getSelectedProject(): string | null {
		return this.selectedProject;
	}

	public getSelectedViewMode(): ViewMode {
		return this.selectedViewMode;
	}

	onunload() {
		this.containerEl.empty();
		this.containerEl.remove();
	}
}
