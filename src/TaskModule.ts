import VaePlugin from "main";
import { Notice, TFile, TFolder, normalizePath } from "obsidian";
import { FileHelper } from "./FileHelper";

export class TaskModule {
	private plugin: VaePlugin;
	private projectFolder: string;
	private taskTemplate?: string;
	private todoTemplate?: string;

	constructor(plugin: VaePlugin) {
		this.plugin = plugin;
		this.projectFolder = plugin.settings?.projectFolder || "/My Projects";
		this.taskTemplate = plugin.settings?.taskTemplate;
		this.todoTemplate = plugin.settings?.todoTemplate;

		// Example: Register a command and ribbon icon for quick processing
		this.plugin.addCommand({
			id: "process-active-task-note",
			name: "Process Active Task Note",
			callback: () => this.processActiveTaskNote(),
		});
		this.plugin.addRibbonIcon(
			"check-square",
			"Process Active Task Note",
			() => this.processActiveTaskNote()
		);
	}

	// Original API: get list of all project folders for selection
	public async getProjectFolders(): Promise<string[]> {
		const vault = this.plugin.app.vault;
		const projectsFolder = vault.getAbstractFileByPath(
			normalizePath(this.projectFolder)
		);
		if (!(projectsFolder instanceof TFolder)) {
			return [];
		}
		return projectsFolder.children
			.filter((child) => child instanceof TFolder)
			.map((folder) => folder.name);
	}

	// Original API: create a new task note in the specified project's Tasks folder
        public async createTask(
                projectName: string,
                taskName: string
        ): Promise<TFile> {
                const vault = this.plugin.app.vault;
                const cleanName = FileHelper.sanitizeName(taskName);
                const tasksFolderPath = normalizePath(`${this.projectFolder}/${projectName}/Tasks`);
                let taskNotePath = normalizePath(`${tasksFolderPath}/${cleanName}.md`);
                taskNotePath = await FileHelper.getUniqueFilePath(vault, taskNotePath);

		// Ensure Tasks folder exists
                let tasksFolder = vault.getAbstractFileByPath(tasksFolderPath);
                if (!tasksFolder) {
                        try {
                                tasksFolder = await vault.createFolder(tasksFolderPath);
                        } catch (err) {
                                new Notice(`Failed to create folder ${tasksFolderPath}`);
                                throw err;
                        }
                }
                if (!(tasksFolder instanceof TFolder)) {
                        throw new Error(
                                `Path exists but is not a folder: ${tasksFolderPath}`
                        );
                }

		// Create task note from template
                let content = `# ${cleanName}\n`;
                if (this.taskTemplate) {
                        const templateFile = vault.getAbstractFileByPath(this.taskTemplate);
                        if (templateFile instanceof TFile) {
                                content = await vault.read(templateFile);
                                content = content.replace(/\{\{name\}\}/g, cleanName);
                        }
                }
                try {
                        return await vault.create(taskNotePath, content);
                } catch (err) {
                        new Notice(`Failed to create file ${taskNotePath}`);
                        throw err;
                }
        }

	// Original API: create a new todo note (not associated with a project)
        public async createTodo(
                todoName: string,
                todoFolder = "/My Core/Tasks"
        ): Promise<TFile> {
                const vault = this.plugin.app.vault;
                const todoFolderPath = normalizePath(todoFolder);
                const cleanName = FileHelper.sanitizeName(todoName);
                let todoNotePath = normalizePath(`${todoFolderPath}/${cleanName}.md`);
                todoNotePath = await FileHelper.getUniqueFilePath(vault, todoNotePath);

		// Ensure todo folder exists
                let folder = vault.getAbstractFileByPath(todoFolderPath);
                if (!folder) {
                        try {
                                folder = await vault.createFolder(todoFolderPath);
                        } catch (err) {
                                new Notice(`Failed to create folder ${todoFolderPath}`);
                                throw err;
                        }
                }
                if (!(folder instanceof TFolder)) {
                        throw new Error(
                                `Path exists but is not a folder: ${todoFolderPath}`
                        );
                }

		// Create todo note from template
                let content = `# ${cleanName}\n`;
                if (this.todoTemplate) {
                        const templateFile = vault.getAbstractFileByPath(this.todoTemplate);
                        if (templateFile instanceof TFile) {
                                content = await vault.read(templateFile);
                                content = content.replace(/\{\{name\}\}/g, cleanName);
                        }
                }
                try {
                        return await vault.create(todoNotePath, content);
                } catch (err) {
                        new Notice(`Failed to create file ${todoNotePath}`);
                        throw err;
                }
        }

	// Example: process the active file as a task note (for command/ribbon)
	public async processActiveTaskNote() {
		const { workspace, vault } = this.plugin.app;
		const file = workspace.getActiveFile();
		if (!file) return;

		const now = new Date();
		const isoNow = now.toISOString();
		await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
			fm["task-status"] = "processed";
			fm["processed"] = isoNow;
		});

		const content = await vault.read(file);
		const cleaned = content.replace(/```meta-bind-button[\s\S]*?```/, "");
		await vault.modify(file, cleaned);

		await FileHelper.moveToArchiveFolder(vault, file, now);
	}
}
