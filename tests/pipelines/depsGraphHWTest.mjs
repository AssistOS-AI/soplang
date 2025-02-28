import {parseCommandLine,compareObjects} from "../../src/SpaceGraph/soplangUtil.js";
import {createVarsGraph} from "../../src/SpaceGraph/VarsGraph.js";
import {createRegistry} from "../../src/SpaceGraph/CommandsRegistry.js";

let allOk = true;

let graph = createVarsGraph(createRegistry());

graph.addVariable("v1", "doc1","ch1", "p1",parseCommandLine("set @v1 Hello"));
graph.addVariable("v2", "doc1","ch2", "p2",parseCommandLine("@v2 cat $v1 World!"));

graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

console.log("Graph dump:", graph.dump());

allOk &&= graph.getVariable("doc1","v2") === "Hello World!";

console.log("All tests passed:", allOk? "true" : "false");