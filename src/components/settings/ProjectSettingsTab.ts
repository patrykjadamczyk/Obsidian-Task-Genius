import { App, Modal, Setting } from "obsidian";
import { TaskProgressBarSettingTab } from "../../setting";
import { t } from "../../translations/helper";
import TaskProgressBarPlugin from "../../index";

export function renderProjectSettingsTab(
	settingTab: TaskProgressBarSettingTab,
	containerEl: HTMLElement
) {
	new Setting(containerEl)
		.setName(t("Enhanced Project Configuration"))
		.setDesc(
			t("Configure advanced project detection and management features")
		)
		.setHeading();

	new Setting(containerEl)
		.setName(t("Enable enhanced project features"))
		.setDesc(
			t(
				"Enable path-based, metadata-based, and config file-based project detection"
			)
		)
		.addToggle((toggle) => {
			toggle
				.setValue(
					settingTab.plugin.settings.projectConfig
						?.enableEnhancedProject || false
				)
				.onChange(async (value) => {
					if (!settingTab.plugin.settings.projectConfig) {
						settingTab.plugin.settings.projectConfig = {
							enableEnhancedProject: false,
							pathMappings: [],
							metadataConfig: {
								metadataKey: "project",
								inheritFromFrontmatter: true,
								enabled: false,
							},
							configFile: {
								fileName: "project.md",
								searchRecursively: true,
								enabled: false,
							},
						};
					}
					settingTab.plugin.settings.projectConfig.enableEnhancedProject =
						value;
					settingTab.applySettingsUpdate();
					setTimeout(() => {
						settingTab.display();
					}, 200);
				});
		});

	if (settingTab.plugin.settings.projectConfig?.enableEnhancedProject) {
		new Setting(containerEl)
			.setName(t("Configure Enhanced Projects"))
			.setDesc(t("Open the enhanced project configuration dialog"))
			.addButton((button) => {
				button
					.setButtonText(t("Configure Projects"))
					.setCta()
					.onClick(() => {
						new EnhancedProjectConfigModal(
							settingTab.app,
							settingTab.plugin,
							() => {
								settingTab.applySettingsUpdate();
							}
						).open();
					});
			});
	}
}

class EnhancedProjectConfigModal extends Modal {
	constructor(
		app: App,
		private plugin: TaskProgressBarPlugin,
		private onSave: () => void
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		this.titleEl.setText(t("Enhanced Project Configuration"));

		// Path-based project mappings
		new Setting(contentEl)
			.setName(t("Path-based Project Mappings"))
			.setDesc(t("Configure project names based on file paths"))
			.setHeading();

		const pathMappingsContainer = contentEl.createDiv({
			cls: "project-path-mappings-container",
		});

		const refreshPathMappings = () => {
			pathMappingsContainer.empty();

			// Ensure pathMappings is always an array
			if (!this.plugin.settings.projectConfig) {
				this.plugin.settings.projectConfig = {
					enableEnhancedProject: false,
					pathMappings: [],
					metadataConfig: {
						metadataKey: "project",
						inheritFromFrontmatter: true,
						enabled: false,
					},
					configFile: {
						fileName: "project.md",
						searchRecursively: true,
						enabled: false,
					},
				};
			}

			if (
				!this.plugin.settings.projectConfig.pathMappings ||
				!Array.isArray(this.plugin.settings.projectConfig.pathMappings)
			) {
				this.plugin.settings.projectConfig.pathMappings = [];
			}

			const pathMappings =
				this.plugin.settings.projectConfig?.pathMappings || [];

			if (pathMappings.length === 0) {
				pathMappingsContainer.createDiv({
					cls: "no-mappings-message",
					text: t("No path mappings configured yet."),
				});
			}

			pathMappings.forEach((mapping, index) => {
				const mappingRow = pathMappingsContainer.createDiv({
					cls: "project-path-mapping-row",
				});

				new Setting(mappingRow)
					.setName(`${t("Mapping")} ${index + 1}`)
					.addText((text) => {
						text.setPlaceholder(
							t("Path pattern (e.g., Projects/Work)")
						)
							.setValue(mapping.pathPattern)
							.onChange(async (value) => {
								if (this.plugin.settings.projectConfig) {
									this.plugin.settings.projectConfig.pathMappings[
										index
									].pathPattern = value;
									await this.plugin.saveSettings();
								}
							});
					})
					.addText((text) => {
						text.setPlaceholder(t("Project name"))
							.setValue(mapping.projectName)
							.onChange(async (value) => {
								if (this.plugin.settings.projectConfig) {
									this.plugin.settings.projectConfig.pathMappings[
										index
									].projectName = value;
									await this.plugin.saveSettings();
								}
							});
					})
					.addToggle((toggle) => {
						toggle
							.setTooltip(t("Enabled"))
							.setValue(mapping.enabled)
							.onChange(async (value) => {
								if (this.plugin.settings.projectConfig) {
									this.plugin.settings.projectConfig.pathMappings[
										index
									].enabled = value;
									await this.plugin.saveSettings();
								}
							});
					})
					.addButton((button) => {
						button
							.setIcon("trash")
							.setTooltip(t("Remove"))
							.onClick(async () => {
								if (this.plugin.settings.projectConfig) {
									this.plugin.settings.projectConfig.pathMappings.splice(
										index,
										1
									);
									await this.plugin.saveSettings();
									refreshPathMappings();
								}
							});
					});
			});

			// Add new mapping button
			new Setting(pathMappingsContainer).addButton((button) => {
				button
					.setButtonText(t("Add Path Mapping"))
					.setCta()
					.onClick(async () => {
						// Ensure projectConfig exists
						if (!this.plugin.settings.projectConfig) {
							this.plugin.settings.projectConfig = {
								enableEnhancedProject: true,
								pathMappings: [],
								metadataConfig: {
									metadataKey: "project",
									inheritFromFrontmatter: true,
									enabled: false,
								},
								configFile: {
									fileName: "project.md",
									searchRecursively: true,
									enabled: false,
								},
							};
						}

						// Ensure pathMappings is an array
						if (
							!Array.isArray(
								this.plugin.settings.projectConfig.pathMappings
							)
						) {
							this.plugin.settings.projectConfig.pathMappings =
								[];
						}

						// Add new mapping
						this.plugin.settings.projectConfig.pathMappings.push({
							pathPattern: "",
							projectName: "",
							enabled: true,
						});

						await this.plugin.saveSettings();
						setTimeout(() => {
							refreshPathMappings();
						}, 100);
					});
			});
		};

		refreshPathMappings();

		// Metadata-based project configuration
		new Setting(contentEl)
			.setName(t("Metadata-based Project Configuration"))
			.setDesc(t("Configure project detection from file frontmatter"))
			.setHeading();

		new Setting(contentEl)
			.setName(t("Enable metadata project detection"))
			.setDesc(t("Detect project from file frontmatter metadata"))
			.addToggle((toggle) => {
				toggle
					.setValue(
						this.plugin.settings.projectConfig?.metadataConfig
							?.enabled || false
					)
					.onChange(async (value) => {
						if (
							this.plugin.settings.projectConfig?.metadataConfig
						) {
							this.plugin.settings.projectConfig.metadataConfig.enabled =
								value;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(contentEl)
			.setName(t("Metadata key"))
			.setDesc(t("The frontmatter key to use for project name"))
			.addText((text) => {
				text.setPlaceholder("project")
					.setValue(
						this.plugin.settings.projectConfig?.metadataConfig
							?.metadataKey || "project"
					)
					.onChange(async (value) => {
						if (
							this.plugin.settings.projectConfig?.metadataConfig
						) {
							this.plugin.settings.projectConfig.metadataConfig.metadataKey =
								value || "project";
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(contentEl)
			.setName(t("Inherit from frontmatter"))
			.setDesc(t("Inherit other metadata fields from file frontmatter"))
			.addToggle((toggle) => {
				toggle
					.setValue(
						this.plugin.settings.projectConfig?.metadataConfig
							?.inheritFromFrontmatter || true
					)
					.onChange(async (value) => {
						if (
							this.plugin.settings.projectConfig?.metadataConfig
						) {
							this.plugin.settings.projectConfig.metadataConfig.inheritFromFrontmatter =
								value;
							await this.plugin.saveSettings();
						}
					});
			});

		// Project config file settings
		new Setting(contentEl)
			.setName(t("Project Configuration File"))
			.setDesc(t("Configure project detection from project config files"))
			.setHeading();

		new Setting(contentEl)
			.setName(t("Enable config file project detection"))
			.setDesc(t("Detect project from project configuration files"))
			.addToggle((toggle) => {
				toggle
					.setValue(
						this.plugin.settings.projectConfig?.configFile
							?.enabled || false
					)
					.onChange(async (value) => {
						if (this.plugin.settings.projectConfig?.configFile) {
							this.plugin.settings.projectConfig.configFile.enabled =
								value;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(contentEl)
			.setName(t("Config file name"))
			.setDesc(t("Name of the project configuration file"))
			.addText((text) => {
				text.setPlaceholder("project.md")
					.setValue(
						this.plugin.settings.projectConfig?.configFile
							?.fileName || "project.md"
					)
					.onChange(async (value) => {
						if (this.plugin.settings.projectConfig?.configFile) {
							this.plugin.settings.projectConfig.configFile.fileName =
								value || "project.md";
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(contentEl)
			.setName(t("Search recursively"))
			.setDesc(t("Search for config files in parent directories"))
			.addToggle((toggle) => {
				toggle
					.setValue(
						this.plugin.settings.projectConfig?.configFile
							?.searchRecursively || true
					)
					.onChange(async (value) => {
						if (this.plugin.settings.projectConfig?.configFile) {
							this.plugin.settings.projectConfig.configFile.searchRecursively =
								value;
							await this.plugin.saveSettings();
						}
					});
			});

		// Save and cancel buttons
		new Setting(contentEl)
			.addButton((button) => {
				button
					.setButtonText(t("Save"))
					.setCta()
					.onClick(() => {
						this.onSave();
						this.close();
					});
			})
			.addButton((button) => {
				button.setButtonText(t("Cancel")).onClick(() => {
					this.close();
				});
			});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
