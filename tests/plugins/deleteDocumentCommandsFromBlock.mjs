import {} from "../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");

const doc = await documents.createDocument("docId", "category", "title");
const commands = `
    @docVar1 := "doc var 1"
    @docVar2 := "doc var 2"
`;
await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, commands, doc.comments);
//delete variable docVar2
const updatedCommands = `
    @docVar1 := "doc var 1 updated"
`;
await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, updatedCommands, doc.comments);
let vars = await workspace.getVariablesForDoc(doc.docId);
let deletedDocVar = vars.find(v => v.varName === "docVar2");
if(deletedDocVar) {
    console.error("Variable 'docVar2' should have been deleted but it still exists.");
    $$.allOk = false;
}


let chapterCommands = `
    @ch1 := "chapter command ch1"
    @ch2 := "chapter command ch2"
`;
let chapter = await documents.createChapter(doc.id, "chapter 1", chapterCommands);
//delete variable ch2
let updatedChapterCommands = `
    @ch1 := "chapter command ch1 updated"
`;
await documents.updateChapter(chapter.id, "chapter 1 updated", "", updatedChapterCommands);
vars = await workspace.getVariablesForDoc(doc.docId);
let deletedChapterVar = vars.find(v => v.varName === "ch2");
if(deletedChapterVar) {
    console.error("Variable 'ch2' in chapter should have been deleted but it still exists.");
    $$.allOk = false;
}

let paragraphCommands = `
    @p1 := "paragraph command 1"
    @p2 := "paragraph command 2"
    `;
let paragraph = await documents.createParagraph(chapter.id, "paragraph 1", paragraphCommands);
//delete variable p2
let updatedParagraphCommands = `
    @p1 := "paragraph command 1 updated"
`;
await documents.updateParagraph(chapter.id, paragraph.id, paragraph.text , updatedParagraphCommands);
vars = await workspace.getVariablesForDoc(doc.docId);
let deletedParagraphVar = vars.find(v => v.varName === "p2");
if(deletedParagraphVar) {
    console.error("Variable 'p2' in paragraph should have been deleted but it still exists.");
    $$.allOk = false;
}
await $$.exit();

