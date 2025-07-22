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

let slowResponse = chatPlugin.listenForMessages(docId);
let expectedChatResponses = [
    {from: "John", message: "Hello agents"},
    {from: "Assistant"},
    {from: "Writer"},
    {from: "Reviewer"}
];
let responses = [];
slowResponse.onProgress((response) => {
    responses.push(response);
});

throw new Error("test not finished yet");
// await chatPlugin.chatInput(docId, "John", "Hello agents");
//
// await new Promise(resolve => setTimeout(resolve, 2000));
// for(let i = 0; i < expectedChatResponses.length; i++) {
//     assert(responses[i].from === expectedChatResponses[i].from, `Response ${i} from should match`);
//     if(expectedChatResponses[i].message) {
//         assert(responses[i].message === expectedChatResponses[i].message, `Response ${i} message should match`);
//     }
// }

await $$.endTest();
