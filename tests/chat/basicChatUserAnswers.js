import {} from "../deps/clean.mjs";
import assert from "assert";
import path from "path";
import fsPromises from "fs/promises";

let chatPlugin = $$.loadPlugin("ChatRoom");
let agentPlugin = $$.loadPlugin("Agent");
await agentPlugin.createAgent("Assistant");
await agentPlugin.selectLLM("Assistant", "chat", "fakeModel", "FakeProvider");

let script = `
    @history new Table from message timestamp role
    @context new Table from message timestamp role
    @currentUser := $arg1
    @agentName := $arg2
    @assistant new ChatAIAgent $agentName
    @user new ChatUserAgent $currentUser
    @chat new Chat $history $context $assistant $user
    @UIContext := ""
    
    context.upsert system [ assistant.getSystemPrompt ] "" system
    @newReply macro reply ~history ~context ~chat
        @res history.upsert $reply
        context.upsert $res
        chat.notify $res
        return $res
    end
`;
//script needs to have @chat variable
let docId = "TestChat"
process.env.SERVERLESS_ROOT_FOLDER = process["env"].PERSISTENCE_FOLDER;
let scriptsPath = path.join(process.env.SERVERLESS_ROOT_FOLDER, "applications/TestApp/chat-scripts");
await fsPromises.mkdir(scriptsPath, { recursive: true });

let codeManager = $$.loadPlugin("CodeManager");
await codeManager.saveChatScript("TestApp","TestScript", script);

let slowResponse = chatPlugin.listenForMessages(docId);
let expectedChatResponses = [
    {from: "Assistant"}, //processing response
    {from: "Assistant"},
    {from: "John", message: "Hello agent"},
    {from: "Assistant"}, //processing response
    {from: "Assistant"},
];
let responses = [];
slowResponse.onProgress((response) => {
    responses.push(response);
});

await chatPlugin.createChat("user@user.com", docId, "TestApp", "TestScript", ["John", "Assistant"]);

await chatPlugin.chatInput(docId, "John", "Hello agent", "human");

await new Promise(resolve => setTimeout(resolve, 2000));
for(let i = 0; i < expectedChatResponses.length; i++) {
    assert(responses[i].from === expectedChatResponses[i].from, `Response ${i} from should be from ${expectedChatResponses[i].from}`);
    if(expectedChatResponses[i].message) {
        assert(responses[i].message === expectedChatResponses[i].message, `Response ${i} message should match`);
    }
}

await $$.endTest();
