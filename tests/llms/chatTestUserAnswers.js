import {} from "../deps/clean.mjs";
import assert from "assert";

let chatPlugin = $$.loadPlugin("Chat");
let agentPlugin = $$.loadPlugin("Agent");
await agentPlugin.createAgent("Assistant");
await agentPlugin.selectLLM("Assistant", "chat", "fakeModel", "FakeProvider");

let script = `
    @currentUser := $arg1
    @agentName := $arg2
    @assistant new ChatAIAgent $agentName
    @user new ChatUserAgent $currentUser
    @chat new Chat $assistant $user  
`;
//script needs to have @chat variable
let docId = "TestChat"
let chatScriptPlugin = $$.loadPlugin("ChatScript");
let chatScript = await chatScriptPlugin.createChatScript("script", script);
await chatPlugin.createChat(docId, chatScript.id, ["John", "Assistant"]);

let response = await chatPlugin.waitMessage(docId);
assert(response.from === "Assistant", "response should be from Assistant");

chatPlugin.chatInput(docId, "John", "Agent, what is your name?");
response = await chatPlugin.waitMessage(docId);
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
