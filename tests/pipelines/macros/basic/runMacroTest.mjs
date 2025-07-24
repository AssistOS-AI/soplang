import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `            
    @world := World     
    
    @runTest macro hello world       
        @res := $hello $world               
        return $res       
    end  
    
    @result runTest Hello $world
`;


await workspace.insertCode("doc1", script);
let value = await workspace.runMacro("doc1", "runTest" , "Hello", "World!");
$$.checkValue(value, "Hello World!");
await $$.checkDocVar("doc1","result", undefined);
await $$.endTest();