
import {} from "../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");

let graph = workspace.getGraph();

let functionDefinition = 'return args.join("|")';
let allOk = true;

await graph.defineVariable("pipeConcat", "doc1","ch1", "p1",
    "def @pipeConcat '"+ functionDefinition+"'");

await graph.defineVariable("v1", "doc1","ch2", "p2", "@v1 := Hello ");

await graph.defineVariable("v2", "doc1","ch2", "p2", "@v2 pipeConcat $v1 World !");

graph.topologicalSort();
await graph.printGraph();

await graph.buildAll();

await graph.printGraph();
console.log(await graph.varsDump());


allOk &&= await graph.getVarValue("doc1","v1") === "Hello";
allOk &&= await graph.getVarValue("doc1","v2") === "Hello|World|!";

console.log("All tests passed:", allOk? "true" : "false");

await workspace.shutDown();

assert(allOk === true, "Some tests failed");