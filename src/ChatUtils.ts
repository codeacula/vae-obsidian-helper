import { TFile, Vault, normalizePath } from "obsidian";
import { FileHelper } from "./FileHelper";
import { TemplaterHelper } from "./TemplaterHelper";

export class ChatUtils {
    static async saveTranscript(
        vault: Vault,
        templater: TemplaterHelper,
        folder: string,
        filename: string,
        content: string
    ): Promise<TFile> {
        await FileHelper.createFolderIfNotExists(normalizePath(folder), vault);

        if (templater.isAvailable) {
            try {
                const file = await templater.createFromTemplate(
                    content,
                    folder,
                    filename,
                    {},
                    false
                );
                if (file) {
                    return file;
                } else {
                    console.error(`Failed to create file from template: Returned file is falsy. Folder: ${folder}, Filename: ${filename}`);
                }
            } catch (error) {
                console.error(`Error while creating file from template. Folder: ${folder}, Filename: ${filename}`, error);
            }
        }

        const path = normalizePath(`${folder}/${filename}`);
        return vault.create(path, content);
    }
}
