import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `
    @concatAB macro a b c        
        return [:= $a $b $c]
    end
    
    @hello := Hello
    @world := World    
    
    @specialSign := !
    @lastExecutionResult :=
    
     @runTest macro hello world ~lastExecutionResult  ~specialSign       
        @res concatAB $hello $world $specialSign        
        overwrite ~lastExecutionResult $specialSign                 
        return $res       
    end            
    
    @result runTest $hello $world   
`;


await workspace.insertCode("doc1", script);

try {
    await workspace.buildAll();
} catch (e) {
    console.error("Error during build:", e);
}

await $$.checkDocVar("doc1","result", "Hello World !");
await $$.checkDocVar("doc1","lastExecutionResult", "!");
await $$.endTest();