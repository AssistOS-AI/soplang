import {} from "../deps/clean.mjs";
let documents = $$.loadPlugin("Documents");

const doc = await documents.createDocument("docId", "category", "title");
const commands = `
    @docVar1 := "doc var 1"
    @docVar2 := "doc var 2"
`;
await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, commands, doc.comments);
const updatedCommands = `
    @docVar1 := "doc var 1 updated"
`;
await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, updatedCommands, doc.comments);

let chapter = await documents.createChapter(doc.id, "chapter 1", commands);
await documents.updateChapter(chapter.id, "chapter 1 updated", "", updatedCommands);
await $$.exit();
