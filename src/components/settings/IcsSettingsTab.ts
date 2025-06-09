/**
 * ICS Settings Component
 * Provides UI for managing ICS calendar sources
 */

import {
	Setting,
	DropdownComponent,
	TextComponent,
	ToggleComponent,
	ButtonComponent,
	Modal,
	App,
	Notice,
	setIcon,
} from "obsidian";
import { IcsSource, IcsManagerConfig } from "../../types/ics";
import { t } from "../../translations/helper";
import TaskProgressBarPlugin from "../../index";
import "../../styles/ics-settings.css";
import { TaskProgressBarSettingTab } from "../../setting";

export class IcsSettingsComponent {
	private plugin: TaskProgressBarPlugin;
	private containerEl: HTMLElement;
	private config: IcsManagerConfig;
	private onBack?: () => void;

	constructor(
		plugin: TaskProgressBarPlugin,
		containerEl: HTMLElement,
		onBack?: () => void
	) {
		this.plugin = plugin;
		this.containerEl = containerEl;
		this.config = { ...plugin.settings.icsIntegration };
		this.onBack = onBack;
	}

	display(): void {
		this.containerEl.empty();
		this.containerEl.addClass("ics-settings-container");

		const backheader = this.containerEl.createDiv(
			"settings-tab-section-header"
		);
		// Header with back button
		const headerContainer = this.containerEl.createDiv(
			"ics-header-container"
		);

		if (this.onBack) {
			const button = new ButtonComponent(backheader)
				.setClass("header-button")
				.onClick(() => {
					this.onBack?.();
				});

			button.buttonEl.createEl(
				"span",
				{
					cls: "header-button-icon",
				},
				(el) => {
					setIcon(el, "arrow-left");
				}
			);
			button.buttonEl.createEl("span", {
				cls: "header-button-text",
				text: t("Back to main settings"),
			});
		}

		headerContainer.createEl("h2", {
			text: t("ICS Calendar Integration"),
		});

		headerContainer.createEl("p", {
			text: t(
				"Configure external calendar sources to display events in your task views."
			),
			cls: "ics-description",
		});

		// Global settings
		this.displayGlobalSettings();

		// Sources list
		this.displaySourcesList();

		// Add source button in a styled container
		const addSourceContainer = this.containerEl.createDiv(
			"ics-add-source-container"
		);
		const addButton = addSourceContainer.createEl("button", {
			text: "+ " + t("Add New Calendar Source"),
		});
		addButton.onclick = () => {
			new IcsSourceModal(this.plugin.app, (source) => {
				this.config.sources.push(source);
				this.saveAndRefresh();
			}).open();
		};

		// Add test button for Chinese Lunar Calendar
		const testContainer = this.containerEl.createDiv("ics-test-container");
		const testButton = testContainer.createEl("button", {
			text: "🧪 " + t("Test Chinese Lunar Calendar"),
			cls: "ics-test-button",
		});
		testButton.onclick = () => {
			this.testChineseLunarCalendar();
		};
	}

	private async testChineseLunarCalendar(): Promise<void> {
		const testSource: IcsSource = {
			id: "test-chinese-lunar",
			name: "Chinese Lunar Calendar (Test)",
			url: "https://lwlsw.github.io/Chinese-Lunar-Calendar-ics/chinese_lunar_my.ics",
			enabled: true,
			refreshInterval: 60,
			showAllDayEvents: true,
			showTimedEvents: true,
			showType: "event",
		};

		try {
			const icsManager = this.plugin.getIcsManager();
			if (!icsManager) {
				new Notice("ICS Manager not initialized");
				return;
			}

			new Notice("Testing Chinese Lunar Calendar ICS...");

			// Test the parser directly
			const response = await fetch(testSource.url);
			if (!response.ok) {
				throw new Error(
					`HTTP ${response.status}: ${response.statusText}`
				);
			}

			const icsContent = await response.text();
			console.log("ICS Content length:", icsContent.length);
			console.log("ICS Content preview:", icsContent.substring(0, 500));

			// Parse the ICS content
			const { IcsParser } = await import("../../utils/ics/IcsParser");
			const parseResult = IcsParser.parse(icsContent, testSource);

			console.log("Parse result:", parseResult);
			new Notice(
				`Successfully parsed ${parseResult.events.length} events from Chinese Lunar Calendar`
			);

			if (parseResult.errors.length > 0) {
				console.warn("Parse errors:", parseResult.errors);
				new Notice(
					`Parse completed with ${parseResult.errors.length} errors`
				);
			}

			// Show some sample events
			if (parseResult.events.length > 0) {
				const sampleEvents = parseResult.events.slice(0, 5);
				const eventList = sampleEvents
					.map(
						(event) =>
							`• ${event.summary} (${
								event.dtstart
									? new Date(
											event.dtstart
									  ).toLocaleDateString()
									: "No date"
							})`
					)
					.join("\n");

				new Notice(`Sample events:\n${eventList}`, 10000);
			}
		} catch (error) {
			console.error("Test failed:", error);
			new Notice(`Test failed: ${error.message}`);
		}
	}

	private displayGlobalSettings(): void {
		const globalContainer = this.containerEl.createDiv(
			"ics-global-settings"
		);
		globalContainer.createEl("h3", { text: t("Global Settings") });

		// Enable background refresh
		new Setting(globalContainer)
			.setName(t("Enable Background Refresh"))
			.setDesc(
				t("Automatically refresh calendar sources in the background")
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.config.enableBackgroundRefresh)
					.onChange((value) => {
						this.config.enableBackgroundRefresh = value;
						this.saveSettings();
					});
			});

		// Global refresh interval
		new Setting(globalContainer)
			.setName(t("Global Refresh Interval"))
			.setDesc(t("Default refresh interval for all sources (minutes)"))
			.addText((text) => {
				text.setPlaceholder("60")
					.setValue(this.config.globalRefreshInterval.toString())
					.onChange((value) => {
						const interval = parseInt(value, 10);
						if (!isNaN(interval) && interval > 0) {
							this.config.globalRefreshInterval = interval;
							this.saveSettings();
						}
					});
			});

		// Max cache age
		new Setting(globalContainer)
			.setName(t("Maximum Cache Age"))
			.setDesc(t("How long to keep cached data (hours)"))
			.addText((text) => {
				text.setPlaceholder("24")
					.setValue(this.config.maxCacheAge.toString())
					.onChange((value) => {
						const age = parseInt(value, 10);
						if (!isNaN(age) && age > 0) {
							this.config.maxCacheAge = age;
							this.saveSettings();
						}
					});
			});

		// Network timeout
		new Setting(globalContainer)
			.setName(t("Network Timeout"))
			.setDesc(t("Request timeout in seconds"))
			.addText((text) => {
				text.setPlaceholder("30")
					.setValue(this.config.networkTimeout.toString())
					.onChange((value) => {
						const timeout = parseInt(value, 10);
						if (!isNaN(timeout) && timeout > 0) {
							this.config.networkTimeout = timeout;
							this.saveSettings();
						}
					});
			});

		// Max events per source
		new Setting(globalContainer)
			.setName(t("Max Events Per Source"))
			.setDesc(t("Maximum number of events to load from each source"))
			.addText((text) => {
				text.setPlaceholder("1000")
					.setValue(this.config.maxEventsPerSource.toString())
					.onChange((value) => {
						const max = parseInt(value, 10);
						if (!isNaN(max) && max > 0) {
							this.config.maxEventsPerSource = max;
							this.saveSettings();
						}
					});
			});

		// Default event color
		new Setting(globalContainer)
			.setName(t("Default Event Color"))
			.setDesc(t("Default color for events without a specific color"))
			.addColorPicker((color) => {
				color
					.setValue(this.config.defaultEventColor)
					.onChange((value) => {
						this.config.defaultEventColor = value;
						this.saveSettings();
					});
			});
	}

	private displaySourcesList(): void {
		const sourcesContainer = this.containerEl.createDiv("ics-sources-list");
		sourcesContainer.createEl("h3", { text: t("Calendar Sources") });

		if (this.config.sources.length === 0) {
			const emptyState = sourcesContainer.createDiv("ics-empty-state");
			emptyState.createEl("p", {
				text: t(
					"No calendar sources configured. Add a source to get started."
				),
			});
			return;
		}

		this.config.sources.forEach((source, index) => {
			const sourceContainer =
				sourcesContainer.createDiv("ics-source-item");

			// Source header
			const sourceHeader = sourceContainer.createDiv("ics-source-header");

			const titleContainer = sourceHeader.createDiv("ics-source-title");
			titleContainer.createEl("strong", { text: source.name });

			const statusEl = sourceHeader.createEl("span", {
				cls: "ics-source-status",
			});
			statusEl.setText(
				source.enabled ? t("ICS Enabled") : t("ICS Disabled")
			);
			statusEl.addClass(
				source.enabled ? "status-enabled" : "status-disabled"
			);

			// Source details
			const sourceDetails =
				sourceContainer.createDiv("ics-source-details");
			sourceDetails.createEl("div", {
				text: `${t("URL")}: ${this.truncateUrl(source.url)}`,
				title: source.url, // Show full URL on hover
			});
			sourceDetails.createEl("div", {
				text: `${t("Refresh")}: ${source.refreshInterval}${t("min")}`,
			});
			if (source.color) {
				const colorDiv = sourceDetails.createEl("div");
				colorDiv.innerHTML = `${t(
					"Color"
				)}: <span style="display: inline-block; width: 12px; height: 12px; background: ${
					source.color
				}; border-radius: 2px; margin-left: 4px; vertical-align: middle;"></span> ${
					source.color
				}`;
			}

			// Source actions - reorganized for better UX
			const sourceActions =
				sourceContainer.createDiv("ics-source-actions");

			// Primary actions (left side)
			const primaryActions = sourceActions.createDiv("primary-actions");

			// Edit button (most common action)
			const editButton = primaryActions.createEl("button", {
				text: t("Edit"),
				cls: "mod-cta",
				title: t("Edit this calendar source"),
			});
			editButton.onclick = () => {
				new IcsSourceModal(
					this.plugin.app,
					(updatedSource) => {
						this.config.sources[index] = updatedSource;
						this.saveAndRefresh();
					},
					source
				).open();
			};

			// Sync button
			const syncButton = primaryActions.createEl("button", {
				text: t("Sync"),
				title: t("Sync this calendar source now"),
			});
			syncButton.onclick = async () => {
				syncButton.disabled = true;
				syncButton.addClass("syncing");
				syncButton.setText("⟳ " + t("Syncing..."));

				try {
					const icsManager = this.plugin.getIcsManager();
					if (icsManager) {
						const result = await icsManager.syncSource(source.id);
						if (result.success) {
							new Notice(t("Sync completed successfully"));
							syncButton.removeClass("syncing");
							syncButton.addClass("success");
							setTimeout(
								() => syncButton.removeClass("success"),
								2000
							);
						} else {
							new Notice(t("Sync failed: ") + result.error);
							syncButton.removeClass("syncing");
							syncButton.addClass("error");
							setTimeout(
								() => syncButton.removeClass("error"),
								2000
							);
						}
					}
				} catch (error) {
					new Notice(t("Sync failed: ") + error.message);
					syncButton.removeClass("syncing");
					syncButton.addClass("error");
					setTimeout(() => syncButton.removeClass("error"), 2000);
				} finally {
					syncButton.disabled = false;
					syncButton.setText(t("Sync"));
				}
			};

			// Secondary actions (right side)
			const secondaryActions =
				sourceActions.createDiv("secondary-actions");

			// Toggle button
			const toggleButton = secondaryActions.createEl("button", {
				text: source.enabled ? t("Disable") : t("Enable"),
				title: source.enabled
					? t("Disable this source")
					: t("Enable this source"),
			});
			toggleButton.onclick = () => {
				this.config.sources[index].enabled =
					!this.config.sources[index].enabled;
				this.saveAndRefresh();
			};

			// Delete button (destructive action, placed last)
			const deleteButton = secondaryActions.createEl("button", {
				text: t("Delete"),
				cls: "mod-warning",
				title: t("Delete this calendar source"),
			});
			deleteButton.onclick = () => {
				if (
					confirm(
						t(
							"Are you sure you want to delete this calendar source?"
						)
					)
				) {
					this.config.sources.splice(index, 1);
					this.saveAndRefresh();
				}
			};
		});
	}

	private truncateUrl(url: string, maxLength: number = 50): string {
		if (url.length <= maxLength) return url;
		return url.substring(0, maxLength - 3) + "...";
	}

	private saveSettings(): void {
		this.plugin.settings.icsIntegration = { ...this.config };
		this.plugin.saveSettings();

		// Update ICS manager configuration
		const icsManager = this.plugin.getIcsManager();
		if (icsManager) {
			icsManager.updateConfig(this.config);
		}
	}

	private saveAndRefresh(): void {
		this.saveSettings();
		this.display(); // Refresh the display
	}
}

/**
 * Modal for adding/editing ICS sources
 */
class IcsSourceModal extends Modal {
	private source: IcsSource;
	private onSave: (source: IcsSource) => void;
	private isEditing: boolean;

	constructor(
		app: App,
		onSave: (source: IcsSource) => void,
		existingSource?: IcsSource
	) {
		super(app);
		this.onSave = onSave;
		this.isEditing = !!existingSource;

		if (existingSource) {
			this.source = { ...existingSource };
		} else {
			this.source = {
				id: this.generateId(),
				name: "",
				url: "",
				enabled: true,
				refreshInterval: 60,
				showAllDayEvents: true,
				showTimedEvents: true,
				showType: "event",
			};
		}
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl("h2", {
			text: this.isEditing ? t("Edit ICS Source") : t("Add ICS Source"),
		});

		// Name
		new Setting(contentEl)
			.setName(t("ICS Source Name"))
			.setDesc(t("Display name for this calendar source"))
			.addText((text) => {
				text.setPlaceholder(t("My Calendar"))
					.setValue(this.source.name)
					.onChange((value) => {
						this.source.name = value;
					});
			});

		// URL
		new Setting(contentEl)
			.setName(t("ICS URL"))
			.setDesc(t("URL to the ICS/iCal file"))
			.addText((text) => {
				text.setPlaceholder("https://example.com/calendar.ics")
					.setValue(this.source.url)
					.onChange((value) => {
						this.source.url = value;
					});
			});

		// Enabled
		new Setting(contentEl)
			.setName(t("ICS Enabled"))
			.setDesc(t("Whether this source is active"))
			.addToggle((toggle) => {
				toggle.setValue(this.source.enabled).onChange((value) => {
					this.source.enabled = value;
				});
			});

		// Refresh interval
		new Setting(contentEl)
			.setName(t("Refresh Interval"))
			.setDesc(t("How often to refresh this source (minutes)"))
			.addText((text) => {
				text.setPlaceholder("60")
					.setValue(this.source.refreshInterval.toString())
					.onChange((value) => {
						const interval = parseInt(value, 10);
						if (!isNaN(interval) && interval > 0) {
							this.source.refreshInterval = interval;
						}
					});
			});

		// Color
		new Setting(contentEl)
			.setName(t("Color"))
			.setDesc(t("Color for events from this source (optional)"))
			.addText((text) => {
				text.setPlaceholder("#3b82f6")
					.setValue(this.source.color || "")
					.onChange((value) => {
						if (!value || value.match(/^#[0-9a-fA-F]{6}$/)) {
							this.source.color = value || undefined;
						}
					});
			});

		// Show type
		new Setting(contentEl)
			.setName(t("Show Type"))
			.setDesc(
				t("How to display events from this source in calendar views")
			)
			.addDropdown((dropdown) => {
				dropdown
					.addOption("event", t("Event"))
					.addOption("badge", t("Badge"))
					.setValue(this.source.showType)
					.onChange((value) => {
						this.source.showType = value as "event" | "badge";
					});
			});

		// Show all-day events
		new Setting(contentEl)
			.setName(t("Show All-Day Events"))
			.setDesc(t("Include all-day events from this source"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.source.showAllDayEvents)
					.onChange((value) => {
						this.source.showAllDayEvents = value;
					});
			});

		// Show timed events
		new Setting(contentEl)
			.setName(t("Show Timed Events"))
			.setDesc(t("Include timed events from this source"))
			.addToggle((toggle) => {
				toggle
					.setValue(this.source.showTimedEvents)
					.onChange((value) => {
						this.source.showTimedEvents = value;
					});
			});

		// Authentication section
		const authContainer = contentEl.createDiv();
		authContainer.createEl("h3", { text: t("Authentication (Optional)") });

		// Auth type
		new Setting(authContainer)
			.setName(t("Authentication Type"))
			.setDesc(t("Type of authentication required"))
			.addDropdown((dropdown) => {
				dropdown
					.addOption("none", t("ICS Auth None"))
					.addOption("basic", t("Basic Auth"))
					.addOption("bearer", t("Bearer Token"))
					.addOption("custom", t("Custom Headers"))
					.setValue(this.source.auth?.type || "none")
					.onChange((value) => {
						if (value === "none") {
							this.source.auth = undefined;
						} else {
							this.source.auth = {
								type: value as any,
								...this.source.auth,
							};
						}
						this.refreshAuthFields(authContainer);
					});
			});

		this.refreshAuthFields(authContainer);

		// Buttons
		const buttonContainer = contentEl.createDiv("modal-button-container");

		const saveButton = buttonContainer.createEl("button", {
			text: t("Save"),
			cls: "mod-cta",
		});
		saveButton.onclick = () => {
			if (this.validateSource()) {
				this.onSave(this.source);
				this.close();
			}
		};

		const cancelButton = buttonContainer.createEl("button", {
			text: t("Cancel"),
		});
		cancelButton.onclick = () => {
			this.close();
		};
	}

	private refreshAuthFields(container: HTMLElement): void {
		// Remove existing auth fields
		const existingFields = container.querySelectorAll(".auth-field");
		existingFields.forEach((field) => field.remove());

		if (!this.source.auth || this.source.auth.type === "none") {
			return;
		}

		switch (this.source.auth.type) {
			case "basic":
				new Setting(container)
					.setName(t("ICS Username"))
					.setClass("auth-field")
					.addText((text) => {
						text.setValue(
							this.source.auth?.username || ""
						).onChange((value) => {
							if (this.source.auth) {
								this.source.auth.username = value;
							}
						});
					});

				new Setting(container)
					.setName(t("ICS Password"))
					.setClass("auth-field")
					.addText((text) => {
						text.setValue(
							this.source.auth?.password || ""
						).onChange((value) => {
							if (this.source.auth) {
								this.source.auth.password = value;
							}
						});
						text.inputEl.type = "password";
					});
				break;

			case "bearer":
				new Setting(container)
					.setName(t("ICS Bearer Token"))
					.setClass("auth-field")
					.addText((text) => {
						text.setValue(this.source.auth?.token || "").onChange(
							(value) => {
								if (this.source.auth) {
									this.source.auth.token = value;
								}
							}
						);
					});
				break;

			case "custom":
				new Setting(container)
					.setName(t("Custom Headers"))
					.setDesc(t("JSON object with custom headers"))
					.setClass("auth-field")
					.addTextArea((text) => {
						text.setValue(
							JSON.stringify(
								this.source.auth?.headers || {},
								null,
								2
							)
						).onChange((value) => {
							try {
								const headers = JSON.parse(value);
								if (this.source.auth) {
									this.source.auth.headers = headers;
								}
							} catch {
								// Invalid JSON, ignore
							}
						});
					});
				break;
		}
	}

	private validateSource(): boolean {
		if (!this.source.name.trim()) {
			new Notice(t("Please enter a name for the source"));
			return false;
		}

		if (!this.source.url.trim()) {
			new Notice(t("Please enter a URL for the source"));
			return false;
		}

		try {
			new URL(this.source.url);
		} catch {
			new Notice(t("Please enter a valid URL"));
			return false;
		}

		return true;
	}

	private generateId(): string {
		return `ics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}
}
