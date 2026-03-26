import {} from "../../deps/clean.mjs";
import fsPromises from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getVarClock, getVarID, getVariable } from "../../../src/graph/varUtil.js";

let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");

let __filename = fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);
let fixturesDir = path.resolve(__dirname, "fixtures");
let pathA = path.resolve(__dirname, "fixtures", "fileCommandA.txt");
let pathB = path.resolve(__dirname, "fixtures", "fileCommandB.txt");
let sourceDocPath = path.resolve(__dirname, "fixtures", "sourceFileCommandDoc.txt");

await fsPromises.mkdir(fixturesDir, { recursive: true });
await fsPromises.writeFile(pathA, "Initial content A", "utf8");
await fsPromises.writeFile(pathB, "Initial content B", "utf8");
await fsPromises.writeFile(sourceDocPath, "@content file \"./fileCommandA.txt\"\n", "utf8");

let script = `
    @content file "${pathA}"
`;
try {
    let docId = await workspace.runCode(script);
    await workspace.buildAll();

    let statA = await fsPromises.stat(pathA);
    let expectedA = { mtimeMs: statA.mtimeMs, ctimeMs: statA.ctimeMs };
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
        let statAfterModify = await fsPromises.stat(pathA);
        let expectedAfterModify = { mtimeMs: statAfterModify.mtimeMs, ctimeMs: statAfterModify.ctimeMs };
        await $$.checkDocVar(docId, "content", expectedAfterModify);
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

    let statB = await fsPromises.stat(pathB);
    let expectedB = { mtimeMs: statB.mtimeMs, ctimeMs: statB.ctimeMs };
    await $$.checkDocVar(docId, "content", expectedB);
    let clockAfterChange = await getVarClock(varId);
    if (clockAfterChange === clockBefore) {
        console.error("Clock should change when file content changes");
        $$.failTest();
    }

    // Test: docPath should be used for relative paths
    let relativeDocId = "fileCommandDocPath";
    let doc = await documents.createDocument(relativeDocId, "test", "DocPath Test", sourceDocPath);
    let commandsFromFile = await fsPromises.readFile(sourceDocPath, "utf8");
    await documents.updateDocument(
        doc.id,
        "DocPath Test",
        relativeDocId,
        "test",
        "",
        commandsFromFile,
        {},
        sourceDocPath
    );
    await workspace.buildOnlyForDocument(relativeDocId);
    let statRelative = await fsPromises.stat(pathA);
    let expectedRelative = { mtimeMs: statRelative.mtimeMs, ctimeMs: statRelative.ctimeMs };
    await $$.checkDocVar(relativeDocId, "content", expectedRelative);
    let relativeVarDef = await getVariable(getVarID(relativeDocId, "content"));
    $$.checkValue(relativeVarDef?.docPath, sourceDocPath, "Variable docPath should match document path");


} finally {
    await fsPromises.rm(fixturesDir, { recursive: true, force: true });
    await $$.endTest();
}
