import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `
    @v1 := Hello
    @pipeConcat def 'return args.join("|")'
    @v2 ?pipeConcat $v1 World!
    @v3 ?:= $v1 World!
`;


let docId = await workspace.runCode(script);

await workspace.buildAll();
await graph.printGraph();

await $$.checkDocVar(docId,"v1", "Hello");
await $$.checkDocVar(docId,"v2", "Hello|World!");
await $$.checkDocVar(docId,"v3", "Hello World!");

await workspace.setVarValue(docId,"v1","");

await workspace.buildAll();
await graph.printGraph();

await $$.checkDocVar(docId,"v1", "");
await $$.checkDocVar(docId,"v2", undefined);
await $$.checkDocVar(docId,"v3", undefined);

$$.endTest();