import { TFile, TFolder, Vault } from "obsidian";

export class FileHelper {
        constructor() {}

	public static async createFolderIfNotExists(
		path: string,
		vault: Vault
	): Promise<TFolder> {
		let folder = vault.getAbstractFileByPath(path) as TFolder;
		if (!folder) {
			folder = await vault.createFolder(path);
		}
		return folder;
	}

        public static async moveToArchiveFolder(
                vault: Vault,
                file: TFile,
                date: Date
        ): Promise<string> {
		// Determine parent folder of the file
		const parentFolder = file.parent?.path || "";
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const newFolder = parentFolder
			? `${parentFolder}/${year}/${month}`
			: `${year}/${month}`;
		const newPath = `${newFolder}/${file.basename}.md`;

		try {
			await vault.createFolder(newFolder);
		} catch {
			/* empty */
		}

                await vault.rename(file, newPath);
                return newPath;
        }

        /** Sanitize a name for safe file/folder usage */
        public static sanitizeName(name: string): string {
                return name
                        .replace(/[<>:"/\\|?*]/g, "")
                        .replace(/\s+/g, " ")
                        .trim();
        }

        /**
         * Return a unique file path by appending _2, _3, ... if needed
         */
        public static async getUniqueFilePath(
                vault: Vault,
                path: string
        ): Promise<string> {
                if (!vault.getAbstractFileByPath(path)) {
                        return path;
                }
                const extIndex = path.lastIndexOf(".");
                const base = extIndex !== -1 ? path.substring(0, extIndex) : path;
                const ext = extIndex !== -1 ? path.substring(extIndex) : "";

                let counter = 2;
                let newPath = `${base}_${counter}${ext}`;
                while (vault.getAbstractFileByPath(newPath)) {
                        counter++;
                        newPath = `${base}_${counter}${ext}`;
                }
                return newPath;
        }

        /**
         * Return a unique folder path by appending _2, _3, ... if needed
         */
        public static async getUniqueFolderPath(
                vault: Vault,
                path: string
        ): Promise<string> {
                if (!vault.getAbstractFileByPath(path)) {
                        return path;
                }
                let counter = 2;
                let newPath = `${path}_${counter}`;
                while (vault.getAbstractFileByPath(newPath)) {
                        counter++;
                        newPath = `${path}_${counter}`;
                }
                return newPath;
        }
}
