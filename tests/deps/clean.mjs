Error.stackTraceLimit = Infinity;
console.log("Start initialisation...");
import {} from "../../Persisto/clean.mjs";

await $$.clean();
await $$.registerPlugin("DefaultPersistence", "../plugins/StandardPersistencePlugin.js");
await $$.registerPlugin("Workspace", "../plugins/WorkspacePlugin.js");
await $$.registerPlugin("Agents", "../plugins/AgentPlugin.js");
await $$.registerPlugin("WorkspaceUsers", "../plugins/WorkspaceUser.js");