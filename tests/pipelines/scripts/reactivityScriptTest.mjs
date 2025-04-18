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
    
    @intResult runTest Hello $world
    @result := $intResult
`;


await workspace.insertCode("doc1", script);

await workspace.buildAll();
await graph.printGraph();
await graph.setVarValue("doc1","world", "New World");
await workspace.buildAll();
await graph.printGraph();

let value = await graph.getVarValue("doc1","result");
console.debug(">>>>>>>>>>>>>>> The result is: " + value);
allOk &&= (value === "Hello New World");

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");