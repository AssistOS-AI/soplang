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
    
    @waitForUpdate doc.setInfoText "Document info"
    @docInfo := [ doc.getInfoText await $waitForUpdate ]
`;


let docId = await workspace.runCode(script);
await workspace.buildAll();
await graph.printGraph();

await $$.check(docId, "docTitle", "Document title");
await $$.check(docId, "docInfo", "Document info");

$$.exit();
