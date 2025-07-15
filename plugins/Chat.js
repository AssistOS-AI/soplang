import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const soundpubsub = require("soundpubsub").soundPubSub;
async function Chat() {
    const self = {}

    const Document =  $$.loadPlugin('Documents');
    const Workspace = $$.loadPlugin('Workspace');
    const chatScriptPlugin = $$.loadPlugin('ChatScript');

    self.getChat = async function (chatId) {
        return await Document.dumpDocument(chatId)
    }
    self.getChats = async function () {
        const documents = await Document.getDocumentsByCategory('chat')
        return Promise.all(documents.map(doc => Document.getDocument(doc)))
    }


    self.getChatContext = async function(chatId) {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const contextChapter = chapters.find(chapter => chapter.title === 'Context')
        if (!contextChapter) throw new Error('Context chapter not found')
        return Promise.all(contextChapter.paragraphs.map(paragraph => Document.getParagraph(paragraph)))
    }

    self.createChat = async function (docId, scriptId, args) {
        const document = await Document.createDocument(docId, 'chat', docId);
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
        await Document.updateDocument(document.id, document.title, docId, document.category, document.infoText, code, document.comments);
        await Document.createChapter(document.id, 'Messages', '');
        await Workspace.buildOnlyForDocument(docId);

        return await Workspace.getVarValue(docId, "chat");
    }

    self.deleteChat = chatId => Document.deleteDocument(chatId)

    self.resetChat = async function (chatId) {
    }

    self.resetChatContext = async function (chatId) {

    }


    self.getChatHistory = async function (chatId) {
        let chat = await Workspace.getVarValue(chatId, "chat");
        let chatHistoryVar = await chat.getHistory();
        for(let reply of chatHistoryVar) {
            reply.id = reply.truid;
        }
        return chatHistoryVar.data;
    }

    self.chatInput = async function (chatId, agentName, message, role) {
        let chat = await Workspace.getVarValue(chatId, "chat");
        let resultReplyId = await chat.input(agentName, message, role);
        await Workspace.buildOnlyForDocument(chatId);
        return resultReplyId;
    }
    self.editReply = async function (replyId, chatId, agentName, message, role) {
        let chat = await Workspace.getVarValue(chatId, "chat");
        let resultReplyId = await chat.editReply(replyId, agentName, message, role);
        await Workspace.buildOnlyForDocument(chatId);
        return resultReplyId;
    }
    let responses = [];
    self.listenForMessages = function (chatId) {
        let observableResponse = $$.createObservableResponse();
        observableResponse._boundProgress = observableResponse.progress.bind(observableResponse);
        responses.push({chatId, observableResponse});
        soundpubsub.subscribe(chatId, observableResponse._boundProgress);
        return observableResponse;
    }
    self.notify = function (chatId, response) {
        soundpubsub.publish(chatId, response);
    }
    self.stopListeningForMessages = async function (chatId) {
        soundpubsub.unsubscribe(chatId);
        responses = responses.filter(item => item.chatId !== chatId);
    }
    return self;
}

let singletonInstance

export async function getInstance() {
    if (!singletonInstance) singletonInstance = await Chat()
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
