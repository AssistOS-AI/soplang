
import {} from "../deps/clean.mjs";
import assert from "assert";

let workspace = await $$.loadPlugin("Workspace");

let graph = workspace.getGraph();

let allOk = true;

await graph.defineVariable("v1", "doc0","ch1", "p1","@v1 := Hello");
await graph.defineVariable("v2", "doc1","ch2", "p2","@v2 := World");

await graph.defineVariable("v1", "doc2","ch1", "p1","@v1 alias doc0 v1");
await graph.defineVariable("v2", "doc2","ch1", "p1","@v2 alias doc1 v2");
await graph.defineVariable("v3", "doc2","ch2", "p2","@v3 := $v1 $v2 !");

graph.topologicalSort();
await graph.printGraph();

await graph.buildAll();

await graph.printGraph();

allOk &&= await graph.getVarValue("doc2","v3") === "Hello World !";

graph.setNewValue("doc0","v1","New Hello");
await graph.buildAll();

allOk &&= await graph.getVarValue("doc2","v3") === "New Hello World !";

await graph.printGraph();

console.log("All tests passed:", allOk? "true" : "false");

await workspace.shutDown();

assert(allOk === true, "Some tests failed");