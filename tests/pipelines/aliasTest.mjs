import {parseCommandLine,compareObjects} from "../../src/util/soplangUtil.js";
import {createVarsGraph} from "../../src/graph/VarsGraph.js";
import {createRegistry} from "../../src/graph/CommandsRegistry.js";

let allOk = true;

let graph = createVarsGraph(createRegistry());

graph.defineVariable("v1", "doc0","ch1", "p1",parseCommandLine("value @v1 Hello"));
graph.defineVariable("v1", "doc1","ch1", "p1",parseCommandLine("@v1 alias doc0 v1"));
graph.defineVariable("v2", "doc0","ch2", "p2",parseCommandLine("set @v2 World"));
graph.defineVariable("v2", "doc1","ch1", "p1",parseCommandLine("@v2 alias doc0 v2"));
graph.defineVariable("v3", "doc1","ch2", "p2",parseCommandLine("@v3 = cat $v1 $v2 !"));

graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

console.log("Graph dump:", graph.dump());


allOk &&= graph.getVariable("doc1","v3") === "Hello World !";

console.log("All tests passed:", allOk? "true" : "false");