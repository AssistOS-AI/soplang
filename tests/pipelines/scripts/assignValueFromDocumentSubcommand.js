import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let documents = await $$.loadPlugin("Documents");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @doc new Document "doc1"
    
    doc.setTitle "Document title"
    @docTitle doc.getTitle
    
    @waitForUpdate doc.setInfoText "Document info"
    @docInfo := [ doc.getInfoText await $waitForUpdate ]
`;


let docId = await workspace.runScript(script);
await workspace.buildAll();
await graph.printGraph();

await $$.check(docId, "docTitle", "Document title");
await $$.check(docId, "docInfo", "Document info");

console.log("All tests passed:", $$.allOk? "true" : "false");

assert(allOk === true, "Some tests failed");