import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `  
    @world0 := "World 0"
    @world1 := "World 1"
    @world2 := "World 2"
    @world3 := "World 3"
    @worldSet new Set world0 world1 world2      
    
    @count jsdef item result    
        if(result === undefined){ 
            result = 0; 
        }     
        result++;                       
        return result;       
    end  
    @hello := Hello             
    @counter worldSet.reduce count      
`;


await workspace.insertCode("doc1", script);

await workspace.buildAll();
await $$.checkDocVar("doc1", "counter", 3);

$$.endTest();