import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @doc                new Document "doc1"
    @par1               := "content_1"
    @par21              := "content_2_1"
    @par21add           := "content_21_next"
                        doc.setChapterTitle 1 "Title for chapter 1"
                        doc.setChapterTitle 2 "Title for chapter 2"
                        doc.setParagraphText   1  1 $par1 "and some other content"
    #the next lines is appending content to the paragraph 1 of chapter 1
    # and approximate equivalent would be to define a variable on the previous line and use it here directly and not as an embedded command
    # but this is just a test. The difference is that in case of changes in dependencies other then $par21, this expression will not be re-executed
    # while the other one will be re-executed. This could be usefully in some cases or could be perceived as bug or a leaking abstraction 
    @parText             doc.getParagraphText 1 1 
    doc.setParagraphText    1  1 $parText $par21
    doc.setParagraphText    2  1 $par21add await $parText
    doc.setParagraphText    2  2 "additional content for chapter 2, paragraph 2"     await $parText
`;


let docId = await workspace.runCode(script);
await workspace.buildAll();
await graph.printGraph();

$$.checkDocVar(docId, "parText", "content_1");


let documentContent = await documents.dumpDocument(docId);
console.debug("Document content for script execution:", documentContent);

 documentContent = await documents.dumpDocument('doc1');
console.debug("Document content for the 'doc1':", documentContent);
//TODO: add more checks
await $$.exit();