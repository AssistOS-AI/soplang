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
let nestedDir = path.resolve(__dirname, "fixtures", "nested");
let pathA = path.resolve(__dirname, "fixtures", "filesCommandA.txt");
let pathB = path.resolve(__dirname, "fixtures", "filesCommandB.txt");
let pathC = path.resolve(__dirname, "fixtures", "nested", "filesCommandC.txt");
let sourceDocPath = path.resolve(__dirname, "fixtures", "sourceFilesCommandDoc.sop");

async function expectedMatches(paths) {
    let result = [];
    for (let currentPath of paths) {
        let stat = await fsPromises.stat(currentPath);
        result.push({ path: currentPath, mtimeMs: stat.mtimeMs, ctimeMs: stat.ctimeMs });
    }
    result.sort((a, b) => b.mtimeMs - a.mtimeMs || a.path.localeCompare(b.path));
    return result;
}

await fsPromises.mkdir(fixturesDir, { recursive: true });
await fsPromises.mkdir(nestedDir, { recursive: true });
await fsPromises.writeFile(pathA, "Initial content A", "utf8");
await fsPromises.writeFile(pathB, "Initial content B", "utf8");
await fsPromises.writeFile(pathC, "Initial content C", "utf8");
await fsPromises.writeFile(sourceDocPath, "@content !files \"./filesCommand?.txt\"\n@nested !glob \"./nested/*.txt\"\n", "utf8");

let script = `
    @single !files "${pathA}"
    @topTxt !files "${fixturesDir}/*.txt"
    @question !files "${fixturesDir}/filesCommand?.txt"
    @nested !glob "${fixturesDir}/**/*.txt"
    @brace !glob "${fixturesDir}/filesCommand{A,B}.txt"
`;
try {
    let docId = await workspace.runCode(script);
    await workspace.buildAll();

    await $$.checkDocVar(docId, "single", await expectedMatches([pathA]));
    await $$.checkDocVar(docId, "topTxt", await expectedMatches([pathA, pathB]));
    await $$.checkDocVar(docId, "question", await expectedMatches([pathA, pathB]));
    await $$.checkDocVar(docId, "nested", await expectedMatches([pathA, pathB, pathC]));
    await $$.checkDocVar(docId, "brace", await expectedMatches([pathA, pathB]));

    let nestedVarId = getVarID(docId, "nested");
    let clockBefore = await getVarClock(nestedVarId);

    await workspace.buildAll();
    let clockAfterSame = await getVarClock(nestedVarId);
    $$.checkValue(clockAfterSame, clockBefore, "Clock should not change when files/glob result is unchanged");

    // Test: modify a matched file, verify variable picks up the change
    let originalContent = await fsPromises.readFile(pathC, "utf8");
    let modifiedContent = originalContent + "\nModified for test.";
    await fsPromises.writeFile(pathC, modifiedContent, "utf8");
    try {
        await workspace.buildAll();
        await $$.checkDocVar(docId, "nested", await expectedMatches([pathA, pathB, pathC]));
        let clockAfterModify = await getVarClock(nestedVarId);
        if (clockAfterModify === clockBefore) {
            console.error("Clock should change when a matched file is modified on disk");
            $$.failTest();
        }
    } finally {
        await fsPromises.writeFile(pathC, originalContent, "utf8");
    }

    let topTxtVarId = getVarID(docId, "topTxt");
    let topTxtClockBeforePatternChange = await getVarClock(topTxtVarId);
    await workspace.insertCode(docId, `@topTxt !files "${fixturesDir}/nested/*.txt"`);
    await workspace.buildOnlyForDocument(docId);

    await $$.checkDocVar(docId, "topTxt", await expectedMatches([pathC]));
    let topTxtClockAfterPatternChange = await getVarClock(topTxtVarId);
    if (topTxtClockAfterPatternChange === topTxtClockBeforePatternChange) {
        console.error("Clock should change when files pattern changes");
        $$.failTest();
    }

    // Test: docPath should be used for relative paths
    let relativeDocId = "filesCommandDocPath";
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

    await $$.checkDocVar(relativeDocId, "content", await expectedMatches([pathA, pathB]));
    await $$.checkDocVar(relativeDocId, "nested", await expectedMatches([pathC]));
    let relativeVarDef = await getVariable(getVarID(relativeDocId, "content"));
    $$.checkValue(relativeVarDef?.docPath, sourceDocPath, "Variable docPath should match document path");


} finally {
    await fsPromises.rm(fixturesDir, { recursive: true, force: true });
    await $$.endTest();
}
