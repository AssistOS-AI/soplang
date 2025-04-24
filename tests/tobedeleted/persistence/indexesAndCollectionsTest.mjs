import {} from "../../deps/clean.mjs"
await $$.clean();
let WorkspacePlugin =  $$.loadPlugin("Workspace");
let Agent =  $$.loadPlugin("Agent");
let UserPlugin =  $$.loadPlugin("WorkspaceUserPlugin");

let ownerId = await UserPlugin.createUser("user1@email.com", "User 1 1", "owner").id;
await WorkspacePlugin.createWorkspace("Test Workspace", ownerId);

await UserPlugin.createUser("user2@email.com", "User 2", "read");


await Agent.createAgent("agent1", "Default Agent in workspace Test Workspace. Be short and polite");
await Agent.createAgent("agent2", "Default Agent in workspace Test Workspace. Be short and polite");
await WorkspacePlugin.createDocument("doc1", "category1");
await WorkspacePlugin.createDocument("doc2", "category1");
await WorkspacePlugin.createDocument("doc3", "category2");

let agentByName = await Agent.getAgent("agent1");
console.assert(agentByName.name === "agent1", "Expected agent1");

let allDocumentInCategory1 = await WorkspacePlugin.getDocumentsByCategory("category1");

console.assert(allDocumentInCategory1.length === 2, "Expected 2 documents in category1");

try{
    await UserPlugin.createUser("user2@email.com", "User 3", "guest");
    console.assert(false);
} catch(error){
    //console.assert(true,"Expected exception:", error.message);
}

await WorkspacePlugin.shutDown();

console.debug("End of indexes and collection tests");

