import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");

let script = `
    @hello := Hello
    @world := World    
    
     @runTest macro hello world     
        @concatAB macro a b
            return $a
        end    
        @res concatAB $hello $world                
        return $res       
    end            
    
    @result runTest $hello $world   
`;


await workspace.insertCode("doc1", script);

await workspace.buildAll();
await $$.checkDocVar("doc1","result", "Hello World");
await $$.endTest();