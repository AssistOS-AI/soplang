
import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = $$.loadPlugin("Workspace");

let graph = workspace.getGraph();



await graph.defineVariable("v1", "doc0","ch1", "p1","@v1 := Hello");
await graph.defineVariable("v2", "doc1","ch2", "p2","@v2 := World");

await graph.defineVariable("v1", "doc2","ch1", "p1","@v1 alias doc0 v1");
await graph.defineVariable("v2", "doc2","ch1", "p1","@v2 alias doc1 v2");
await graph.defineVariable("v3", "doc2","ch2", "p2","@v3 := $v1 $v2 !");

await graph.buildAll();


$$.checkDocVar("doc2","v3", "Hello World !" , "After first build");

await graph.setVarValue("doc0","v1","New Hello");
await graph.buildAll();


$$.checkDocVar("doc2","v3", "New Hello World !", "After second build");

$$.endTest();
