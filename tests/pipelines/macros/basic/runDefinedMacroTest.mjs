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

await workspace.buildAll();
//await graph.printGraph();

await $$.checkDocVar("doc1", "result", "Hello World");
await $$.endTest();