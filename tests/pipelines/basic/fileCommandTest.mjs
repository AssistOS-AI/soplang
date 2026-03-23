import {} from "../../deps/clean.mjs";
import fsPromises from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getVarClock, getVarID } from "../../../src/graph/varUtil.js";

let workspace = $$.loadPlugin("Workspace");

let __filename = fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);
let pathA = path.resolve(__dirname, "fixtures", "fileCommandA.txt");
let pathB = path.resolve(__dirname, "fixtures", "fileCommandB.txt");

let script = `
    @content file "${pathA}"
`;

let docId = await workspace.runCode(script);
await workspace.buildAll();

let expectedA = await fsPromises.readFile(pathA, "utf8");
await $$.checkDocVar(docId, "content", expectedA);

let varId = getVarID(docId, "content");
let clockBefore = await getVarClock(varId);

await workspace.buildAll();
let clockAfterSame = await getVarClock(varId);
$$.checkValue(clockAfterSame, clockBefore, "Clock should not change when file content is unchanged");

// Test: modify file A content on disk, verify variable picks up the change
let originalContent = await fsPromises.readFile(pathA, "utf8");
let modifiedContent = originalContent + "\nModified for test.";
await fsPromises.writeFile(pathA, modifiedContent, "utf8");
try {
    await workspace.buildAll();
    await $$.checkDocVar(docId, "content", modifiedContent);
    let clockAfterModify = await getVarClock(varId);
    if (clockAfterModify === clockBefore) {
        console.error("Clock should change when file content is modified on disk");
        $$.failTest();
    }
} finally {
    await fsPromises.writeFile(pathA, originalContent, "utf8");
}

await workspace.insertCode(docId, `@content file "${pathB}"`);
await workspace.buildOnlyForDocument(docId);

let expectedB = await fsPromises.readFile(pathB, "utf8");
await $$.checkDocVar(docId, "content", expectedB);
let clockAfterChange = await getVarClock(varId);
if (clockAfterChange === clockBefore) {
    console.error("Clock should change when file content changes");
    $$.failTest();
}

await $$.endTest();
