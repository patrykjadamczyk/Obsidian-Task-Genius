import { App, Component, setIcon } from "obsidian";
import TaskProgressBarPlugin from "../../index";
import { t } from "../../translations/helper";
// Import necessary types from settings definition
import {
	ViewMode,
	getViewSettingOrDefault,
} from "../../common/setting-definition";

// Remove the enum if it exists, use ViewMode type directly
// export type ViewMode = "inbox" | "forecast" | "projects" | "tags" | "review";

export class SidebarComponent extends Component {
	private containerEl: HTMLElement;
	private navEl: HTMLElement;
	private plugin: TaskProgressBarPlugin;
	private app: App;
	private currentViewId: ViewMode = "inbox";
	private isCollapsed: boolean = false;

	// Event handlers
	public onViewModeChanged: (viewId: ViewMode) => void = () => {};
	public onProjectSelected: (project: string) => void = () => {};

	constructor(parentEl: HTMLElement, plugin: TaskProgressBarPlugin) {
		super();
		this.containerEl = parentEl.createDiv({ cls: "task-sidebar" });
		this.plugin = plugin;
		this.app = plugin.app;
	}

	onload() {
		this.navEl = this.containerEl.createDiv({ cls: "sidebar-nav" });
		this.renderSidebarItems(); // Initial render
	}

	// New method to render sidebar items dynamically
	renderSidebarItems() {
		this.navEl.empty(); // Clear existing items

		// Ensure settings are initialized
		if (!this.plugin.settings.viewConfiguration) {
			// This should ideally be handled earlier, but as a fallback:
			console.warn(
				"SidebarComponent: viewConfiguration not initialized in settings."
			);
			return;
		}

		// 将视图分成顶部组和底部组
		const topViews = [];
		const bottomViews = ["calendar", "gantt", "kanban"]; // 这些视图将放在底部

		// 首先渲染顶部组视图
		this.plugin.settings.viewConfiguration.forEach((viewConfig) => {
			if (viewConfig.visible && !bottomViews.includes(viewConfig.id)) {
				this.createNavItem(
					viewConfig.id,
					t(viewConfig.name),
					viewConfig.icon
				);
				topViews.push(viewConfig.id);
			}
		});

		// 添加分隔符
		if (topViews.length > 0) {
			this.createNavSpacer();
		}

		// 然后渲染底部组视图
		this.plugin.settings.viewConfiguration.forEach((viewConfig) => {
			if (viewConfig.visible && bottomViews.includes(viewConfig.id)) {
				this.createNavItem(
					viewConfig.id,
					t(viewConfig.name),
					viewConfig.icon
				);
			}
		});

		// Highlight the currently active view
		this.updateActiveItem();
	}

	private createNavSpacer() {
		this.navEl.createDiv({ cls: "sidebar-nav-spacer" });
	}

	private createNavItem(viewId: ViewMode, label: string, icon: string) {
		const navItem = this.navEl.createDiv({
			cls: "sidebar-nav-item",
			attr: { "data-view-id": viewId },
		});

		const iconEl = navItem.createSpan({ cls: "nav-item-icon" });
		setIcon(iconEl, icon);

		navItem.createSpan({ cls: "nav-item-label", text: label });

		this.registerDomEvent(navItem, "click", () => {
			this.setViewMode(viewId);
			// Trigger the event for TaskView to handle the switch
			if (this.onViewModeChanged) {
				this.onViewModeChanged(viewId);
			}
		});

		return navItem;
	}

	// Updated setViewMode to accept ViewMode type and use viewId
	setViewMode(viewId: ViewMode) {
		this.currentViewId = viewId;
		this.updateActiveItem();
	}

	private updateActiveItem() {
		const items = this.navEl.querySelectorAll(".sidebar-nav-item");
		items.forEach((item) => {
			if (item.getAttribute("data-view-id") === this.currentViewId) {
				item.addClass("is-active");
			} else {
				item.removeClass("is-active");
			}
		});
	}

	setCollapsed(collapsed: boolean) {
		this.isCollapsed = collapsed;
		this.containerEl.toggleClass("collapsed", collapsed);
	}

	onunload() {
		this.containerEl.empty();
	}
}
