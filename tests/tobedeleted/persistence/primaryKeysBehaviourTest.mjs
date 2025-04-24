import {} from "../../deps/clean.mjs"
await $$.clean();

let WorkspacePlugin =  $$.loadPlugin("Workspace");
let UserPlugin = $$.loadPlugin("WorkspaceUserPlugin");
console.debug("Start of the test");

let owner = await UserPlugin.createUser("user1@email.com", "User 1 1", "owner");
await WorkspacePlugin.createWorkspace("Test Workspace", owner.id);

await UserPlugin.createUser("user2@email.com", "User 2", "read");

let doc = await WorkspacePlugin.createDocument("doc1", "category1");

let docId_id = doc.id;
let docId_docId = doc.docId;


await WorkspacePlugin.updatedocId(docId_docId, "_doc1");

doc = await WorkspacePlugin.getDocument(docId_id);
console.assert(doc.id === docId_id, "I was not able to get document by the artificial id");

doc = await WorkspacePlugin.getDocument("doc1");
console.assert(doc === undefined, "I was still able to get document by old id");

doc = await WorkspacePlugin.getDocument("_doc1");
console.assert(doc.id !== doc.docId && doc.id === docId_id && doc.docId === '_doc1', "I was not able to get document by the new docId");

await WorkspacePlugin.shutDown();

console.debug("End of test");

