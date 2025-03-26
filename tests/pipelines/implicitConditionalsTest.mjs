import {} from "../deps/clean.mjs";
import assert from "assert";
await $$.clean();
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let script = `
    @v1 := Hello
    @pipeConcat def 'return args.join("|")'
    @v2 !pipeConcat $v1 World!
    @v3 !:= $v1 World!
`;


await workspace.runScript(script, "doc1");

await workspace.buildAll();
await graph.printGraph();

let value_v2 = await graph.getVarValue("doc1","v2");
let value_v3 = await graph.getVarValue("doc1","v3");
allOk &&= value_v2 === "Hello|World!";
allOk &&= value_v3 === "Hello World!";
console.log("Obtained values first time:", value_v2, value_v3);

await workspace.setVarValue("doc1","v1","");

await workspace.buildAll();
await graph.printGraph();

value_v2 = await graph.getVarValue("doc1","v2");
value_v3 = await graph.getVarValue("doc1","v3");
allOk &&= value_v2 === undefined;
allOk &&= value_v3 === undefined;
console.log("Obtained values second time:", value_v2, value_v3);

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");