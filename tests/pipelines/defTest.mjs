import {parseCommandLine,compareObjects} from "../../src/util/soplangUtil.js";
import {createVarsGraph} from "../../src/graph/VarsGraph.js";
import {createRegistry} from "../../src/graph/CommandsRegistry.js";

let allOk = true;

let graph = createVarsGraph(createRegistry());

let functionDefinition = 'return args.join("|")';

graph.defineVariable("pipeConcat", "doc1","ch1", "p1",
    parseCommandLine("def @pipeConcat '"+ functionDefinition+"'"));

graph.defineVariable("v1", "doc1","ch2", "p2",
    parseCommandLine("set @v1 Hello "));

graph.defineVariable("v2", "doc1","ch2", "p2",
    parseCommandLine("@v2: pipeConcat $v1 World !"));

graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

console.log("Vars dump:", graph.varsDump());


allOk &&= graph.getVariable("doc1","v1") === "Hello";
allOk &&= graph.getVariable("doc1","v2") === "Hello|World|!";

console.log("All tests passed:", allOk? "true" : "false");