
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

let ownerId = await workSpaceCore.createUser("user1@email.com", "Owner 1", "owner").id;
await workSpaceCore.createWorkspace("Test Workspace", ownerId);
await workSpaceCore.createPersonality("personality1", "Default Personality in workspace Test Workspace. Be short and polite");
let doc1 = await workSpaceCore.createDocument("doc1", "category");

await workSpaceCore.applyTemplate(doc1.id, {
    "title": "doc1 Title",
    chapters: [
        {
            title: "Chapter 1",
            paragraphs: [
                {
                    text: "hello",
                    commands: "@hello set $text"
                },
                {
                    text: "world",
                    commands: "@world set $text"
                }
            ]
        },
        {
            title: "Chapter 2",
            paragraphs: [
                {
                    text: "Bala",
                    commands: "@ala set $text"
                },
                {
                    text: "Ala",
                    commands: "@bala set $text"
                }
            ]
        }
    ]
});

await workSpaceCore.forceSave();

let chapter = await workSpaceCore.getChapterAt(doc1.id, 1);
console.debug(chapter);
assert(chapter.title === "Chapter 2", "Chapter title is not correct");

await workSpaceCore.changeChapterOrder(doc1.id, chapter.id, "paragraph1", 0);

let paragraph = await workSpaceCore.getParagraphAt(doc1.id, 1, 0);

assert(paragraph.text === "hello", "Paragraph text is not correct");

await workSpaceCore.shutDown();

console.debug(await workSpaceCore.dumpDocument(doc1.id));
console.debug("End of smoke test");

