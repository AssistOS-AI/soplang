import {} from "../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @v1 := Hello
    @pipeConcat def 'return args.join("|")'
    @v2 ?pipeConcat $v1 World!
    @v3 ?:= $v1 World!
`;


let docId =await workspace.runScript(script);

await workspace.buildAll();
await graph.printGraph();

let value_v2 = await graph.getVarValue(docId,"v2");
let value_v3 = await graph.getVarValue(docId,"v3");
allOk &&= value_v2 === "Hello|World!";
allOk &&= value_v3 === "Hello World!";
console.log("Obtained values first time:", value_v2, value_v3);

await workspace.setVarValue(docId,"v1","");

await workspace.buildAll();
await graph.printGraph();

value_v2 = await graph.getVarValue(docId,"v2");
value_v3 = await graph.getVarValue(docId,"v3");
allOk &&= value_v2 === undefined;
allOk &&= value_v3 === undefined;
console.log("Obtained values second time:", value_v2, value_v3);

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");