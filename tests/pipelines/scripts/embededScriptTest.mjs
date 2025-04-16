import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    begin @test a b
        #return [math "($a + $b) / 2"]
        return [:= $a $b]
    end
    
    @hello := Hello
    @world := World
    @result :=
    
     begin @runTest         
        @res run $test $hello $world
        overwrite ~result $res        
        return $res       
    end               
`;


let docId =await workspace.parseCode("doc1", script);

let result = await workspace.runScript("doc1", "runTest");
allOk &&= (result === "Hello World");

let value = await graph.getVarValue(docId,"result");
allOk &&= (value === "Hello World");

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");