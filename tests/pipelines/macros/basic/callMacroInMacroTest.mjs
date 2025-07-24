import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `
    @concatAB macro a b
        #return [math "($a + $b) / 2"]
        return [:= $a $b]
    end
    
    @hello := Hello
    @world := World    
    
     @runTest macro hello world         
        @res concatAB $hello $world                
        return $res       
    end            
    
    @result runTest $hello $world   
`;


await workspace.insertCode("doc1", script);

await workspace.buildAll();
await $$.checkDocVar("doc1","result", "Hello World");
await $$.endTest();