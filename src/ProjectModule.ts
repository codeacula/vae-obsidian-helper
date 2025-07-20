import { TFile, TFolder, Vault, normalizePath } from "obsidian";

export interface ProjectModuleOptions {
	vault: Vault;
	projectFolder?: string;
	projectTemplate?: string;
	logger?: (msg: string) => void;
}

export class ProjectModule {
	private vault: Vault;
	private projectFolder: string;
	private projectTemplate?: string;
	private logger: (msg: string) => void;

	constructor(options: ProjectModuleOptions) {
		this.vault = options.vault;
		this.projectFolder = options.projectFolder || "/My Projects";
		this.projectTemplate = options.projectTemplate;
		this.logger = options.logger || (() => {});
	}

	// Sanitizes project name for use as folder name
	private sanitizeProjectName(name: string): string {
		return name
			.replace(/[<>:"/\\|?*]/g, "") // Remove invalid file system characters
			.replace(/\s+/g, " ") // Normalize whitespace
			.trim();
	}

	// Ensures the projects folder exists, creates if missing
	async ensureFolder(): Promise<TFolder> {
		const folderPath = normalizePath(this.projectFolder);
		let folder = this.vault.getAbstractFileByPath(folderPath);
		if (!folder) {
			this.logger(`Creating folder: ${folderPath}`);
			folder = await this.vault.createFolder(folderPath);
		}
		if (!(folder instanceof TFolder)) {
			throw new Error(`Path exists but is not a folder: ${folderPath}`);
		}
		return folder;
	}

	// Creates a new project folder structure and note
	async createProject(
		name: string
	): Promise<{ projectFile: TFile; projectFolder: TFolder }> {
		await this.ensureFolder();

		const sanitizedName = this.sanitizeProjectName(name);
		const projectFolderPath = normalizePath(
			`${this.projectFolder}/${sanitizedName}`
		);
		const tasksFolderPath = normalizePath(`${projectFolderPath}/Tasks`);
		const projectNotePath = normalizePath(
			`${projectFolderPath}/${sanitizedName}.md`
		);

		// Create project folder
		let projectFolder = this.vault.getAbstractFileByPath(projectFolderPath);
		if (!projectFolder) {
			this.logger(`Creating project folder: ${projectFolderPath}`);
			projectFolder = await this.vault.createFolder(projectFolderPath);
		}
		if (!(projectFolder instanceof TFolder)) {
			throw new Error(
				`Path exists but is not a folder: ${projectFolderPath}`
			);
		}

		// Create Tasks subfolder
		const tasksFolder = this.vault.getAbstractFileByPath(tasksFolderPath);
		if (!tasksFolder) {
			this.logger(`Creating tasks folder: ${tasksFolderPath}`);
			await this.vault.createFolder(tasksFolderPath);
		}

		// Create project note from template
		let content = `# ${name}\n`;
		if (this.projectTemplate) {
			const templateFile = this.vault.getAbstractFileByPath(
				this.projectTemplate
			);
			if (templateFile instanceof TFile) {
				content = await this.vault.read(templateFile);
				content = content.replace(/\{\{name\}\}/g, name);
			} else {
				this.logger(
					`Template not found: ${this.projectTemplate}, using default content.`
				);
			}
		}

		this.logger(`Creating project note: ${projectNotePath}`);
		const projectFile = await this.vault.create(projectNotePath, content);

		return { projectFile, projectFolder: projectFolder as TFolder };
	}

	// Get list of all project folders for selection
	async getProjectFolders(): Promise<string[]> {
		await this.ensureFolder();
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
}
