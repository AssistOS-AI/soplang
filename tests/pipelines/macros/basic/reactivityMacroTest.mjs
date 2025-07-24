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
    
    @intResult runTest Hello $world
    @result := $intResult
`;


await workspace.insertCode("doc1", script);

await workspace.buildAll();
await $$.checkDocVar("doc1", "result", "Hello World");

await graph.setVarValue("doc1","world", "New World");
await workspace.buildAll();
await $$.checkDocVar("doc1", "result", "Hello New World");
await $$.endTest();
