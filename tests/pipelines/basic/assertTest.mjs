import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `
    @v1 := 9
    @v2 := 3
    @v3 := Hello
    @a1 assert  $v1 == $v2 * 3      
    @a2 assert  $v3  == Hello
    @a3 assert  $v3 !== "Hello"
    @a4 assert  ( $v3 !== "Hello" ) || ( $v3 == "Hello" )  
    
`;


let docId = await workspace.runCode(script);
await workspace.buildAll();

await $$.checkDocVar(docId,"a1", true);
await $$.checkDocVar(docId,"a2", true);
await $$.checkDocVar(docId,"a3", false);
await $$.checkDocVar(docId,"a4", true);
$$.endTest();