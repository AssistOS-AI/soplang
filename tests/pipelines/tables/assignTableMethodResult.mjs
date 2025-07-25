import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `
    @table new Table from message
    table.upsert "Jhon" "Hello world"
    @rows := $table.data
`;
//chainAlias problem, table_data value is set as its definition second time it is computed, breaks restoreInstance
let docId = await workspace.runCode(script);
await $$.checkDocVar(docId, "rows", [{"from":"Jhon","message":"Hello world","truid":"TRUID_1"}]);
await graph.printGraph();
await $$.endTest();
