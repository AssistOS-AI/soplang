


let {createVarsGraph} = require("../src/graph/VarsGraph.js");
let {createRegistry} = require("../src/graph/CommandsRegistry.js");

async function WorkspacePlugin(){
    let self = {};
    let persistence = await $$.loadPlugin("DefaultPersistence");

    let commandsRegistry = createRegistry();
    let graph = createVarsGraph(commandsRegistry, persistence);

    self.getGraph = function(){
        return graph;
    }

    self.buildAll = async function () {
        graph.topologicalSort();
        return await graph.buildAll();
    }

    self.getValue = async function (documentId, variableName) {
        return graph.getValue(documentId, variableName);
    }

    self.registerCommand = function (commandName, commandFunction) {
        commandsRegistry.addCommand(commandName, commandFunction);
    }

    self.runScript = async function (script) {
        return await graph.runScript(script);
    }

    self.createWorkspace = async function (workspaceName, ownerId) {
        return await persistence.createWorkspace( {
            id: workspaceName,
            ownerId: ownerId,
            clock: 0
        });
    }

    self.createPersonality = async function (name, description) {
        return await persistence.createPersonality({
            name: name,
            description: description
        });
    }

    self.createUser = async function (email, displayName, role) {
        return await persistence.createUser({
            email: email,
            displayName: displayName,
            role: role
        });
    }

    self.updateUser = async function (userId, email, displayName, role) {
        return await persistence.updateUser(userId,{
            email: email,
            displayName: displayName,
            role: role
        });
    }

    self.updatePersonality = async function (personalityId, name, description, values) {
        return await persistence.updatePersonality(personalityId, {
            name: name,
            description: description,
            ...values
        });
    }

    self.getPersonalityInfo = async function (personalityId) {
        return await persistence.getPersonality(personalityId);
    }

    self.createDocument = async function (docId, documentCategory) {
        return await persistence.createDocument({
            title: docId,
            docId: docId,
            category: documentCategory,
            chapters: []
            });
    }

    self.updatedocId = async function (documentId, docId) {
        return await persistence.setdocIdForDocument(documentId, docId);
    }

    self.getDocument = async function (docId) {
        return await persistence.getDocument(docId);
    }

    self.dumpDocument = async function (documentId) {
        let res = {};
        let doc = await persistence.getDocument(documentId);
        res.id = doc.id;
        res.docId = doc.docId;
        res.title = doc.title;
        res.category = doc.category;
        res.infoText = doc.infoText;
        res.commands = doc.commands;

        for(let key in doc){
            if(key === "chapters"){
                res[key] = [];
                for(let chapterId of doc[key]){
                    let chapter = await persistence.getChapter(chapterId);
                    let chapterJson = {
                        id: chapter.id,
                        title: chapter.title,
                        text: chapter.text,
                        commands: chapter.commands,
                        paragraphs: []
                    }
                    for(let paragraphId of chapter.paragraphs){
                        let paragraph = await persistence.getParagraph(paragraphId);
                        chapterJson.paragraphs.push({
                            id: paragraph.id,
                            text: paragraph.text,
                            commands: paragraph.commands,
                            comments: paragraph.comments
                        });
                    }
                    res[key].push(chapterJson);
                }
            } else {
                res[key] = doc[key];
            }
        }
        return res;
    }

    self.applyTemplate = async function (documentId, template) {
        let doc = await persistence.getDocument(documentId);
        if(doc.chapters.length > 0){
            throw new Error("Document already has content");
        }
        await persistence.updateDocument(documentId, {title: template.title, category: template.category, infoText: template.infoText, commands: template.commands, comments: template.comments});
        if(template.chapters){
            for(let chapter of template.chapters){
                //console.debug(">>>> Creating chapter", chapter);
                let newChapter = await self.createChapter(documentId,  chapter.title, chapter.commands, chapter.comments);
                if(chapter.paragraphs){
                    for(let paragraph of chapter.paragraphs){
                        //console.debug(">>>> Creating paragraph", paragraph);
                        await self.createParagraph(newChapter.id, paragraph.text,paragraph.commands,paragraph.comments);
                    }
                }
            }
        }
        doc = await persistence.getDocument(documentId);
        return doc;
    }

    self.createChapter = async function (documentId, chapterTitle, commands, comments) {
        //console.debug(">>>> Creating chapter", chapterTitle, "for document", documentId);
        let document = await persistence.getDocument(documentId);
        let chapter =  await persistence.createChapter({
            title: chapterTitle,
            commands,
            comments,
            paragraphs: []
        });

        let chapters = document.chapters.concat(chapter.id);
        await persistence.updateDocument(documentId, {chapters});
        return await persistence.getChapter(chapter.id);
    }

    self.createParagraph = async function (chapterId, paragraphText, commands, comments) {
        //console.debug(">>>> Creating paragraph", paragraphText, "for chapter", chapterId);
        let chapter = await persistence.getChapter(chapterId);
        let par = await persistence.createParagraph({
            text: paragraphText,
            commands,
            comments
        });
        let paragraphs = chapter.paragraphs.concat(par.id);
        //console.debug("!!!!! Created paragraph", chapter, "for chapter", chapter, "new chapters", paragraphs);
        await persistence.updateChapter(chapterId, {paragraphs});
        return await persistence.getParagraph(par.id);
    }

    self.changeParagraphOrder = async function (chapterId, paragraphId, newPosition) {
        let chapter = await persistence.getChapter(chapterId);
        let paragraphs = chapter.paragraphs;
        let index = paragraphs.indexOf(paragraphId);
        if(index === -1){
            throw new Error("Paragraph not found in chapter");
        }
        paragraphs.splice(index, 1);
        paragraphs.splice(newPosition, 0, paragraphId);
        return await persistence.updateChapter(chapterId, {paragraphs});
    }

    self.changeChapterOrder = async function (documentId, chapterId, newPosition) {
        let doc = await persistence.getDocument(documentId);
        let chapters = doc.chapters;
        let index = chapters.indexOf(chapterId);
        if(index === -1){
            throw new Error("Chapter not found in document");
        }
        chapters.splice(index, 1);
        chapters.splice(newPosition, 0, chapterId);
        return await persistence.updateDocument(documentId, {chapters});
    }

    self.updateDocumentInfo = async function (documentId, title, category, infoText, commands) {
        if(!title || !category || !infoText || !commands){
            throw new Error("All fields are required to be defined");
        }
        return await persistence.updateDocument(documentId,{
            title,
            category,
            infoText,
            commands
        });
    }

    self.getChapterAt = async function (documentId, position) {
        let doc = await persistence.getDocument(documentId);
        let chapterId = doc.chapters[position];
        //console.debug(">>>> Getting chapter at position", position, "chapterId", chapterId, "from doc", doc);
        if(!chapterId){
          return undefined;
        }
        return await persistence.getChapter(chapterId);
    }

    self.getParagraphAt = async function (documentId, chapterPosition, paragraphPosition) {
        let doc = await persistence.getDocument(documentId);
        let chapterId = doc.chapters[chapterPosition];
        let chapter = await persistence.getChapter(chapterId);
        let paragraphId = chapter.paragraphs[paragraphPosition];
        return await persistence.getParagraph(paragraphId);
    }

    self.updateChapter = async function (chapterId, title, comments, commands) {
        return await persistence.updateChapter(chapterId,{
            title,
            comments,
            commands
        });
    }

    self.updateParagraph = async function (chapterId, paragraphId, text, commands, comments) {
        return await persistence.updateParagraph(paragraphId,{
            text,
            commands,
            comments
        });
    }

    self.snapshot = async function (documentId) {
        return await persistence.snapshot(documentId);
    }

    self.restore = async function (documentId, snapshotId) {
        return await persistence.restore(documentId, snapshotId);
    }

    self.getPersonalityByName = async function (name) {
        return await persistence.getPersonalityByName(name);
    }

    self.getDocumentsByCategory = async function (category) {
        return await persistence.getDocumentsByCategory(category);
    }

    self.getUserByEmail = async function (email) {
        return await persistence.getUserByEmail(email);
    }

    self.getDocumentSnapshots = async function (documentId) {
        return await persistence.getSnapshotByDocument(documentId);
    }

    self.getAllUsers = async function () {
        return await persistence.getEveryUser();
    }

    self.getAllDocuments = async function () {
        return await persistence.getEveryDocument();
    }

    self.getAllPersonalities = async function () {
        return await persistence.getEveryPersonality();
    }

    self.getAllVariables = async function () {
        return await persistence.getEveryVariable();
    }


    self.forceSave = async function () {
        return await persistence.forceSave();
    }

    self.shutDown = async function () {
        return await persistence.shutDown();
    }
    return self;
}

let singletonInstance = undefined;

module.exports = {
    getInstance: async function () {
        if(!singletonInstance){
            singletonInstance = await WorkspacePlugin();
        }
        return singletonInstance;
    },
    getAllow: function(){
            return async function(globalUserId, email, command, ...args){
                return true;
            }
    }
}