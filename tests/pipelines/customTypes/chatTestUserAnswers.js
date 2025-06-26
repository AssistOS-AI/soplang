import {} from "../../deps/clean.mjs";

import assert from "assert"

let chatPlugin = $$.loadPlugin("Chat");
let workspace = $$.loadPlugin("Workspace");

let script = `
    @currentUser := $arg1
    @agentName := $arg2
    @assistant new ChatAIAgent $agentName
    @user new ChatUserAgent $currentUser
    @chat new Chat $assistant $user
`;
//script needs to have @chat variable
let docId = "TestChat"
await chatPlugin.createChat(docId, script, ["John", "Assistant"]);

await chatPlugin.chatInput(docId, "John", "Hello agent, how are you?");
await chatPlugin.chatInput(docId, "John", "What is your name?");

let chat = await workspace.getVarValue(docId, "chat");
assert(chat.messages[0].from === "Assistant", "first message should be from Assistant");
assert(chat.messages[1].from === "John", "second message should be from John");
assert(chat.messages[2].from === "Assistant", "third message should be from Assistant");
assert(chat.messages[3].from === "John", "fourth message should be from John");
await $$.endTest();
