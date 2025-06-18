import { Setting } from "obsidian";
import { TaskProgressBarSettingTab } from "../../setting";
import { t } from "../../translations/helper";
import { ConfirmModal } from "../ConfirmModal";

export function renderBetaTestSettingsTab(
	settingTab: TaskProgressBarSettingTab,
	containerEl: HTMLElement
) {
	new Setting(containerEl)
		.setName(t("Beta Test Features"))
		.setDesc(
			t(
				"Experimental features that are currently in testing phase. These features may be unstable and could change or be removed in future updates."
			)
		)
		.setHeading();

	// Warning banner
	const warningBanner = containerEl.createDiv({
		cls: "beta-test-warning-banner",
	});

	warningBanner.createEl("div", {
		cls: "beta-warning-icon",
		text: "⚠️",
	});

	const warningContent = warningBanner.createDiv({
		cls: "beta-warning-content",
	});

	warningContent.createEl("div", {
		cls: "beta-warning-title",
		text: t("Beta Features Warning"),
	});

	const warningText = warningContent.createEl("div", {
		cls: "beta-warning-text",
		text: t(
			"These features are experimental and may be unstable. They could change significantly or be removed in future updates due to Obsidian API changes or other factors. Please use with caution and provide feedback to help improve these features."
		),
	});

	// Base View Settings
	new Setting(containerEl)
		.setName(t("Base View"))
		.setDesc(
			t(
				"Advanced view management features that extend the default Task Genius views with additional functionality."
			)
		)
		.setHeading();

	const descFragment = new DocumentFragment();
	descFragment.createEl("span", {
		text: t(
			"Enable experimental Base View functionality. This feature provides enhanced view management capabilities but may be affected by future Obsidian API changes. You may need to restart Obsidian to see the changes."
		),
	});

	descFragment.createEl("div", {
		text: t(
			"You need to close all bases view if you already create task view in them and remove unused view via edit them manually when disable this feature."
		),
		cls: "mod-warning",
	});

	new Setting(containerEl)
		.setName(t("Enable Base View"))
		.setDesc(descFragment)
		.addToggle((toggle) =>
			toggle
				.setValue(
					settingTab.plugin.settings.betaTest?.enableBaseView || false
				)
				.onChange(async (value) => {
					if (value) {
						new ConfirmModal(settingTab.plugin, {
							title: t("Enable Base View"),
							message: t(
								"Enable experimental Base View functionality. This feature provides enhanced view management capabilities but may be affected by future Obsidian API changes."
							),
							confirmText: t("Enable"),
							cancelText: t("Cancel"),
							onConfirm: (confirmed: boolean) => {
								if (!confirmed) {
									setTimeout(() => {
										toggle.setValue(false);
										settingTab.display();
									}, 200);
									return;
								}

								if (!settingTab.plugin.settings.betaTest) {
									settingTab.plugin.settings.betaTest = {
										enableBaseView: false,
									};
								}
								settingTab.plugin.settings.betaTest.enableBaseView =
									confirmed;
								settingTab.applySettingsUpdate();
								setTimeout(() => {
									settingTab.display();
								}, 200);
							},
						}).open();
					} else {
						if (settingTab.plugin.settings.betaTest) {
							settingTab.plugin.settings.betaTest.enableBaseView =
								false;
						}
						settingTab.applySettingsUpdate();
						setTimeout(() => {
							settingTab.display();
						}, 200);
					}
				})
		);

	// Feedback section
	new Setting(containerEl)
		.setName(t("Beta Feedback"))
		.setDesc(
			t(
				"Help improve these features by providing feedback on your experience."
			)
		)
		.setHeading();

	new Setting(containerEl)
		.setName(t("Report Issues"))
		.setDesc(
			t(
				"If you encounter any issues with beta features, please report them to help improve the plugin."
			)
		)
		.addButton((button) => {
			button.setButtonText(t("Report Issue")).onClick(() => {
				window.open(
					"https://github.com/quorafind/obsidian-task-genius/issues"
				);
			});
		});
}
