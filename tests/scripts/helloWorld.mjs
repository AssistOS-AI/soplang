import {parseCommandLine,compareObjects} from "../../src/SpaceGraph/soplangUtil.js";
import {createVarsGraph} from "../../src/SpaceGraph/VarsGraph.js";
import {createRegistry} from "../../src/SpaceGraph/CommandsRegistry.js";

let allOk = true;

let graph = createVarsGraph(createRegistry());

/*
let script = `
    let vq = graph.getVariable(args[0],args[1]);
    vq.setVarValue("Hello World!");
    graph.runCommand("set",["v1","doc1","ch1","p1","Nothing"]);
`; */

let script = `        
    @v1 import? $arg1 $arg2    
    @case1 if? [equal? $v1 'Hello'] then [set? $arg1 " World!"];
    @case2 if? [unequal? $v1 'Hello'] then "Better World!";        
    transfer? $case1 in $arg1 $arg2
    transfer? $case2 in $arg1 $arg2
`;

graph.addVariable("v1", "doc1","ch1", "p1",parseCommandLine("set @v1 Hello"));

graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

//console.log("Graph dump:", graph.dump());

await graph.runScript(script, "doc1", "v1");
allOk &&= graph.getVariable("doc1","v1") === "Hello World!";

await graph.runScript(script, "doc1", "v1" );
allOk &&= graph.getVariable("doc1","v1") === "Better World!";


console.log("All tests passed:", allOk? "true" : "false");