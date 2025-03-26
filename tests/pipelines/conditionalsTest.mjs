import {} from "../deps/clean.mjs";
import assert from "assert";
await $$.clean();
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @v1 := Hello
    @v2 if $v1 then [ := $v1 World! ] else [ := Hello Universe! ]
`;


await workspace.runScript(script, "doc1");

await workspace.buildAll();
await graph.printGraph();

allOk &&= await workspace.getVarValue("doc1","v2") === "Hello World!";

await workspace.setVarValue("doc1","v1","");

await workspace.buildAll();
await graph.printGraph();

allOk &&= await graph.getVarValue("doc1","v2") === "Hello Universe!";

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");