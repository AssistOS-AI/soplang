import {} from "../deps/clean.mjs"

let WorkspacePlugin =  $$.loadPlugin("WorkspacePlugin");

let ownerId = await WorkspacePlugin.createUser("user1@email.com", "User 1 1", "owner").id;
await WorkspacePlugin.createWorkspace("Test Workspace", ownerId);

await WorkspacePlugin.createUser("user2@email.com", "User 2", "read");


await WorkspacePlugin.createPersonality("personality1", "Default Personality in workspace Test Workspace. Be short and polite");
await WorkspacePlugin.createPersonality("personality2", "Default Personality in workspace Test Workspace. Be short and polite");
await WorkspacePlugin.createDocument("doc1", "category1");
await WorkspacePlugin.createDocument("doc2", "category1");
await WorkspacePlugin.createDocument("doc3", "category2");

let personalityByName = await WorkspacePlugin.getPersonalityByName("personality1");
console.assert(personalityByName.name === "personality1", "Expected personality1");

let allDocumentInCategory1 = await WorkspacePlugin.getDocumentsByCategory("category1");

console.assert(allDocumentInCategory1.length === 2, "Expected 2 documents in category1");

try{
    await WorkspacePlugin.createUser("user2@email.com", "User 3", "guest");
    console.assert(false);
} catch(error){
    //console.assert(true,"Expected exception:", error.message);
}

await WorkspacePlugin.shutDown();

console.debug("End of indexes and collection tests");

