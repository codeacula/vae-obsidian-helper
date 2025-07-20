import { TFile, TFolder, Vault, normalizePath } from "obsidian";

export interface TaskModuleOptions {
	vault: Vault;
	projectFolder?: string;
	taskTemplate?: string;
	todoTemplate?: string;
	logger?: (msg: string) => void;
}

export class TaskModule {
	private vault: Vault;
	private projectFolder: string;
	private taskTemplate?: string;
	private todoTemplate?: string;
	private logger: (msg: string) => void;

	constructor(options: TaskModuleOptions) {
		this.vault = options.vault;
		this.projectFolder = options.projectFolder || "/My Projects";
		this.taskTemplate = options.taskTemplate;
		this.todoTemplate = options.todoTemplate;
		this.logger = options.logger || (() => {});
	}

	// Get list of all project folders for selection
	async getProjectFolders(): Promise<string[]> {
		const projectsFolder = this.vault.getAbstractFileByPath(
			normalizePath(this.projectFolder)
		);
		if (!(projectsFolder instanceof TFolder)) {
			return [];
		}

		return projectsFolder.children
			.filter((child) => child instanceof TFolder)
			.map((folder) => folder.name);
	}

	// Creates a new task note in the specified project's Tasks folder
	async createTask(projectName: string, taskName: string): Promise<TFile> {
		const tasksFolderPath = normalizePath(
			`${this.projectFolder}/${projectName}/Tasks`
		);
		const taskNotePath = normalizePath(`${tasksFolderPath}/${taskName}.md`);

		// Ensure Tasks folder exists
		let tasksFolder = this.vault.getAbstractFileByPath(tasksFolderPath);
		if (!tasksFolder) {
			this.logger(`Creating tasks folder: ${tasksFolderPath}`);
			tasksFolder = await this.vault.createFolder(tasksFolderPath);
		}
		if (!(tasksFolder instanceof TFolder)) {
			throw new Error(
				`Path exists but is not a folder: ${tasksFolderPath}`
			);
		}

		// Create task note from template
		let content = `# ${taskName}\n`;
		if (this.taskTemplate) {
			const templateFile = this.vault.getAbstractFileByPath(
				this.taskTemplate
			);
			if (templateFile instanceof TFile) {
				content = await this.vault.read(templateFile);
				content = content.replace(/\{\{name\}\}/g, taskName);
			} else {
				this.logger(
					`Template not found: ${this.taskTemplate}, using default content.`
				);
			}
		}

		this.logger(`Creating task note: ${taskNotePath}`);
		return this.vault.create(taskNotePath, content);
	}

	// Creates a new todo note (not associated with a project)
	async createTodo(
		todoName: string,
		todoFolder = "/My Core/Tasks"
	): Promise<TFile> {
		const todoFolderPath = normalizePath(todoFolder);
		const todoNotePath = normalizePath(`${todoFolderPath}/${todoName}.md`);

		// Ensure todo folder exists
		let folder = this.vault.getAbstractFileByPath(todoFolderPath);
		if (!folder) {
			this.logger(`Creating todo folder: ${todoFolderPath}`);
			folder = await this.vault.createFolder(todoFolderPath);
		}
		if (!(folder instanceof TFolder)) {
			throw new Error(
				`Path exists but is not a folder: ${todoFolderPath}`
			);
		}

		// Create todo note from template
		let content = `# ${todoName}\n`;
		if (this.todoTemplate) {
			const templateFile = this.vault.getAbstractFileByPath(
				this.todoTemplate
			);
			if (templateFile instanceof TFile) {
				content = await this.vault.read(templateFile);
				content = content.replace(/\{\{name\}\}/g, todoName);
			} else {
				this.logger(
					`Template not found: ${this.todoTemplate}, using default content.`
				);
			}
		}

		this.logger(`Creating todo note: ${todoNotePath}`);
		return this.vault.create(todoNotePath, content);
	}
}
