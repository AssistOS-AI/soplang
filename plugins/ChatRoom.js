import {createRequire} from 'module';
import crypto from "crypto";

const require = createRequire(import.meta.url);
const soundpubsub = require("soundpubsub").soundPubSub;
async function ChatRoom() {
    const self = {}

    const documentsPlugin =  $$.loadPlugin('Documents');
    const workspace = $$.loadPlugin('Workspace');
    const chatScriptPlugin = $$.loadPlugin('ChatScript');
    const persistence = $$.loadPlugin("DefaultPersistence");
    await persistence.configureTypes({
        chatUser: {
            email: "string",
            chats: "array"
        }
    })
    await persistence.createIndex("chatUser", "email");

    self.getChat = async function (chatId) {
        return await documentsPlugin.dumpDocument(chatId)
    }
    self.getChats = async function () {
        const documents = await documentsPlugin.getDocumentsByCategory('chat')
        return Promise.all(documents.map(doc => documentsPlugin.getDocument(doc)))
    }


    self.getChatContext = async function(chatId) {
        const chat = await documentsPlugin.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => document.getChapter(chapter)))
        const contextChapter = chapters.find(chapter => chapter.title === 'Context')
        if (!contextChapter) throw new Error('Context chapter not found')
        return Promise.all(contextChapter.paragraphs.map(paragraph => documentsPlugin.getParagraph(paragraph)))
    }
    self.getComponentsForChatRoomInstance = async function(chatId){
        let scriptName = await workspace.getVarValue(chatId, "chatScriptName");
        let script = await chatScriptPlugin.getChatScript(scriptName);
        return script.components;
    }

    self.createDefaultChat = async function(userEmail){
        let webAssistantPlugin = $$.loadPlugin("WebAssistant");
        let webAssistant = await webAssistantPlugin.getWebAssistant();
        let docId = webAssistant.agentName + "_Chat_" + crypto.randomBytes(4).toString('hex');
        await self.createChat(userEmail,  docId, "DefaultScript", ["User", webAssistant.agentName]);
        return docId;
    }

    self.createChat = async (email, docId, scriptName, args) => {
        const chatObj = await createChatDocument(docId, scriptName, args);
        if(await persistence.hasChatUser(email)){
            let chatUser = await persistence.getChatUser(email);
            chatUser.chats.push(chatObj.docId);
            await persistence.updateChatUser(email, chatUser);
        } else {
            await persistence.createChatUser({chats: [chatObj.docId], email:email});
        }
        return chatObj.docId;
    };

    self.getUserChats = async (email) => {
        if(!await persistence.hasChatUser(email)){
            return [];
        }
        let chatUser = await persistence.getChatUser(email);
        return chatUser.chats;
    }
     async function createChatDocument(docId, scriptId, args) {
        const document = await documentsPlugin.createDocument(docId, 'chat', docId);
        let initialisation = `@arg0 := ${document.docId} \n`;
        if (Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
                initialisation += ("@arg" + (i + 1) + " := " + args[i] + "\n");
            }
        } else {
            initialisation += ("@arg1 := " + args + "\n");
        }
        initialisation += `@chatScriptName := ${scriptId} \n`
        const script = await chatScriptPlugin.getChatScript(scriptId);
        const code = initialisation + script.code;
        await documentsPlugin.updateDocument(document.id, document.title, docId, document.category, document.infoText, code, document.comments);
        await documentsPlugin.createChapter(document.id, 'Chapter 1', '');
        let buildSuccess = await workspace.buildOnlyForDocument(docId);
        if(!buildSuccess){
            throw new Error(`Failed to build document ${docId} with code ${code} and errors: ${JSON.stringify($$.getBuildErrors())}`)
        }
        let chat = await workspace.getVarValue(docId, "chat");
        await chat.start();
        return chat;
    }

    self.deleteChat = async function (chatId) {
        return await documentsPlugin.deleteDocument(chatId);
    }

    self.getChatHistory = async function (chatId) {
        let chat = await workspace.getVarValue(chatId, "chat");
        let historyTable = await chat.getHistory();
        return historyTable.data;
    }

    self.chatInput = async function (chatId, from, message, role) {
        let timestamp = new Date().toISOString();
        let reply = await workspace.runMacro(chatId, "newReply", {from, message, timestamp, role});
        //await workspace.buildOnlyForDocument(chatId);
        return reply.truid;
    }

    let responses = [];
    self.listenForMessages = function (chatId) {
        let observableResponse = $$.createObservableResponse();
        observableResponse._boundProgress = observableResponse.progress.bind(observableResponse);
        responses.push({chatId, observableResponse});
        soundpubsub.subscribe(chatId, observableResponse._boundProgress);
        return observableResponse;
    }
    self.notifySubscribers = function (chatId, response) {
        soundpubsub.publish(chatId, response);
    }
    self.stopListeningForMessages = async function (chatId) {
        soundpubsub.unsubscribe(chatId);
        let response = responses.find(item => item.chatId === chatId);
        response.observableResponse.end();
        responses = responses.filter(item => item.chatId !== chatId);
    }
    return self;
}

let singletonInstance

export async function getInstance() {
    if (!singletonInstance) singletonInstance = await ChatRoom()
    return singletonInstance
}

export function getAllow() {
    return async function () {
        return true
    }
}

export function getDependencies() {
    return ['Documents', "Workspace", "DefaultPersistence", "ChatScript"]
}
