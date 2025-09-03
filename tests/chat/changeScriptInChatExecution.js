import {} from "../deps/clean.mjs";
import assert from "assert"
import path from "path";
import fsPromises from "fs/promises";

let chatPlugin = $$.loadPlugin("ChatRoom");
let agentPlugin = $$.loadPlugin("Agent");
await agentPlugin.createAgent("Assistant", "You are a helpful assistant.");
await agentPlugin.selectLLM("Assistant", "chat", "fakeModel", "FakeProvider");

let script = `
    @history new Table from message timestamp role
    @context new Table from message timestamp role
    @currentUser := $arg1
    @agentName := $arg2
    @assistant new ChatAIAgent $agentName
    @user new ChatUserAgent $currentUser
    @chat new Chat $history $context $user $assistant
    @UIContext := ""
    
    context.upsert system [ assistant.getSystemPrompt ] "" system
    @newReply macro reply ~history ~context ~chat ~assistant
        @res history.upsert $reply
        context.upsert $res
        chat.notify $res
        return $res
    end
`;

process.env.SERVERLESS_ROOT_FOLDER = process["env"].PERSISTENCE_FOLDER;
let scriptsPath = path.join(process.env.SERVERLESS_ROOT_FOLDER, "applications/TestApp/chat-scripts");
await fsPromises.mkdir(scriptsPath, { recursive: true });

let codeManager = $$.loadPlugin("CodeManager");
await codeManager.saveChatScript("TestApp","TestScript", script);

//script needs to have @chat variable
let docId = "TestChat"
await chatPlugin.createChat("user@user.com", docId, "TestApp", "TestScript", ["John", "Assistant"]);
let updatedScript = `
    @history new Table from message timestamp role
    @context new Table from message timestamp role
    @currentUser := $arg1
    @agentName := $arg2
    @assistant new ChatAIAgent $agentName
    @user new ChatUserAgent $currentUser
    @chat new Chat $history $context $user $assistant
    @UIContext := "something"
    
    context.upsert system [ assistant.getSystemPrompt ] "" system
    @newReply macro reply ~history ~context ~chat ~assistant
        @res history.upsert $reply
        context.upsert $res
        chat.notify $res
        return $res
    end
`;
await codeManager.saveChatScript("TestApp", "TestScript", updatedScript);
await chatPlugin.chatInput(docId, "John", "Hello agent, how are you?", "human");
await $$.checkDocVar(docId, "UIContext", "something");
await $$.endTest();
