import { fileURLToPath } from 'url';
import { dirname } from 'path';
import process from 'process';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// setăm variabilele de mediu
process.env.LOGS_FOLDER = `${__dirname}/logs/`;
process.env.AUDIT_FOLDER = `${__dirname}/audit/`;
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
    console.assert(value === expectedValue, `${prefixText} Expected '${expectedValue}' but got '${$$.dumpObject(value)}' for '${varName}'`);
}

$$.checkDocVar = $$.check;

$$.checkValue = function (value,  expectedValue) {
    $$.allOk &&= (value === expectedValue);
    console.assert(value === expectedValue, `Expected '${expectedValue}' but got '${value}'`);
}
$$.deepEqual = function(obj1, obj2) {
    function deepEqual(a, b) {
        if (a === b) return true
        if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        if (keysA.length !== keysB.length) return false
        for (const key of keysA) {
            if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false
        }
        return true
    }
    const areEqual = deepEqual(obj1, obj2)
    $$.allOk &&= areEqual
    if (!areEqual) console.assert(false, {expected: obj2, got: obj1})
}





$$.exit = async function () {
    let workspace = await $$.loadPlugin("Workspace");
    await workspace.shutDown();
    console.log("All tests passed:", $$.allOk ? "true" : "false");
    process.exit($$.allOk ? 0 : 1);
}
$$.endTest = $$.exit;