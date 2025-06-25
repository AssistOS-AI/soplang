async function Chat() {
    const self = {}

    const Document = await $$.loadPlugin('Documents')
    const Workspace = await $$.loadPlugin('Workspace')

    self.getChat = async function(chatId) {
       return await Document.dumpDocument(chatId)
    }

    self.getChatMessage = async (chatId, messageId) =>
        Document.getParagraph(messageId)

    self.getChatMessages = async chatId => {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const messagesChapter = chapters.find(chapter => chapter.title === 'Messages')
        if (!messagesChapter) throw new Error('Messages chapter not found')
        return Promise.all(messagesChapter.paragraphs.map(paragraph => Document.getParagraph(paragraph)))
    }

    self.getChatContext = async chatId => {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const contextChapter = chapters.find(chapter => chapter.title === 'Context')
        if (!contextChapter) throw new Error('Context chapter not found')
        return Promise.all(contextChapter.paragraphs.map(paragraph => Document.getParagraph(paragraph)))
    }

    self.createChat = async function (docId, script) {
        const document = await Document.createDocument(docId, 'chat', docId);
        await Document.updateDocument(document.id, document.title, docId, document.category, document.infoText, script, document.comments);
        await Document.createChapter(document.id, 'Messages', '');
        await Document.createChapter(document.id, 'Context', '');
        await Workspace.buildOnlyForDocument(docId);
        return document.id;
    }

    self.deleteChat = chatId => Document.deleteDocument(chatId)

    self.resetChat = async chatId => {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const contextChapter = chapters.find(chapter => chapter.title === 'Context')
        const messagesChapter = chapters.find(chapter => chapter.title === 'Messages')
        return Promise.all([
            ...messagesChapter.paragraphs.map(paragraph => Document.deleteParagraph(messagesChapter.id, paragraph.id)),
            ...contextChapter.paragraphs.map(paragraph => Document.deleteParagraph(contextChapter.id, paragraph.id))
        ])
    }

    self.resetChatContext = async chatId => {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const contextChapter = chapters.find(chapter => chapter.title === 'Context')
        if (!contextChapter) throw new Error('Context chapter not found')
        await Promise.all(contextChapter.paragraphs.map(paragraph => Document.deleteParagraph(contextChapter.id, paragraph.id)))
    }

    self.resetChatMessages = async chatId => {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const messagesChapter = chapters.find(chapter => chapter.title === 'Messages')
        if (!messagesChapter) throw new Error('Messages chapter not found')
        await Promise.all(messagesChapter.paragraphs.map(paragraph => Document.deleteParagraph(messagesChapter.id, paragraph.id)))
    }

    self.addPreferenceToContext = async (chatId, message) => {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const contextChapter = chapters.find(chapter => chapter.title === 'Context')
        if (!contextChapter) throw new Error('Context chapter not found')
        return Document.createParagraph(contextChapter.id, message, { replay: { role: 'assistant' } }, {})
    }

    self.deletePreferenceFromContext = async (chatId, messageId) => {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const contextChapter = chapters.find(chapter => chapter.title === 'Context')
        if (!contextChapter) throw new Error('Context chapter not found')
        return Document.deleteParagraph(contextChapter.id, messageId)
    }

    self.addMessageToContext = async (chatId, messageId) => {
        const chat = await Document.getDocument(chatId)
        const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
        const contextChapter = chapters.find(chapter => chapter.title === 'Context')
        const messageChapter = chapters.find(chapter => chapter.title === 'Messages')
        if (!contextChapter) throw new Error('Context chapter not found')
        if (!messageChapter) throw new Error('Messages chapter not found')

        const message = messageChapter.paragraphs.find(paragraph => paragraph.id === messageId)
        if (!message) throw new Error('Message not found')

        message.commands.replay.isContext = true
        await Document.updateParagraph(messageChapter.id, messageId, message.text, message.commands, message.comments)

        return Document.createParagraph(contextChapter.id, message.text, { replay: { role: 'assistant', isContextFor: message.id } }, {})
    }

    self.removeMessageFromContext = async (chatId, messageId) => {
        const chat = await Document.getDocument(chatId)
        const contextChapter = chat.chapters.find(chapter => chapter.title === 'Context')
        const messageChapter = chat.chapters.find(chapter => chapter.title === 'Messages')
        if (!contextChapter) throw new Error('Context chapter not found')
        if (!messageChapter) throw new Error('Messages chapter not found')

        const contextMessage = contextChapter.paragraphs.find(paragraph => paragraph.id === messageId)
        const referenceMessage = messageChapter.paragraphs.find(paragraph => paragraph.id === contextMessage.commands.replay.isContextFor)

        referenceMessage.commands.replay.isContext = false
        await Document.updateParagraph(messageChapter.id, referenceMessage.id, referenceMessage.text, referenceMessage.commands, referenceMessage.comments)

        return Document.deleteParagraph(contextChapter.id, messageId)
    }

    self.updateChatContextItem = async (chatId, contextItemId, newText) => {
        const chat = await Document.getDocument(chatId)
        const contextChapter = chat.chapters.find(chapter => chapter.title === 'Context')
        if (!contextChapter) throw new Error('Context chapter not found')
        const contextItem = contextChapter.paragraphs.find(paragraph => paragraph.id === contextItemId)
        if (!contextItem) throw new Error('Context item not found')
        return Document.updateParagraph(contextChapter.id, contextItemId, newText, contextItem.commands, contextItem.comments)
    }

    self.sendMessage = async (chatId, userId, message, role) => {
        const chat = await Document.getDocument(chatId)
        let chapterId
        if (chat.chapters.length === 0) {
            chapterId = await Document.createChapter(chatId, 'Messages', "");
            await Document.createChapter(chatId, 'Context', "");
        } else {
            const chapters = await Promise.all(chat.chapters.map(chapter => Document.getChapter(chapter)))
            chapterId = chapters.find(chapter => chapter.title === 'Messages')?.id
        }
        if (!chapterId) throw new Error('Messages chapter not found')
        return Document.createParagraph(chapterId, message, { replay: { role, name: userId } }, {})
    }

    self.sendQuery = async (chatId, personalityId, userId, userPrompt) => {}

    self.sendStreamingQuery = async (chatId, personalityId, userId, userPrompt) => {
        return await self.sendQuery(chatId, personalityId, userId, userPrompt)
    }

    self.activateChat = async function (chatId){
        let graph = Workspace.getGraph();
        let chatInstance = await graph.getVarValue(chatId, "chat");
        chatInstance.activateChat();
    }
    self.deactivateChat = async function (chatId){
        let graph = Workspace.getGraph();
        let chatInstance = await graph.getVarValue(chatId, "chat");
        chatInstance.deactivateChat();
    }
    self.userInput = function (chatId, userId, message) {
        let graph = Workspace.getGraph();
        let userInstance = graph.getVarValue(chatId, userId);
        userInstance.resolveQuestionOrResponse(message);
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
    return ['Documents', "Workspace"]
}
