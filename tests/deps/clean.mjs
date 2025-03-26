
console.log("Start initialisation...");
import {} from "../../Persisto/clean.mjs";

await $$.registerPlugin("DefaultPersistence", "../plugins/StandardPersistencePlugin.js");
await $$.registerPlugin("Workspace", "../plugins/WorkspacePlugin.js");
await $$.registerPlugin("AgentPlugin", "../plugins/AgentPlugin.js");
await $$.registerPlugin("WorkspaceUser", "../plugins/WorkspaceUser.js");