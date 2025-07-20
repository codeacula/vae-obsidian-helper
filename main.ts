import { App, Modal, Plugin, PluginSettingTab, Setting } from "obsidian";
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
			id: "create-person",
			name: "Create Person",
			callback: () => this.promptCreatePerson(),
		});

		this.addCommand({
			id: "create-project",
			name: "Create Project",
			callback: () => this.promptCreateProject(),
		});

		this.addCommand({
			id: "new-task",
			name: "New Task",
			callback: () => this.promptCreateTask(),
		});

		this.addCommand({
			id: "new-todo",
			name: "New To Do",
			callback: () => this.promptCreateTodo(),
		});

		// Add settings tab
		this.addSettingTab(new VaeSettingTab(this.app, this));
	}

	private async promptCreatePerson() {
		const modal = new TextInputModal(
			this.app,
			"Enter person's full name:",
			async (name: string) => {
				if (name.trim()) {
					const personFile = await this.personModule.createPersonNote(
						name.trim()
					);
					await this.app.workspace.getLeaf().openFile(personFile);
				}
			}
		);
		modal.open();
	}

	private async promptCreateProject() {
		const modal = new TextInputModal(
			this.app,
			"Enter project name:",
			async (name: string) => {
				if (name.trim()) {
					const { projectFile } =
						await this.projectModule.createProject(name.trim());
					await this.app.workspace.getLeaf().openFile(projectFile);
				}
			}
		);
		modal.open();
	}

	private async promptCreateTask() {
		const projects = await this.taskModule.getProjectFolders();
		if (projects.length === 0) {
			return;
		}

		const modal = new ProjectTaskModal(
			this.app,
			this.settings.projectFolder,
			async (projectName: string, taskName: string) => {
				if (projectName && taskName.trim()) {
					const taskFile = await this.taskModule.createTask(
						projectName,
						taskName.trim()
					);
					await this.app.workspace.getLeaf().openFile(taskFile);
				}
			}
		);
		modal.open();
	}

	private async promptCreateTodo() {
		const modal = new TextInputModal(
			this.app,
			"Enter todo name:",
			async (name: string) => {
				if (name.trim()) {
					const todoFile = await this.taskModule.createTodo(
						name.trim(),
						this.settings.todoFolder
					);
					await this.app.workspace.getLeaf().openFile(todoFile);
				}
			}
		);
		modal.open();
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
class TextInputModal extends Modal {
	private callback: (value: string) => void;
	private prompt: string;

	constructor(app: App, prompt: string, callback: (value: string) => void) {
		super(app);
		this.prompt = prompt;
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("vae-modal");

		contentEl.createEl("h2", { text: this.prompt, cls: "vae-modal-title" });

		const inputContainer = contentEl.createDiv("vae-input-container");
		const inputEl = inputContainer.createEl("input", {
			type: "text",
			placeholder: "Enter name...",
			cls: "vae-input",
		});
		inputEl.focus();

		const buttonContainer = contentEl.createDiv("vae-button-container");
		const submitButton = buttonContainer.createEl("button", {
			text: "Create",
			cls: "mod-cta vae-button",
		});
		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
			cls: "vae-button",
		});

		submitButton.onclick = () => {
			if (inputEl.value.trim()) {
				this.callback(inputEl.value);
				this.close();
			}
		};

		cancelButton.onclick = () => {
			this.close();
		};

		inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && inputEl.value.trim()) {
				this.callback(inputEl.value);
				this.close();
			} else if (e.key === "Escape") {
				this.close();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Modal for project task creation with autosuggestion
class ProjectTaskModal extends Modal {
	private projectFolder: string;
	private callback: (projectName: string, taskName: string) => void;
	private selectedProject = "";
	private projectSuggest?: InlineSuggest;

	constructor(
		app: App,
		projectFolder: string,
		callback: (projectName: string, taskName: string) => void
	) {
		super(app);
		this.projectFolder = projectFolder;
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("vae-modal");

		contentEl.createEl("h2", {
			text: "Create New Task",
			cls: "vae-modal-title",
		});

		// Project selection with inline autosuggestion
		const projectContainer = contentEl.createDiv("vae-field-container");
		projectContainer.createEl("label", {
			text: "Project:",
			cls: "vae-label",
		});

		const projectInput = projectContainer.createEl("input", {
			type: "text",
			placeholder: "Type to search for project...",
			cls: "vae-input",
		});

		// Setup inline suggestions for project input
		this.projectSuggest = new InlineSuggest(
			this.app,
			projectInput,
			(query: string) =>
				getProjectSuggestions(this.app, query, this.projectFolder),
			(selected: string) => {
				this.selectedProject = selected;
			}
		);

		// Task name input
		const taskContainer = contentEl.createDiv("vae-field-container");
		taskContainer.createEl("label", {
			text: "Task Name:",
			cls: "vae-label",
		});
		const taskInput = taskContainer.createEl("input", {
			type: "text",
			placeholder: "Enter task name...",
			cls: "vae-input",
		});

		const buttonContainer = contentEl.createDiv("vae-button-container");
		const submitButton = buttonContainer.createEl("button", {
			text: "Create Task",
			cls: "mod-cta vae-button",
		});
		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
			cls: "vae-button",
		});

		submitButton.onclick = () => {
			if (this.selectedProject && taskInput.value.trim()) {
				this.callback(this.selectedProject, taskInput.value);
				this.close();
			}
		};

		cancelButton.onclick = () => {
			this.close();
		};

		taskInput.addEventListener("keydown", (e) => {
			if (
				e.key === "Enter" &&
				this.selectedProject &&
				taskInput.value.trim()
			) {
				this.callback(this.selectedProject, taskInput.value);
				this.close();
			} else if (e.key === "Escape") {
				this.close();
			}
		});

		projectInput.focus();
	}

	onClose() {
		if (this.projectSuggest) {
			this.projectSuggest.destroy();
		}
		const { contentEl } = this;
		contentEl.empty();
	}
}

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

	private cleanupSuggestInstances() {
		this.suggestInstances.forEach((instance) => instance.destroy());
		this.suggestInstances = [];
	}

	hide() {
		this.cleanupSuggestInstances();
		super.hide();
	}
}
