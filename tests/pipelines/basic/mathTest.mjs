import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `
    @v1 := 1
    @v2 := 2
    @v3 math ( $v1 + $v2 ) * 3 
    
`;


let docId = await workspace.runCode(script);
await workspace.buildAll();

await $$.checkDocVar(docId,"v3", 9);
$$.endTest();