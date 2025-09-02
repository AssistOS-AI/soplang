import {} from "../deps/clean.mjs";
import fsPromises from "fs/promises";
let workspace = $$.loadPlugin("Workspace");
import path from "path";
process.env.SERVERLESS_ROOT_FOLDER = process["env"].PERSISTENCE_FOLDER;

let mockChatScript = `
@name := "DefaultScript"
@description := "DefaultScript"
@role := "guest"
`;

let scriptsPath = path.join(process.env.SERVERLESS_ROOT_FOLDER, "applications/TestApp/chat-scripts");
let mockScriptPath = path.join(scriptsPath, "MockChatScript.sop");
await fsPromises.mkdir(scriptsPath, { recursive: true });
await fsPromises.writeFile(mockScriptPath, mockChatScript);

let scriptImport = `@source import TestApp MockChatScript`;
let docId = await workspace.runCode(scriptImport);

let modifiedDefaultScript = `
@name := "MODIFIED"
@description := "MODIFIED"
@newVar := "some value"
`;

await fsPromises.writeFile(mockScriptPath, modifiedDefaultScript);

await workspace.buildOnlyForDocument(docId);

await $$.checkDocVar(docId, "name", "MODIFIED");
//await $$.checkDocVar(docId, "role", undefined);
await $$.checkDocVar(docId, "newVar", "some value");

await $$.endTest();
