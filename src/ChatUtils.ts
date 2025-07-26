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
            const file = await templater.createFromTemplate(
                content,
                folder,
                filename,
                {},
                false
            );
            if (file) {
                return file;
            }
        }

        const path = normalizePath(`${folder}/${filename}`);
        return vault.create(path, content);
    }
}
