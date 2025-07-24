import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `  
    @world0 := "World 0"
    @world1 := "World 1"
    @world2 := "World 2"
    @world3 := "World 3"
    @world4 := "World 4"
    @worldSet new Set world0 world1 world2 world3 world4      
    
    @worldFilter macro item     
        return [ assert $item === "World 1" ||  $item === "World 2" || $item === "World 4" ]       #debug         
    end                 
    @filter worldSet.filter worldFilter 
    @res0_1 filter.first
    @mapState filter.export
`;


await workspace.insertCode("doc1", script);
await workspace.buildAll();

await $$.checkDocVar("doc1", "res0_1", "World 1");
await $$.checkDocVar("doc1", "mapState", 'doc1/world1,doc1/world2,doc1/world4');

$$.endTest();