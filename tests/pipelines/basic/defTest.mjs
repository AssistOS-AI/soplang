
import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");

let graph = workspace.getGraph();

let functionDefinition = 'return args.join("|")';


await graph.defineVariable("pipeConcat", "doc1","ch1", "p1",
    "def @pipeConcat '"+ functionDefinition+"'");

await graph.defineVariable("v1", "doc1","ch2", "p2", "@v1 := Hello ");

await graph.defineVariable("v2", "doc1","ch2", "p2", "@v2 pipeConcat $v1 World !");



await graph.buildAll();

$$.checkDocVar("doc1","v1", "Hello");
$$.checkDocVar("doc1","v2", "Hello|World|!");

$$.endTest();