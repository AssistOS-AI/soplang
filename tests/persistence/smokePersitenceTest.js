
console.log("Start initialisation...");
import { promises as fs } from "fs";

export async function deleteFolder(folderPath) {
    try {
        await fs.rm(folderPath, { recursive: true, force: true });
        console.log(`Folder deleted: ${folderPath}`);
    } catch (error) {
        console.error(`Error deleting folder: ${error.message}`);
    }
}
await deleteFolder("./data/");

let workSpaceCore = require('../../src/WorkspaceCore.js').getCore("./data/");

