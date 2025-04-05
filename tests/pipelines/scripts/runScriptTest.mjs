import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @v1 := $arg1    
    @v2 := $v1 World!
`;


let docId =await workspace.runScript(script , "Hello");

await workspace.buildAll();
await graph.printGraph();

let value = await graph.getVarValue(docId,"v2");
allOk &&= value === "Hello World!";

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");