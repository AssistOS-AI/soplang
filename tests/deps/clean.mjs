
console.log("Start initialisation...");
import { promises as fs } from "fs";
import assert from "assert";

export async function deleteFolder(folderPath) {
    try {
        await fs.rm(folderPath, { recursive: true, force: true });
        console.log(`Folder deleted: ${folderPath}`);
    } catch (error) {
        console.error(`Error deleting folder: ${error.message}`);
    }
}
await deleteFolder("./work_space_data/");
await fs.mkdir("./work_space_data/");
