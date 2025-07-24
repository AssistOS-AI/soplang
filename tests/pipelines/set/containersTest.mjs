import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `  
    @world0 := "World 0"
    @world1 := "World 1"
    @world2 := "World 2"
    @world3 := "World 3"
    @worldSet new Set world0 world1 world2      
    
    @sayHello macro world hello         
        @res := $hello $world                       
        return $res       
    end  
    @hello := Hello
    
    @result worldSet.map sayHello $hello 
    overwrite ~world1 "New World 1" await $result
    overwrite ~world2 "New World 2" await $result
    @res0_1 result.first    
    @res0_2 result.getAt 0    
    @res1 result.getAt 1    
    @res2 result.getAt 2
    @res3 result.getAt 3
    @mapState result.export
`;


await workspace.insertCode("doc1", script);

await workspace.buildAll();
await $$.checkDocVar("doc1", "res0_1", "Hello World 0");
await $$.checkDocVar("doc1", "res0_1", "Hello World 0");
await $$.checkDocVar("doc1", "res1", "Hello New World 1");
await $$.checkDocVar("doc1", "res2", "Hello New World 2");
await $$.checkDocVar("doc1", "res3", undefined);
await $$.checkDocVar("doc1", "mapState", 'doc1/EXEC_1,doc1/EXEC_2,doc1/EXEC_3');

await graph.setVarValue("doc1","hello", "Hola");
await workspace.buildAll();
await $$.checkDocVar("doc1", "res0_1", "Hola World 0");
await $$.checkDocVar("doc1", "res0_2", "Hola World 0");
await $$.checkDocVar("doc1", "res1", "Hola New World 1");
await $$.checkDocVar("doc1", "res2", "Hola New World 2");

$$.endTest();