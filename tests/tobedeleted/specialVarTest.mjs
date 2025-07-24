import {} from "../deps/clean.mjs";
await $$.clean();
let workspace = $$.loadPlugin("Workspace");

let graph = workspace.getGraph();

let allOk = true;

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

graph.defineVariable("v2", "doc1","ch2", "p2","@v2 := $v1 World !");

graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

await graph.printGraph();

allOk &&= graph.getVarValue("doc1","v1") === "Special Hello";
allOk &&= graph.getVarValue("doc1","v2") === "Special Hello World !";

console.log("All tests passed:", allOk? "true" : "false");
