import {} from "../deps/clean.mjs"

import WorkspaceCoreModule from "../../src/WorkspaceCore.js";
let workSpaceCore = await WorkspaceCoreModule.getCore();

let ownerId = await workSpaceCore.createUser("user1@email.com", "User 1 1", "owner").id;
await workSpaceCore.createWorkspace("Test Workspace", ownerId);

await workSpaceCore.createUser("user2@email.com", "User 2", "read");

let doc = await workSpaceCore.createDocument("doc1", "category1");

let docId_id = doc.id;
let docId_docId = doc.docId;

console.debug("Created document", doc, "with id", docId_id, "and docId", docId_docId);
await workSpaceCore.updateDocId(docId_docId, "_doc1");

doc = await workSpaceCore.getDocument(docId_id);
console.assert(doc.id !== docId_id, "I was not able to get document by the artificial id");

doc = await workSpaceCore.getDocument("doc1");
console.assert(doc === undefined, "I was still able to get document by old id");

doc = await workSpaceCore.getDocument("_doc1");
console.assert(doc.id !== doc.docId && doc.id === docId_id && doc.docId === '_doc1', "I was not able to get document by the new docId");

await workSpaceCore.shutDown();

console.debug("End of test");

