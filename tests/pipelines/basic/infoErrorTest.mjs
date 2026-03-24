import {} from "../../deps/clean.mjs";
import assert from "assert";
import { getVarID, getVariable } from "../../../src/graph/varUtil.js";

let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

await graph.defineVariable("a", "doc1", "ch1", "p1", "@a := $a");

try {
    await graph.buildAll();
} catch (error) {
    // Expected for circular dependency
}

await graph.getVarValue("doc1", "a");

const varInfo = await getVariable(getVarID("doc1", "a"));
const hasErrorInfo = Boolean(varInfo && varInfo.errorInfo);
const hasCircularMessage = hasErrorInfo && varInfo.errorInfo.includes("Circular dependency detected");

allOk &&= hasCircularMessage;
if (!hasCircularMessage) {
    console.error("Expected errorInfo to include 'Circular dependency detected' but got:", varInfo ? varInfo.errorInfo : varInfo);
}

console.log("All tests passed:", allOk ? "true" : "false");

await workspace.shutDown();

assert(allOk === true, "Some tests failed");
$$.endTest();
