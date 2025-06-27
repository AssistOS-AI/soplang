import {} from "../../deps/clean.mjs";

import assert from "assert"

let chatPlugin = $$.loadPlugin("Chat");
let workspace = $$.loadPlugin("Workspace");

let script = `
    @currentUser := $arg1
    @agentName := $arg2
    @assistant new ChatAIAgent $agentName
    @user new ChatUserAgent $currentUser
    @chat new Chat $user $assistant 
`;
//script needs to have @chat variable
let docId = "TestChat"
await chatPlugin.createChat(docId, script, ["John", "Assistant"]);

await chatPlugin.chatInput(docId, "John", "Hello agent, how are you?");

let response = await chatPlugin.waitMessage(docId);
assert(response.from === "John", "response should be from waitInput");

await chatPlugin.chatInput(docId, "John", "Hello agent, how are you?");
response = await chatPlugin.waitMessage(docId);
assert(response.from === "Assistant", "response should be from Assistant");

await chatPlugin.chatInput(docId, "John", "What is your name?");
response = await chatPlugin.waitMessage(docId);
assert(response.from === "Assistant", "response should be from Assistant");

await $$.endTest();
