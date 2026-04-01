import {} from "../../deps/clean.mjs";
import fsPromises from "node:fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { getVarID, getVariable } from "../../../src/graph/varUtil.js";

let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");

let __filename = fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);

let fixturesDir = path.resolve(__dirname, "fixturesFolderType");
let trackedDir = path.resolve(fixturesDir, "tracked");
let nestedDir = path.resolve(trackedDir, "nested");
let pathA = path.resolve(trackedDir, "fileA.txt");
let pathB = path.resolve(nestedDir, "fileB.txt");
let pathNew = path.resolve(trackedDir, "newFile.txt");
let sourceDocPath = path.resolve(fixturesDir, "sourceFolderTypeDoc.sop");

// We insert a tiny delay between filesystem mutations so mtime/ctime snapshots
// are guaranteed to differ across platforms and the test stays deterministic.
async function waitForFsTick() {
    await new Promise(resolve => setTimeout(resolve, 20));
}

await fsPromises.mkdir(nestedDir, { recursive: true });
await fsPromises.writeFile(pathA, "Initial content A", "utf8");
await fsPromises.writeFile(pathB, "Initial content B", "utf8");

let sourceDocCommands = `@specsFolder new Folder "./tracked"
@nestedFolder new Folder "./tracked/nested"
@resolvedPath := $specsFolder.path
@dirChanged !specsFolder.newer "./tracked"
@fileChanged !specsFolder.newer "./tracked/fileA.txt"
@fromFolderArg !specsFolder.newer $nestedFolder
`;

await fsPromises.writeFile(sourceDocPath, sourceDocCommands, "utf8");

let relativeDocId = "folderTypeDocPath";

try {
    let doc = await documents.createDocument(relativeDocId, "test", "Folder Type Test", sourceDocPath);
    let commandsFromFile = await fsPromises.readFile(sourceDocPath, "utf8");

    await documents.updateDocument(
        doc.id,
        "Folder Type Test",
        relativeDocId,
        "test",
        "",
        commandsFromFile,
        {},
        sourceDocPath
    );

    await workspace.buildOnlyForDocument(relativeDocId);

    let expectedFolderPath = path.resolve(path.dirname(sourceDocPath), "tracked");
    await $$.checkDocVar(relativeDocId, "resolvedPath", expectedFolderPath);
    await $$.checkDocVar(relativeDocId, "dirChanged", true);
    await $$.checkDocVar(relativeDocId, "fileChanged", true);
    await $$.checkDocVar(relativeDocId, "fromFolderArg", true);

    await workspace.buildOnlyForDocument(relativeDocId);
    await $$.checkDocVar(relativeDocId, "dirChanged", false);
    await $$.checkDocVar(relativeDocId, "fileChanged", false);
    await $$.checkDocVar(relativeDocId, "fromFolderArg", false);

    await waitForFsTick();
    await fsPromises.writeFile(pathB, "Initial content B\nchanged", "utf8");
    await workspace.buildOnlyForDocument(relativeDocId);
    await $$.checkDocVar(relativeDocId, "dirChanged", true);
    await $$.checkDocVar(relativeDocId, "fileChanged", false);
    await $$.checkDocVar(relativeDocId, "fromFolderArg", true);

    await workspace.buildOnlyForDocument(relativeDocId);
    await $$.checkDocVar(relativeDocId, "dirChanged", false);
    await $$.checkDocVar(relativeDocId, "fileChanged", false);

    await waitForFsTick();
    await fsPromises.writeFile(pathNew, "new file", "utf8");
    await workspace.buildOnlyForDocument(relativeDocId);
    await $$.checkDocVar(relativeDocId, "dirChanged", true);

    await waitForFsTick();
    await fsPromises.rm(pathNew, { force: true });
    await workspace.buildOnlyForDocument(relativeDocId);
    await $$.checkDocVar(relativeDocId, "dirChanged", true);

    await waitForFsTick();
    await fsPromises.writeFile(pathA, "Initial content A\nchanged", "utf8");
    await workspace.buildOnlyForDocument(relativeDocId);
    await $$.checkDocVar(relativeDocId, "fileChanged", true);

    await waitForFsTick();
    await fsPromises.rm(pathA, { force: true });
    await workspace.buildOnlyForDocument(relativeDocId);
    await $$.checkDocVar(relativeDocId, "fileChanged", true);

    await workspace.buildOnlyForDocument(relativeDocId);
    await $$.checkDocVar(relativeDocId, "fileChanged", false);

    let relativeVarDef = await getVariable(getVarID(relativeDocId, "resolvedPath"));
    $$.checkValue(relativeVarDef?.docPath, sourceDocPath, "Variable docPath should match document path");
} finally {
    await fsPromises.rm(fixturesDir, { recursive: true, force: true });
    await $$.endTest();
}
