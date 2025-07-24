import {} from "../deps/clean.mjs";

let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `  
    @file1 new file # "ssi:web:localhost/DPS_ID::iconFileName/image/png:"
    @file1Content file1.read
        
`;

await workspace.insertCode("doc1", script);

await workspace.buildAll();
await $$.checkDocVar("doc1", "res0_1", "Hello World 0");
await $$.checkDocVar("doc1", "res0_1", "Hello World 0");
await $$.checkDocVar("doc1", "res1", "Hello New World 1");
await $$.checkDocVar("doc1", "res2", "Hello New World 2");
await $$.checkDocVar("doc1", "res3", undefined);
await $$.checkDocVar("doc1", "mapState", 'doc1.EXEC_1,doc1.EXEC_2,doc1.EXEC_3');

await graph.setVarValue("doc1","hello", "Hola");
await workspace.buildAll();
await $$.checkDocVar("doc1", "res0_1", "Hola World 0");
await $$.checkDocVar("doc1", "res0_2", "Hola World 0");
await $$.checkDocVar("doc1", "res1", "Hola New World 1");
await $$.checkDocVar("doc1", "res2", "Hola New World 2");

$$.endTest();