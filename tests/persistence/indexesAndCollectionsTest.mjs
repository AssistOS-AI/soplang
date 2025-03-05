
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

import {getCore} from "../../src/WorkspaceCore.js";
let workSpaceCore = await getCore();

let ownerId = await workSpaceCore.createUser("user1@email.com", "User 1 1", "owner").id;
await workSpaceCore.createWorkspace("Test Workspace", ownerId);

await workSpaceCore.createUser("user2@email.com", "User 2", "read");


await workSpaceCore.createPersonality("personality1", "Default Personality in workspace Test Workspace. Be short and polite");
await workSpaceCore.createPersonality("personality2", "Default Personality in workspace Test Workspace. Be short and polite");
await workSpaceCore.createDocument("doc1", "category1");
await workSpaceCore.createDocument("doc2", "category1");
await workSpaceCore.createDocument("doc3", "category2");

let personalityByName = await workSpaceCore.getPersonalityByName("personality1");
console.assert(personalityByName.name === "personality1", "Expected personality1");

let allDocumentInCategory1 = await workSpaceCore.getDocumentsByCategory("category1");

console.assert(allDocumentInCategory1.length === 2, "Expected 2 documents in category1");

try{
    await workSpaceCore.createUser("user2@email.com", "User 3", "guest");
} catch(error){
    console.debug("Expected error:", error.message);
}

await workSpaceCore.shutDown();

console.debug("End of indexes and collection tests");

