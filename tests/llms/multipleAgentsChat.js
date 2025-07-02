import {} from "../deps/clean.mjs";
import assert from "assert";

let chatPlugin = $$.loadPlugin("Chat");

let agentPlugin = $$.loadPlugin("Agent");
await agentPlugin.createAgent("Assistant");
await agentPlugin.selectLLM("Assistant", "chat", "fakeModel", "FakeProvider");

await agentPlugin.createAgent("Writer");
await agentPlugin.selectLLM("Writer", "chat", "fakeModel", "FakeProvider");

await agentPlugin.createAgent("Reviewer");
await agentPlugin.selectLLM("Reviewer", "chat", "fakeModel", "FakeProvider");


let script = `
    @currentUser := $arg1
    @agentName := $arg2
    @writer := $arg3
    @reviewer := $arg4
    @assistant new ChatAIAgent $agentName
    @writerAgent new ChatAIAgent $writer
    @reviewerAgent new ChatAIAgent $reviewer
    @user new ChatUserAgent $currentUser
    @chat new Chat $user $assistant $writerAgent $reviewerAgent
`;
//script needs to have @chat variable
let docId = "TestChat";
let chatScriptPlugin = $$.loadPlugin("ChatScript");
let chatScript = await chatScriptPlugin.createChatScript("script", script);
await chatPlugin.createChat(docId, chatScript.id, ["John", "Assistant", "Writer", "Reviewer"]);

chatPlugin.chatInput(docId, "John", "Hello agent, how are you?");
let response = await chatPlugin.waitMessage(docId);
assert(response.from === "John", "response should be from John");

response = await chatPlugin.waitMessage(docId);
assert(response.from === "Assistant", "response should be from Assistant");

response = await chatPlugin.waitMessage(docId);
assert(response.from === "Writer", "response should be from Writer");

response = await chatPlugin.waitMessage(docId);
assert(response.from === "Reviewer", "response should be from Reviewer");

await $$.endTest();
