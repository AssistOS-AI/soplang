import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `
            
    @world := World     
    
    @runTest script hello world       
        @res := $hello $world               
        return $res       
    end  
    
    @result run runTest Hello $world
`;


await workspace.insertCode("doc1", script);
let value = await workspace.runScript("doc1", "runTest" , "Hello");
allOk &&= (value === "Hello World");
value = await graph.getVarValue("doc1","result");
allOk &&= (value === undefined);

await workspace.buildAll();
await graph.printGraph();

value = await graph.getVarValue("doc1","result");
allOk &&= (value === "Hello World");

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");