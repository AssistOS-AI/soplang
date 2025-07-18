import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");

let script = `
    @table new Table from message timestamp role
    @rows := $table.data
`;
let docId = await workspace.runCode(script);
let vars = await workspace.getVariablesForDoc(docId);
let tableVar = vars.find(v => v.varName === "table");
assert(!tableVar.errorInfo, tableVar.errorInfo)
$$.checkDocVar(docId, "rows", []);
await $$.endTest();
