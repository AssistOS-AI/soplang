import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `  
    @world1 := "World1"
    @world2 := "World2"
    @world3 := "World3"
    @worldSet new Set ~world1 ~world2 ~world3      
    
    begin sayHello world        
        @res := Hello $world                       
        return $res       
    end  
    
    @result worldSet.forEach $sayHello
    overwrite ~world1 "New World 1" await $result
    overwrite ~world2 "New World 2" await $result
    $res1 result.first
    $res0 result.at 0
    $res2 result.at 1    
    $res1 result.at 2
`;


await workspace.parseCode("doc1", script);
let value = await workspace.runScript("doc1", "runTest" , "There");
allOk &&= (value === "Hello There");
value = await graph.getVarValue("doc1","result");
allOk &&= (value === undefined);

await workspace.buildAll();
await graph.printGraph();

value = await graph.getVarValue("doc1","result");
allOk &&= (value === "Hello New World");

await workspace.buildAll();

value = await graph.setVarValue("doc1","result");
allOk &&= (value === "Hello New World");

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");