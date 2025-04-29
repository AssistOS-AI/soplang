
import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");

let graph = workspace.getGraph();


let allOk = true;

await graph.defineVariable("v1", "doc1","ch1", "p1","@v1 := Hello");
await graph.defineVariable("v2", "doc1","ch2", "p2","@v2 := $v1 World!");

graph.printGraph();

graph.topologicalSort();
await graph.printGraph();

await graph.buildAll();
await graph.printGraph();

graph.setVarValue( "doc1","v1", "Hallo");
await graph.printGraph();

await graph.buildAll();
await graph.printGraph();

allOk &&= await graph.getVarValue("doc1","v2") === "Hallo World!";

console.log("All tests passed:", allOk? "true" : "false");

await workspace.shutDown();
assert(allOk === true, "Some tests failed");
$$.endTest();