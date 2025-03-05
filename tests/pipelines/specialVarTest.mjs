import {parseCommandLine,compareObjects} from "../../src/util/soplangUtil.js";
import {createVarsGraph} from "../../src/SpaceGraph/VarsGraph.js";
import {createRegistry} from "../../src/SpaceGraph/CommandsRegistry.js";

let allOk = true;

let graph = createVarsGraph(createRegistry());

let specialVarValue = "Special Hello";

graph.defineVariable("v1", "doc1","ch1", "p1",
    {
        command: "special",
        outputVars: ["v1"],
        inputVars: [],
        varTypes: [],
        set: function(value){
            specialVarValue = value;
        },
        get: function(){
            return specialVarValue;
        }
    });

graph.defineVariable("v2", "doc1","ch2", "p2",
    parseCommandLine("@v2: cat $v1 World !")
);

graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

console.log("Graph dump:", graph.dump());

allOk &&= graph.getVariable("doc1","v1") === "Special Hello";
allOk &&= graph.getVariable("doc1","v2") === "Special Hello World !";

console.log("All tests passed:", allOk? "true" : "false");
