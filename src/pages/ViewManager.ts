/**
 * View Manager
 * 负责管理和注册自定义视图
 */

import { App, Component } from "obsidian";
import { FileTaskView } from "./FileTaskView";
import TaskProgressBarPlugin from "../index";
import "../styles/base-view.css";

export class ViewManager extends Component {
	private app: App;
	private basesPlugin: BasesPlugin | null = null;
	private registeredViews: Set<string> = new Set();
	private plugin: TaskProgressBarPlugin;

	constructor(app: App, plugin: TaskProgressBarPlugin) {
		super();
		this.app = app;
		this.plugin = plugin;
	}

	/**
	 * 获取 Bases 插件实例
	 */
	private getBasesPlugin(): BasesPlugin | null {
		try {
			// 使用你提供的方法获取插件
			const internalPlugins = (this.app as any).internalPlugins?.plugins;
			if (internalPlugins && internalPlugins["bases"]) {
				this.basesPlugin = internalPlugins["bases"].instance;
				console.log(
					"[ViewManager] Bases plugin found via internalPlugins"
				);
				return this.basesPlugin;
			}

			console.warn("[ViewManager] Bases plugin not found");
			return null;
		} catch (error) {
			console.error("[ViewManager] Error getting Bases plugin:", error);
			return null;
		}
	}

	/**
	 * 初始化视图管理器
	 */
	async initialize(): Promise<boolean> {
		console.log("[ViewManager] Initializing...");

		const basesPlugin = this.getBasesPlugin();
		console.log(basesPlugin);
		if (!basesPlugin) {
			console.error(
				"[ViewManager] Cannot initialize without Bases plugin"
			);
			return false;
		}

		try {
			// 注册所有自定义视图
			await this.registerAllViews();
			console.log("[ViewManager] Initialization completed successfully");
			return true;
		} catch (error) {
			console.error("[ViewManager] Initialization failed:", error);
			return false;
		}
	}

	/**
	 * 注册所有自定义视图
	 */
	private async registerAllViews(): Promise<void> {
		// 注册文件任务视图
		await this.registerFileTaskView();

		// 在这里可以注册更多视图
		// await this.registerTimelineView();
		// await this.registerKanbanView();
	}

	/**
	 * 注册文件任务视图
	 */
	private async registerFileTaskView(): Promise<void> {
		const viewId = "task-genius-view";

		if (this.registeredViews.has(viewId)) {
			console.log(`[ViewManager] View ${viewId} already registered`);
			return;
		}

		try {
			if (!this.basesPlugin) {
				throw new Error("Bases plugin not available");
			}

			// 注册视图工厂
			this.basesPlugin.registerView(viewId, (container: HTMLElement) => {
				console.log(`[ViewManager] Creating ${viewId} instance`);
				return new FileTaskView(container, this.app, this.plugin);
			});

			this.registeredViews.add(viewId);
			console.log(
				`[ViewManager] Successfully registered view: ${viewId}`
			);
		} catch (error) {
			console.error(
				`[ViewManager] Failed to register view ${viewId}:`,
				error
			);
			throw error;
		}
	}

	/**
	 * 注销视图
	 */
	unregisterView(viewId: string): void {
		try {
			if (this.basesPlugin && this.registeredViews.has(viewId)) {
				this.basesPlugin.deregisterView(viewId);
				this.registeredViews.delete(viewId);
				console.log(`[ViewManager] Unregistered view: ${viewId}`);
			}
		} catch (error) {
			console.error(
				`[ViewManager] Failed to unregister view ${viewId}:`,
				error
			);
		}
	}

	/**
	 * 注销所有视图
	 */
	unregisterAllViews(): void {
		console.log("[ViewManager] Unregistering all views...");

		for (const viewId of this.registeredViews) {
			this.unregisterView(viewId);
		}

		this.registeredViews.clear();
		console.log("[ViewManager] All views unregistered");
	}

	/**
	 * 获取已注册的视图列表
	 */
	getRegisteredViews(): string[] {
		return Array.from(this.registeredViews);
	}

	/**
	 * 检查视图是否已注册
	 */
	isViewRegistered(viewId: string): boolean {
		return this.registeredViews.has(viewId);
	}

	/**
	 * 获取 Bases 插件的可用视图类型
	 */
	getAvailableViewTypes(): string[] {
		if (!this.basesPlugin) {
			return [];
		}

		try {
			return this.basesPlugin.getViewTypes();
		} catch (error) {
			console.error("[ViewManager] Error getting view types:", error);
			return [];
		}
	}

	/**
	 * 创建视图实例（用于测试）
	 */
	createViewInstance(
		viewId: string,
		container: HTMLElement
	): BaseView | null {
		if (!this.basesPlugin) {
			console.error("[ViewManager] Bases plugin not available");
			return null;
		}

		try {
			const factory = this.basesPlugin.getViewFactory(viewId);
			if (factory) {
				return factory(container);
			} else {
				console.error(
					`[ViewManager] No factory found for view: ${viewId}`
				);
				return null;
			}
		} catch (error) {
			console.error(
				`[ViewManager] Error creating view instance ${viewId}:`,
				error
			);
			return null;
		}
	}

	/**
	 * 获取插件状态信息
	 */
	getStatus(): {
		basesPluginAvailable: boolean;
		registeredViewsCount: number;
		registeredViews: string[];
		availableViewTypes: string[];
	} {
		return {
			basesPluginAvailable: !!this.basesPlugin,
			registeredViewsCount: this.registeredViews.size,
			registeredViews: this.getRegisteredViews(),
			availableViewTypes: this.getAvailableViewTypes(),
		};
	}

	onload(): void {
		this.initialize();
	}

	onunload(): void {
		this.unregisterAllViews();
	}
}
