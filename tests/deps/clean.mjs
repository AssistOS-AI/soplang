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
await $$.registerPlugin("Agent", "../plugins/Agent.js");
await $$.registerPlugin("WorkspaceUsers", "../plugins/WorkspaceUser.js");
await $$.registerPlugin("Documents", "../plugins/Documents.js");
await $$.registerPlugin("Table", "../plugins/Table.js");
await $$.registerPlugin("LLM", "../plugins/LLM.js");
await $$.registerPlugin("ChatRoom", "../plugins/ChatRoom.js");
await $$.registerPlugin("CodeManager", "../plugins/CodeManager.js");

import {compareObjects} from "../../src/util/soplangUtil.js";

$$.allOk = true;
$$.check = async function (docId, varName, expectedValue, prefixText) {
    if (prefixText === undefined) {
        prefixText = "";
    }
    let workspace = $$.loadPlugin("Workspace");
    let graph = workspace.getGraph();
    let value = await graph.getVarValue(docId, varName);

    let isOk = (compareObjects(value,  expectedValue))
    $$.allOk &&= isOk;
    if(!isOk) {
        console.error(`${prefixText} Expected '${JSON.stringify(expectedValue)}' but got '${JSON.stringify(value)}' for '${varName}'`);
    }
}

$$.checkDocVar = $$.check;

$$.checkValue = function (value,  expectedValue, prefixText) {
    if(prefixText === undefined) {
        prefixText = "";
    }
    let isOk = (compareObjects(value,  expectedValue))
    $$.allOk &&= isOk;
    if(!isOk) {
        console.error(`${prefixText} Expected '${JSON.stringify(expectedValue)}' but got '${JSON.stringify(value)}'`);
    }
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



$$.failTest = function(){
    $$.allOk = false;
}

$$.exit = async function () {
    let workspace = $$.loadPlugin("Workspace");
    await workspace.shutDown();
    console.log("All tests passed:", $$.allOk ? "true" : "false");
    process.exit($$.allOk ? 0 : 1);
}
$$.endTest = $$.exit;