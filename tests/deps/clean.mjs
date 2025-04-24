import { fileURLToPath } from 'url';
import { dirname } from 'path';
import process from 'process';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// setăm variabilele de mediu
process.env.LOGS_FOLDER = `${__dirname}/logs/`;
process.env.PERSISTENCE_FOLDER = `${__dirname}/temp_persistence/`;
Error.stackTraceLimit = Infinity;
console.log("Start initialisation...");
import {} from "../../Persisto/clean.mjs";

await $$.clean();
await $$.registerPlugin("DefaultPersistence", "../plugins/StandardPersistence.js");
await $$.registerPlugin("Workspace", "../plugins/Workspace.js");
await $$.registerPlugin("Agents", "../plugins/Agent.js");
await $$.registerPlugin("WorkspaceUsers", "../plugins/WorkspaceUser.js");
await $$.registerPlugin("Documents", "../plugins/Documents.js");


$$.allOk = true;
$$.check = async function (docId, varName, expectedValue, prefixText) {
    if (prefixText === undefined) {
        prefixText = "";
    }
    let workspace = await $$.loadPlugin("Workspace");
    let graph = workspace.getGraph();
    let value = await graph.getVarValue(docId, varName);
    $$.allOk &&= (value === expectedValue);
    console.assert(value === expectedValue, `${prefixText} Expected '${expectedValue}' but got '${value}' for '${varName}'`);
}

$$.checkDocVar = $$.check;

$$.checkValue = function (value,  expectedValue) {
    $$.allOk &&= (value === expectedValue);
    console.assert(value === expectedValue, `Expected '${expectedValue}' but got '${value}'`);
}


$$.exit = async function () {
    let workspace = await $$.loadPlugin("Workspace");
    await workspace.shutDown();
    console.log("All tests passed:", $$.allOk ? "true" : "false");
    process.exit($$.allOk ? 0 : 1);
}
$$.endTest = $$.exit;