import {parseCommandLine,compareObjects} from "../../src/soplangUtil.js";
import {createVarsGraph} from "../../src/VarsGraph.js";

let allOk = true;

let graph = createVarsGraph();

graph.addVariable("v1", "doc1","ch1", "p1",parseCommandLine("define @v1 Hello"));
graph.addVariable("v2", "doc1","ch2", "p2",parseCommandLine("define @v2 $v1 world"));

graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

console.log(graph.dump());

allOk |= false;

console.log("All tests passed:", allOk? "true" : "false");