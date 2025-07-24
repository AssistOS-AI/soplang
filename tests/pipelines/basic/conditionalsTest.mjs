import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @v1 := Hello
    @v2 if $v1 then [ := $v1 World! ] else [ := Hello Universe! ]
`;


let docId = await workspace.runCode(script);
await graph.printGraph();

allOk &&= await workspace.getVarValue(docId,"v2") === "Hello World!";

await workspace.setVarValue(docId,"v1","");

await workspace.buildAll();
await graph.printGraph();

allOk &&= await graph.getVarValue(docId,"v2") === "Hello Universe!";

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");
$$.endTest();