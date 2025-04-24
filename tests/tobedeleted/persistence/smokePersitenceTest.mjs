import {} from "../../deps/clean.mjs"
await $$.clean();
import assert from "assert";

let workSpaceCore = $$.loadPlugin("Workspace");
let UserPlugin = $$.loadPlugin("WorkspaceUserPlugin");
let Agent = $$.loadPlugin("Agent");

let owner = await UserPlugin.createUser("user1@email.com", "Owner 1", "owner");
await workSpaceCore.createWorkspace("Test Workspace", owner.id);
await Agent.createAgent("agent1", "Default Agent in workspace Test Workspace. Be short and polite");
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

assert(chapter.title === "Chapter 2", "Chapter title is not correct");

await workSpaceCore.changeChapterOrder(doc1.id, chapter.id, "paragraph1", 0);

let paragraph = await workSpaceCore.getParagraphAt(doc1.id, 1, 0);
console.debug(chapter , paragraph);
assert(paragraph.text === "hello", "Paragraph text is not correct");

await workSpaceCore.shutDown();

console.debug(await workSpaceCore.dumpDocument(doc1.id));
console.debug("End of smoke test");

