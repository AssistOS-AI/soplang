import {} from "../deps/clean.mjs"
await $$.registerPlugin("DefaultPersistence", "../../plugins/StandardPersistencePlugin.js");
await $$.registerPlugin("WorkspacePlugin", "../../plugins/WorkspacePlugin.js");
let WorkspacePlugin =  $$.loadPlugin("WorkspacePlugin");

console.debug("Start of the test");

let ownerId = await WorkspacePlugin.createUser("user1@email.com", "User 1 1", "owner").id;
await WorkspacePlugin.createWorkspace("Test Workspace", ownerId);

await WorkspacePlugin.createUser("user2@email.com", "User 2", "read");

let doc = await WorkspacePlugin.createDocument("doc1", "category1");

let docId_id = doc.id;
let docId_docId = doc.docId;


await WorkspacePlugin.updateDocId(docId_docId, "_doc1");

doc = await WorkspacePlugin.getDocument(docId_id);
console.assert(doc.id === docId_id, "I was not able to get document by the artificial id");

doc = await WorkspacePlugin.getDocument("doc1");
console.assert(doc === undefined, "I was still able to get document by old id");

doc = await WorkspacePlugin.getDocument("_doc1");
console.assert(doc.id !== doc.docId && doc.id === docId_id && doc.docId === '_doc1', "I was not able to get document by the new docId");

await WorkspacePlugin.shutDown();

console.debug("End of test");

