import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @doc new Document "doc1"
    
    doc.setTitle "Document title"
    @docTitle doc.getTitle
    
    doc.setInfoText "Document info"
    @docInfo doc.getInfoText
    
    doc.setGlobalCommands "global commands"
    @globalCommands doc.getGlobalCommands
    
    doc.setChapterTitle 1 "Title for chapter 1"
    @chapter1title doc.getChapterTitle 1
    
    doc.setChapterCommands 3 "commands for chapter 3"
    doc.setChapterCommands -1 "invalid chapter"
    @chapter3commands doc.getChapterCommands 3
    
    doc.setParagraphText 4 2 "Some content for chapter 4, paragraph 2"
    @paragraph4text doc.getParagraphText 4 2
    
    doc.setParagraphCommands 1 1 "commands for chapter 1, paragraph 1"
    @paragraph1commands doc.getParagraphCommands 1 1 
`;


let docId = await workspace.runCode(script);
await workspace.buildAll();
await graph.printGraph();

await $$.check(docId, "docTitle", "Document title");
await $$.check(docId, "docInfo", "Document info");
await $$.check(docId, "globalCommands", "global commands");
await $$.check(docId, "chapter1title", "Title for chapter 1");
await $$.check(docId, "chapter3commands", "commands for chapter 3");
await $$.check(docId, "paragraph4text", "Some content for chapter 4, paragraph 2");
await $$.check(docId, "paragraph1commands", "commands for chapter 1, paragraph 1");

let documentContent = await documents.dumpDocument('doc1');
console.log("Document content for the 'doc1':")
console.dir(documentContent, {depth: null});
if(documentContent.chapters.length !== 5){
    console.error("Document content should have 5 chapters");
    allOk = false;
}
let chapter4 = documentContent.chapters[4];
if(chapter4.paragraphs.length !== 3){
    console.error("Chapter 4 should have 3 paragraphs");
    allOk = false;
}

await workspace.shutDown();

console.log("All tests passed:", $$.allOk? "true" : "false");

assert(allOk === true, "Some tests failed");