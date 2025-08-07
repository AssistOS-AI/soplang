import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const soundpubsub = require("soundpubsub").soundPubSub;
async function ChatRoom() {
    const self = {}

    const documentsPlugin =  $$.loadPlugin('Documents');
    const workspace = $$.loadPlugin('Workspace');
    const chatScriptPlugin = $$.loadPlugin('ChatScript');

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

    self.createChat = async function (docId, scriptId, args) {
        const document = await documentsPlugin.createDocument(docId, 'chat', docId);
        let initialisation = `@arg0 := ${document.docId} \n`;
        if (Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
                initialisation += ("@arg" + (i + 1) + " := " + args[i] + "\n");
            }
        } else {
            initialisation += ("@arg1 := " + args + "\n");
        }
        const script = await chatScriptPlugin.getChatScript(scriptId);
        const code = initialisation + script.code;
        await documentsPlugin.updateDocument(document.id, document.title, docId, document.category, document.infoText, code, document.comments);
        await documentsPlugin.createChapter(document.id, 'Messages', '');
        await workspace.buildOnlyForDocument(docId);

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
