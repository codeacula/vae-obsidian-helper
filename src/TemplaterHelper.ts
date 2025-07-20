import { App, TFile } from "obsidian";

export interface TemplaterAPI {
	templater: {
		create_new_note_from_template: (
			template: TFile | string,
			folder?: string,
			filename?: string,
			open_new_note?: boolean
		) => Promise<TFile>;
	};
}

export class TemplaterHelper {
	private app: App;
	private templaterAPI?: TemplaterAPI;

	constructor(app: App) {
		this.app = app;
		// Try to get Templater API
		this.templaterAPI = (app as any).plugins?.plugins?.templater;
	}

	get isAvailable(): boolean {
		return !!this.templaterAPI?.templater?.create_new_note_from_template;
	}

	async createFromTemplate(
		templatePath: string,
		targetFolder: string,
		filename: string,
		variables: Record<string, string> = {},
		openFile = true
	): Promise<TFile | null> {
		if (!this.isAvailable) {
			return null;
		}

		try {
			// Set template variables if Templater supports it
			if (Object.keys(variables).length > 0) {
				// Store variables for template access
				(this.app as any).templaterVariables = variables;
			}

			const file =
				await this.templaterAPI!.templater.create_new_note_from_template(
					templatePath,
					targetFolder,
					filename,
					openFile
				);

			// Clean up variables
			delete (this.app as any).templaterVariables;

			return file;
		} catch (error) {
			console.error("Templater error:", error);
			return null;
		}
	}

	// Fallback method for basic template processing
	async processTemplateContent(
		templateContent: string,
		variables: Record<string, string>
	): Promise<string> {
		let content = templateContent;

		// Replace basic variables
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
			content = content.replace(regex, value);
		}

		// Add date/time processing if needed
		const now = new Date();
		content = content.replace(
			/\{\{date\}\}/g,
			now.toISOString().split("T")[0]
		);
		content = content.replace(
			/\{\{time\}\}/g,
			now.toTimeString().split(" ")[0]
		);
		content = content.replace(/\{\{datetime\}\}/g, now.toISOString());

		return content;
	}
}
