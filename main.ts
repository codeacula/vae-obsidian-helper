import { App, Modal, Plugin, PluginSettingTab, Setting, Notice } from "obsidian";
import { PersonModule } from "./src/PersonModule";
import { ProjectModule } from "./src/ProjectModule";
import {
	InlineSuggest,
	getFileSuggestions,
	getFolderSuggestions,
	getProjectSuggestions,
} from "./src/SuggestModals";
import { TaskModule } from "./src/TaskModule";
import { TemplaterHelper } from "./src/TemplaterHelper";
import { ThoughtModule } from "./src/ThoughtModule";
import { DEFAULT_SETTINGS, VaeSettings } from "./src/VaeSettings";
import { NewItemModal, NewItemType } from "./src/NewItemModal";
import { ChatModal } from "./src/ChatModal";
import { listMarkdownFiles } from "./src/ChatUtils";

export default class VaePlugin extends Plugin {
	settings: VaeSettings;
	personModule: PersonModule;
	thoughtModule: ThoughtModule;
	projectModule: ProjectModule;
	taskModule: TaskModule;
	templaterHelper: TemplaterHelper;

	async onload() {
		await this.loadSettings();

		this.templaterHelper = new TemplaterHelper(this.app);
		this.personModule = new PersonModule(this);
		this.thoughtModule = new ThoughtModule(this);
		this.projectModule = new ProjectModule(this);
		this.taskModule = new TaskModule(this);

                // Add commands
                this.addCommand({
                        id: "vae-new-item",
                        name: "Create New Item",
                        callback: () => this.openNewItemModal(),
                });

                this.addCommand({
                        id: "vae-chat",
                        name: "Open Vae Chat",
                        callback: () => new ChatModal(this.app, this).open(),
                });

		// Add settings tab
		this.addSettingTab(new VaeSettingTab(this.app, this));
	}

        private openNewItemModal(type: NewItemType = "Person") {
                new NewItemModal(this.app, this, type).open();
        }

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

// Modal for text input

// Settings tab with inline autosuggestions
class VaeSettingTab extends PluginSettingTab {
	plugin: VaePlugin;
	private suggestInstances: InlineSuggest[] = [];

	constructor(app: App, plugin: VaePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// Clean up any existing suggest instances
		this.cleanupSuggestInstances();

		containerEl.createEl("h2", { text: "VAE Helper Settings" });

		// People settings
		containerEl.createEl("h3", { text: "People Module" });
		this.addFolderSetting(
			"People folder",
			"Folder where person notes will be created",
			"peopleFolder",
			"/My Knowledge/People"
		);
		this.addTemplateSetting(
			"Person template",
			"Template file for creating person notes",
			"personTemplate",
			"/Vae/System/Templates/People Template.md"
		);

		// Project settings
		containerEl.createEl("h3", { text: "Project Module" });
		this.addFolderSetting(
			"Project folder",
			"Folder where project folders will be created",
			"projectFolder",
			"/My Projects"
		);
		this.addTemplateSetting(
			"Project template",
			"Template file for creating project notes",
			"projectTemplate",
			"/Vae/System/Templates/Tasks/Project Template.md"
		);

		// Task settings
		containerEl.createEl("h3", { text: "Task Module" });
		this.addTemplateSetting(
			"Task template",
			"Template file for creating task notes",
			"taskTemplate",
			"/Vae/System/Templates/Tasks/Task Template.md"
		);
		this.addTemplateSetting(
			"Todo template",
			"Template file for creating todo notes",
			"todoTemplate",
			"/Vae/System/Templates/ToDo Template.md"
		);
		this.addFolderSetting(
			"Todo folder",
			"Folder where todo notes will be created",
			"todoFolder",
			"/My Consciousness/ToDos"
		);

		// Thought settings
		containerEl.createEl("h3", { text: "Thought Module" });
		this.addFolderSetting(
			"Thoughts folder",
			"Folder where thought notes will be created",
			"thoughtsFolder",
			"/My Consciousness/Thoughts"
		);
                this.addTemplateSetting(
                        "Thought template",
                        "Template file for creating thought notes",
                        "thoughtTemplate",
                        "/Vae/System/Templates/Thought Template.md"
                );

                // Chat settings
                containerEl.createEl("h3", { text: "Chat" });
                this.addFolderSetting(
                        "Personalities folder",
                        "Folder containing personality markdown files",
                        "personalitiesFolder",
                        "/Vae/System/Personalities"
                );
                this.addFolderSetting(
                        "Prompts folder",
                        "Folder containing extra prompt markdown files",
                        "promptsFolder",
                        "/Vae/System/Prompts"
                );
                this.addDropdownSetting(
                        "Default personality",
                        "Personality file used by default",
                        "defaultPersonality",
                        this.plugin.settings.personalitiesFolder
                );
                this.addDropdownSetting(
                        "Default prompt",
                        "Prompt used by default (optional)",
                        "defaultPrompt",
                        this.plugin.settings.promptsFolder,
                        true
                );
        }

	private addFolderSetting(
		name: string,
		desc: string,
		settingKey: keyof VaeSettings,
		placeholder: string
	) {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				text.setPlaceholder(placeholder)
					.setValue(this.plugin.settings[settingKey] as string)
					.onChange(async (value) => {
						(this.plugin.settings[settingKey] as string) = value;
						await this.plugin.saveSettings();
					});

				// Add inline suggestions after the input is created
				setTimeout(() => {
					const inputEl = text.inputEl;
					const suggestInstance = new InlineSuggest(
						this.app,
						inputEl,
						(query: string) =>
							getFolderSuggestions(this.app, query),
						async (selected: string) => {
							(this.plugin.settings[settingKey] as string) =
								selected;
							await this.plugin.saveSettings();
						}
					);
					this.suggestInstances.push(suggestInstance);
				}, 0);
			});
	}

        private addTemplateSetting(
                name: string,
                desc: string,
                settingKey: keyof VaeSettings,
                placeholder: string
        ) {
		new Setting(this.containerEl)
			.setName(name)
			.setDesc(desc)
			.addText((text) => {
				text.setPlaceholder(placeholder)
					.setValue(this.plugin.settings[settingKey] as string)
					.onChange(async (value) => {
						(this.plugin.settings[settingKey] as string) = value;
						await this.plugin.saveSettings();
					});

				// Add inline suggestions after the input is created
				setTimeout(() => {
					const inputEl = text.inputEl;
					const suggestInstance = new InlineSuggest(
						this.app,
						inputEl,
						(query: string) =>
							getFileSuggestions(this.app, query, ".md"),
						async (selected: string) => {
							(this.plugin.settings[settingKey] as string) =
								selected;
							await this.plugin.saveSettings();
						}
					);
                                this.suggestInstances.push(suggestInstance);
                        }, 0);
                });
        }

        private addDropdownSetting(
                name: string,
                desc: string,
                settingKey: keyof VaeSettings,
                folder: string,
                allowBlank = false
        ) {
                new Setting(this.containerEl)
                        .setName(name)
                        .setDesc(desc)
                        .addDropdown(async (dropdown) => {
                                const files = await listMarkdownFiles(this.app, folder);
                                if (allowBlank) {
                                        dropdown.addOption("", "(none)");
                                }
                                files.forEach((f) => dropdown.addOption(f.basename, f.basename));
                                dropdown.setValue(this.plugin.settings[settingKey] as string);
                                dropdown.onChange(async (val) => {
                                        (this.plugin.settings[settingKey] as string) = val;
                                        await this.plugin.saveSettings();
                                });
                        });
        }

	private cleanupSuggestInstances() {
		this.suggestInstances.forEach((instance) => instance.destroy());
		this.suggestInstances = [];
	}

	hide() {
		this.cleanupSuggestInstances();
		super.hide();
	}
}
