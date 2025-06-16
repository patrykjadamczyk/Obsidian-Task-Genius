import { Setting, Notice, App } from "obsidian";
import { TaskProgressBarSettingTab } from "../../setting";
import { t } from "../../translations/helper";

export function renderQuickCaptureSettingsTab(
	settingTab: TaskProgressBarSettingTab,
	containerEl: HTMLElement
) {
	new Setting(containerEl).setName(t("Quick capture")).setHeading();

	new Setting(containerEl)
		.setName(t("Enable quick capture"))
		.setDesc(
			t(
				"Toggle this to enable Org-mode style quick capture panel. Press Alt+C to open the capture panel."
			)
		)
		.addToggle((toggle) =>
			toggle
				.setValue(
					settingTab.plugin.settings.quickCapture.enableQuickCapture
				)
				.onChange(async (value) => {
					settingTab.plugin.settings.quickCapture.enableQuickCapture =
						value;
					settingTab.applySettingsUpdate();
				})
		);

	if (!settingTab.plugin.settings.quickCapture.enableQuickCapture) return;

	// Target type selection
	new Setting(containerEl)
		.setName(t("Target type"))
		.setDesc(t("Choose whether to capture to a fixed file or daily note"))
		.addDropdown((dropdown) =>
			dropdown
				.addOption("fixed", t("Fixed file"))
				.addOption("daily-note", t("Daily note"))
				.setValue(settingTab.plugin.settings.quickCapture.targetType)
				.onChange(async (value) => {
					settingTab.plugin.settings.quickCapture.targetType =
						value as "fixed" | "daily-note";
					settingTab.applySettingsUpdate();
					// Refresh the settings display to show/hide relevant options
					setTimeout(() => {
						settingTab.display();
					}, 100);
				})
		);

	// Fixed file settings
	if (settingTab.plugin.settings.quickCapture.targetType === "fixed") {
		new Setting(containerEl)
			.setName(t("Target file"))
			.setDesc(
				t(
					"The file where captured text will be saved. You can include a path, e.g., 'folder/Quick Capture.md'. Supports date templates like {{DATE:YYYY-MM-DD}} or {{date:YYYY-MM-DD-HHmm}}"
				)
			)
			.addText((text) =>
				text
					.setValue(
						settingTab.plugin.settings.quickCapture.targetFile
					)
					.onChange(async (value) => {
						settingTab.plugin.settings.quickCapture.targetFile =
							value;
						settingTab.applySettingsUpdate();
					})
			);
	}

	// Daily note settings
	if (settingTab.plugin.settings.quickCapture.targetType === "daily-note") {
		// Sync with daily notes plugin button
		new Setting(containerEl)
			.setName(t("Sync with Daily Notes plugin"))
			.setDesc(
				t("Automatically sync settings from the Daily Notes plugin")
			)
			.addButton((button) =>
				button.setButtonText(t("Sync now")).onClick(async () => {
					try {
						// Get daily notes plugin settings
						const dailyNotesPlugin = (settingTab.app as any)
							.internalPlugins.plugins["daily-notes"];
						if (dailyNotesPlugin && dailyNotesPlugin.enabled) {
							const dailyNotesSettings =
								dailyNotesPlugin.instance?.options || {};

							console.log(dailyNotesSettings);

							settingTab.plugin.settings.quickCapture.dailyNoteSettings =
								{
									format:
										dailyNotesSettings.format ||
										"YYYY-MM-DD",
									folder: dailyNotesSettings.folder || "",
									template: dailyNotesSettings.template || "",
								};

							await settingTab.plugin.saveSettings();

							// Refresh the settings display
							setTimeout(() => {
								settingTab.display();
							}, 200);

							new Notice(
								t("Daily notes settings synced successfully")
							);
						} else {
							new Notice(t("Daily Notes plugin is not enabled"));
						}
					} catch (error) {
						console.error(
							"Failed to sync daily notes settings:",
							error
						);
						new Notice(t("Failed to sync daily notes settings"));
					}
				})
			);

		new Setting(containerEl)
			.setName(t("Daily note format"))
			.setDesc(t("Date format for daily notes (e.g., YYYY-MM-DD)"))
			.addText((text) =>
				text
					.setValue(
						settingTab.plugin.settings.quickCapture
							.dailyNoteSettings?.format || "YYYY-MM-DD"
					)
					.onChange(async (value) => {
						settingTab.plugin.settings.quickCapture.dailyNoteSettings.format =
							value;
						settingTab.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("Daily note folder"))
			.setDesc(t("Folder path for daily notes (leave empty for root)"))
			.addText((text) =>
				text
					.setValue(
						settingTab.plugin.settings.quickCapture
							.dailyNoteSettings?.folder || ""
					)
					.onChange(async (value) => {
						settingTab.plugin.settings.quickCapture.dailyNoteSettings.folder =
							value;
						settingTab.applySettingsUpdate();
					})
			);

		new Setting(containerEl)
			.setName(t("Daily note template"))
			.setDesc(t("Template file path for new daily notes (optional)"))
			.addText((text) =>
				text
					.setValue(
						settingTab.plugin.settings.quickCapture
							.dailyNoteSettings?.template || ""
					)
					.onChange(async (value) => {
						settingTab.plugin.settings.quickCapture.dailyNoteSettings.template =
							value;
						settingTab.applySettingsUpdate();
					})
			);
	}

	// Target heading setting (for both types)
	new Setting(containerEl)
		.setName(t("Target heading"))
		.setDesc(
			t(
				"Optional heading to append content under (leave empty to append to file)"
			)
		)
		.addText((text) =>
			text
				.setValue(
					settingTab.plugin.settings.quickCapture.targetHeading || ""
				)
				.onChange(async (value) => {
					settingTab.plugin.settings.quickCapture.targetHeading =
						value;
					settingTab.applySettingsUpdate();
				})
		);

	new Setting(containerEl)
		.setName(t("Placeholder text"))
		.setDesc(t("Placeholder text to display in the capture panel"))
		.addText((text) =>
			text
				.setValue(settingTab.plugin.settings.quickCapture.placeholder)
				.onChange(async (value) => {
					settingTab.plugin.settings.quickCapture.placeholder = value;
					settingTab.applySettingsUpdate();
				})
		);

	new Setting(containerEl)
		.setName(t("Append to file"))
		.setDesc(t("How to add captured content to the target location"))
		.addDropdown((dropdown) =>
			dropdown
				.addOption("append", t("Append"))
				.addOption("prepend", t("Prepend"))
				.addOption("replace", t("Replace"))
				.setValue(settingTab.plugin.settings.quickCapture.appendToFile)
				.onChange(async (value) => {
					settingTab.plugin.settings.quickCapture.appendToFile =
						value as "append" | "prepend" | "replace";
					settingTab.applySettingsUpdate();
				})
		);
}
