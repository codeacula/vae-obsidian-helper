import { App, Modal, Plugin, PluginSettingTab, Setting } from "obsidian";
import { PersonModule } from "./src/PersonModule";
import { DEFAULT_SETTINGS, PluginSettings } from "./src/PluginSettings";
import { ProjectModule } from "./src/ProjectModule";
import { TaskModule } from "./src/TaskModule";
import { TemplaterHelper } from "./src/TemplaterHelper";
import { ThoughtModule } from "./src/ThoughtModule";

export default class VaePlugin extends Plugin {
	settings: PluginSettings;
	personModule: PersonModule;
	thoughtModule: ThoughtModule;
	projectModule: ProjectModule;
	taskModule: TaskModule;
	templaterHelper: TemplaterHelper;

	async onload() {
		await this.loadSettings();

		this.templaterHelper = new TemplaterHelper(this.app);

		this.personModule = new PersonModule({
			vault: this.app.vault,
			peopleFolder: this.settings.peopleFolder,
			personTemplate: this.settings.personTemplate,
			templaterHelper: this.templaterHelper,
			logger: (msg) => console.log("[PersonModule]", msg),
		});

		this.thoughtModule = new ThoughtModule({
			vault: this.app.vault,
			thoughtsFolder: this.settings.thoughtsFolder,
			thoughtTemplate: this.settings.thoughtTemplate,
			logger: (msg) => console.log("[ThoughtModule]", msg),
		});

		this.projectModule = new ProjectModule({
			vault: this.app.vault,
			projectFolder: this.settings.projectFolder,
			projectTemplate: this.settings.projectTemplate,
			logger: (msg) => console.log("[ProjectModule]", msg),
		});

		this.taskModule = new TaskModule({
			vault: this.app.vault,
			projectFolder: this.settings.projectFolder,
			taskTemplate: this.settings.taskTemplate,
			todoTemplate: this.settings.todoTemplate,
			logger: (msg) => console.log("[TaskModule]", msg),
		});

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

		this.addCommand({
			id: "process-thought",
			name: "Process Thought",
			callback: () => this.processThought(),
		});

		this.addRibbonIcon("checkmark", "Process Thought", () =>
			this.processThought()
		);

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
			projects,
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

	private async processThought() {
		const { workspace, vault } = this.app;
		const file = workspace.getActiveFile();
		if (!file) return;

		const now = new Date();
		const isoNow = now.toISOString();
		await this.app.fileManager.processFrontMatter(file, (fm) => {
			fm["note-status"] = "processed";
			fm["processed"] = isoNow;
		});

		const content = await vault.read(file);
		const cleaned = content.replace(/```meta-bind-button[\s\S]*?```/, "");
		await vault.modify(file, cleaned);
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

// Modal for project task creation
class ProjectTaskModal extends Modal {
	private projects: string[];
	private callback: (projectName: string, taskName: string) => void;

	constructor(
		app: App,
		projects: string[],
		callback: (projectName: string, taskName: string) => void
	) {
		super(app);
		this.projects = projects;
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("vae-modal");

		contentEl.createEl("h2", {
			text: "Create New Task",
			cls: "vae-modal-title",
		});

		// Project selection
		const projectContainer = contentEl.createDiv("vae-field-container");
		projectContainer.createEl("label", {
			text: "Select Project:",
			cls: "vae-label",
		});
		const projectSelect = projectContainer.createEl("select", {
			cls: "vae-select",
		});
		this.projects.forEach((project) => {
			projectSelect.createEl("option", {
				value: project,
				text: project,
			});
		});

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
			if (taskInput.value.trim()) {
				this.callback(projectSelect.value, taskInput.value);
				this.close();
			}
		};

		cancelButton.onclick = () => {
			this.close();
		};

		taskInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && taskInput.value.trim()) {
				this.callback(projectSelect.value, taskInput.value);
				this.close();
			} else if (e.key === "Escape") {
				this.close();
			}
		});

		taskInput.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Settings tab with file selectors
class VaeSettingTab extends PluginSettingTab {
	plugin: VaePlugin;

	constructor(app: App, plugin: VaePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

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
		settingKey: keyof PluginSettings,
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
			})
			.addButton((button) => {
				button
					.setButtonText("Browse")
					.setTooltip("Select folder")
					.onClick(() => {
						const modal = new FolderSelectorModal(
							this.app,
							(selectedFolder: string) => {
								(this.plugin.settings[settingKey] as string) =
									selectedFolder;
								this.plugin.saveSettings();
								this.display(); // Refresh the settings display
							}
						);
						modal.open();
					});
			});
	}

	private addTemplateSetting(
		name: string,
		desc: string,
		settingKey: keyof PluginSettings,
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
			})
			.addButton((button) => {
				button
					.setButtonText("Browse")
					.setTooltip("Select template file")
					.onClick(() => {
						const modal = new FileSelectorModal(
							this.app,
							(selectedFile: string) => {
								(this.plugin.settings[settingKey] as string) =
									selectedFile;
								this.plugin.saveSettings();
								this.display(); // Refresh the settings display
							},
							".md"
						);
						modal.open();
					});
			});
	}
}

// Modal for folder selection
class FolderSelectorModal extends Modal {
	private callback: (folderPath: string) => void;

	constructor(app: App, callback: (folderPath: string) => void) {
		super(app);
		this.callback = callback;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("vae-modal");

		contentEl.createEl("h2", {
			text: "Select Folder",
			cls: "vae-modal-title",
		});

		const folderContainer = contentEl.createDiv("vae-folder-list");

		// Get all folders
		const folders = this.app.vault
			.getAllLoadedFiles()
			.filter((file) => file.hasOwnProperty("children"))
			.map((folder) => folder.path)
			.sort();

		// Add root option
		const rootOption = folderContainer.createDiv("vae-folder-option");
		rootOption.textContent = "/ (Root)";
		rootOption.onclick = () => {
			this.callback("/");
			this.close();
		};

		// Add folder options
		folders.forEach((folderPath) => {
			const folderOption = folderContainer.createDiv("vae-folder-option");
			folderOption.textContent = folderPath;
			folderOption.onclick = () => {
				this.callback(folderPath);
				this.close();
			};
		});

		const buttonContainer = contentEl.createDiv("vae-button-container");
		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
			cls: "vae-button",
		});
		cancelButton.onclick = () => this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

// Modal for file selection
class FileSelectorModal extends Modal {
	private callback: (filePath: string) => void;
	private extension?: string;

	constructor(
		app: App,
		callback: (filePath: string) => void,
		extension?: string
	) {
		super(app);
		this.callback = callback;
		this.extension = extension;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("vae-modal");

		contentEl.createEl("h2", {
			text: "Select File",
			cls: "vae-modal-title",
		});

		const fileContainer = contentEl.createDiv("vae-file-list");

		// Get all files
		let files = this.app.vault.getMarkdownFiles();

		// Filter by extension if specified
		if (this.extension && this.extension.length > 0) {
			const ext = this.extension;
			files = files.filter((file) => file.path.endsWith(ext));
		}

		files.sort((a, b) => a.path.localeCompare(b.path));

		// Add file options
		files.forEach((file) => {
			const fileOption = fileContainer.createDiv("vae-file-option");
			fileOption.textContent = file.path;
			fileOption.onclick = () => {
				this.callback(file.path);
				this.close();
			};
		});

		const buttonContainer = contentEl.createDiv("vae-button-container");
		const cancelButton = buttonContainer.createEl("button", {
			text: "Cancel",
			cls: "vae-button",
		});
		cancelButton.onclick = () => this.close();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
