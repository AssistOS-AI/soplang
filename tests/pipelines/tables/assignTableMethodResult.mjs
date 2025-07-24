import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");

let script = `
    @table new Table from message
    @rows := $table.data
`;
//chainAlias problem, table_data value is set as its definition second time it is computed, breaks restoreInstance
let docId = await workspace.runCode(script);
await $$.checkDocVar(docId, "rows", []);
await $$.endTest();
