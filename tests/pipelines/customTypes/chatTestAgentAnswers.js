import {} from "../../deps/clean.mjs";

import assert from "assert"

let chatPlugin = $$.loadPlugin("Chat");

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

chatPlugin.chatInput(docId, "John", "Hello agent, how are you?");
let response = await chatPlugin.waitMessage(docId);
assert(response.from === "John", "response should be from John");

response = await chatPlugin.waitMessage(docId);
assert(response.from === "Assistant", "response should be from Assistant");

chatPlugin.chatInput(docId, "John", "Agent, what is your name?");
response = await chatPlugin.waitMessage(docId);
assert(response.from === "John", "response should be from Assistant");
assert(response.message === "Agent, what is your name?", "message should be Agent, what is your name?");

response = await chatPlugin.waitMessage(docId);
assert(response.from === "Assistant", "response should be from Assistant");

await $$.endTest();
