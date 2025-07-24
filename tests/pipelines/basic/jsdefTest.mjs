import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `
    @concatAB jsdef a b   
        console.debug(">>> Executing function:concatAB with args:", a, b, this.__currentDocId);             
        return a + " " + b;
    end
    
    @hello := Hello
    @world := World    
        
     @runTest jsdef hello ~world ~concatAB        
        let res = this.concatAB(hello, this.world);                         
        return res;       
    end            
    
    @result1 concatAB $hello $world
    @result2 runTest $hello    
`;


await workspace.insertCode("doc1", script);

try {
    await workspace.buildAll();
} catch (e) {
    console.error("Error during build:", e);
}

await $$.checkDocVar("doc1","result1", "Hello World");
await $$.checkDocVar("doc1","result2", "Hello World");

await $$.endTest();