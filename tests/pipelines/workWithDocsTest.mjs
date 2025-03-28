import {} from "../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @doc        := new document "doc1"
    @par1       := "Some content for chapter 1, paragraph 1"
    @par21      := "Some content for chapter 2, paragraph 1"
    @par21add   := "More content for chapter 2, paragraph 1"
    doc.chapter 1 "Title for chapter 1"
    doc.chapter 2 "Title for chapter 2"
    doc.para    1  1 $par1 "and some other content"
    #the next lines is appending content to the paragraph 1 of chapter 1
    # and approximate equivalent would be to define a variable on the previous line and use it here directly and not as an embedded command
    # but this is just a test. The difference is that in case of changes in dependencies other then $par21, this expression will not be re-executed
    # while the other one will be re-executed. This could be usefully in some cases or could be perceived as bug or a leaking abstraction 
    doc.para    1  1 [ := $doc.para 2 1 ] $par21
    doc.para    2  1 $par21add
    doc.para    2  2 "additional content for chapter 2, paragraph 2"    
`;


let docId =await workspace.runScript(script);

await workspace.buildAll();
await graph.printGraph();

let value = await graph.getVarValue(docId,"v2");
allOk &&= value === "Hello World!";

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");