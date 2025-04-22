import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `  
    @world1 := "World1"
    @world2 := "World2"
    @world3 := "World3"
    @worldSet new Set ~world1 ~world2 ~world3      
    
    @sayHello macro hello world        
        @res := $hello $world                       
        return $res       
    end  
    @hello := Hello
    
    @result worldSet.forEach sayHello $hello item
    overwrite ~world1 "New World 1" await $result
    overwrite ~world2 "New World 2" await $result    
    @res0 result.at 0
    @res1 result.first
    @res2 result.at 1    
    @res1 result.at 2
`;


await workspace.insertCode("doc1", script);

await workspace.buildAll();
await $$.checkDocVar("doc1", "res0", "Hello World 1");
await $$.checkDocVar("doc1", "res1", "Hello World 1");
await $$.checkDocVar("doc1", "res2", "Hello World 2");

await graph.setVarValue("doc1","hello", "Hola");
await workspace.buildAll();
await $$.checkDocVar("doc1", "res0", "Hola World 1");
await $$.checkDocVar("doc1", "res1", "Hola World 1");
await $$.checkDocVar("doc1", "res2", "Hola World 2");

$$.endTest();