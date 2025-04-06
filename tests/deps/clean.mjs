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
await $$.registerPlugin("DefaultPersistence", "../plugins/StandardPersistencePlugin.js");
await $$.registerPlugin("Workspace", "../plugins/WorkspacePlugin.js");
await $$.registerPlugin("Agents", "../plugins/AgentPlugin.js");
await $$.registerPlugin("WorkspaceUsers", "../plugins/WorkspaceUser.js");
await $$.registerPlugin("Documents", "../plugins/DocumentsPlugin.js");


$$.allOk = true;
$$.check = async function (docId, varName, expectedValue) {
    let workspace = await $$.loadPlugin("Workspace");
    let graph = workspace.getGraph();
    let value = await graph.getVarValue(docId, varName);
    $$.allOk &&= (value === expectedValue);
    console.assert(value === expectedValue, `Expected '${expectedValue}' but got '${value}' for '${varName}'`);
}

process.set