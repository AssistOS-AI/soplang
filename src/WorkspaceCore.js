

let autoSaverModule = require('./persistence/ObjectsAutoSaver.js');
let extensiblePersistenceModule = require('./persistence/ExtensiblePersistence.js');

let {createVarsGraph} = require("./SpaceGraph/VarsGraph.js");
let {createRegistry} = require("./SpaceGraph/CommandsRegistry.js");

function WorkspaceCore(persistence){
    let self = this;

    let commandsRegistry = createRegistry();
    let graph = createVarsGraph(commandsRegistry, persistence);

    this.buildAll = async function () {
        graph.topologicalSort();
        return await graph.buildAll();
    }

    this.getValue = async function (documentId, variableName) {
        return graph.getValue(documentId, variableName);
    }

    this.registerCommand = function (commandName, commandFunction) {
        commandsRegistry.addCommand(commandName, commandFunction);
    }

    this.runScript = async function (script) {
        return await graph.runScript(script);
    }

    this.createWorkspace = async function (workspaceName, ownerId) {
        return await persistence.createWorkspace( {
            id: workspaceName,
            ownerId: ownerId,
            clock: 0
        });
    }

    this.createPersonality = async function (name, description) {
        return await persistence.createPersonality({
            name: name,
            description: description
        });
    }

    this.createUser = async function (email, displayName, role) {
        return await persistence.createUser({
            email: email,
            displayName: displayName,
            role: role
        });
    }

    this.updateUser = async function (userId, email, displayName, role) {
        return await persistence.updateUser(userId,{
            email: email,
            displayName: displayName,
            role: role
        });
    }

    this.updatePersonality = async function (personalityId, name, description, values) {
        return await persistence.updatePersonality(personalityId, {
            name: name,
            description: description,
            ...values
        });
    }

    this.getPersonalityInfo = async function (personalityId) {
        return await persistence.getPersonality(personalityId);
    }

    this.createDocument = async function (docId, documentCategory) {
        return await persistence.createDocument({
            title: docId,
            docId: docId,
            category: documentCategory,
            chapters: []
            });
    }

    this.updateDocId = async function (documentId, docId) {
        return await persistence.setDocIdForDocument(documentId, docId);
    }

    this.getDocument = async function (docId) {
        return await persistence.getDocument(docId);
    }

    this.dumpDocument = async function (documentId) {
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

    this.applyTemplate = async function (documentId, template) {
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

    this.createChapter = async function (documentId, chapterTitle, commands, comments) {
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

    this.createParagraph = async function (chapterId, paragraphText, commands, comments) {
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

    this.changeParagraphOrder = async function (chapterId, paragraphId, newPosition) {
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

    this.changeChapterOrder = async function (documentId, chapterId, newPosition) {
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

    this.updateDocumentInfo = async function (documentId, title, category, infoText, commands) {
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

    this.getChapterAt = async function (documentId, position) {
        let doc = await persistence.getDocument(documentId);
        let chapterId = doc.chapters[position];
        //console.debug(">>>> Getting chapter at position", position, "chapterId", chapterId, "from doc", doc);
        if(!chapterId){
          return undefined;
        }
        return await persistence.getChapter(chapterId);
    }

    this.getParagraphAt = async function (documentId, chapterPosition, paragraphPosition) {
        let doc = await persistence.getDocument(documentId);
        console.debug(">>>> Getting paragraph at position", paragraphPosition, "from chapter at position", chapterPosition, "from doc", doc);
        let chapterId = doc.chapters[chapterPosition];
        let chapter = await persistence.getChapter(chapterId);
        let paragraphId = chapter.paragraphs[paragraphPosition];
        return await persistence.getParagraph(paragraphId);
    }

    this.updateChapter = async function (chapterId, title, comments, commands) {
        return await persistence.updateChapter(chapterId,{
            title,
            comments,
            commands
        });
    }

    this.updateParagraph = async function (chapterId, paragraphId, text, commands, comments) {
        return await persistence.updateParagraph(paragraphId,{
            text,
            commands,
            comments
        });
    }

    this.snapshot = async function (documentId) {
        return await persistence.snapshot(documentId);
    }

    this.restore = async function (documentId, snapshotId) {
        return await persistence.restore(documentId, snapshotId);
    }

    this.getPersonalityByName = async function (name) {
        return await persistence.getPersonalityByName(name);
    }

    this.getDocumentsByCategory = async function (category) {
        return await persistence.getDocumentsByCategory(category);
    }

    this.getUserByEmail = async function (email) {
        return await persistence.getUserByEmail(email);
    }

    this.getDocumentSnapshots = async function (documentId) {
        return await persistence.getSnapshotByDocument(documentId);
    }

    this.getAllUsers = async function () {
        return await persistence.getEveryUser();
    }

    this.getAllDocuments = async function () {
        return await persistence.getEveryDocument();
    }

    this.getAllPersonalities = async function () {
        return await persistence.getEveryPersonality();
    }

    this.getAllVariables = async function () {
        return await persistence.getEveryVariable();
    }


    this.forceSave = async function () {
        return await persistence.forceSave();
    }

    this.shutDown = async function () {
        return await persistence.shutDown();
    }

}

module.exports = {
    getCore: async function () {
        let autoSaver = await autoSaverModule.getAutoSaverPersistence();
        let persistence = await extensiblePersistenceModule.getPersistentStorage(autoSaver, {
            workspace: {
                id: "singleton workspace",
                documents: "array document",
                clock : "integer",
                permissions: "any"
            },
            personality: {
                id: "random",
                name: "string",
                description: "string"
            },
            user: {
                id: "random",
                email: "string",
                displayName: "string",
                role: "string"
            },
            paragraph: {
                id: "random",
                text: "string",
                commands: "string",
                comments: "string",
                lastChangeClock: "integer"
            },
            chapter: {
                id: "random",
                title: "string",
                text: "string",
                commands: "string",
                comments: "string",
                paragraphs: "array paragraph",
                lastChangeClock: "integer"
            },
            document: {
                id: "random",
                title: "string",
                category: "string",
                infoText: "string",
                commands: "string",
                comments: "string",
                chapters: "array chapter",
                lastChangeClock: "integer"
            },
            snapshot: {
                id: "random",
                document: "string",
                data: "any",
            },
            variable: {
                id: "custom",
                name: "string",
                value: "any",
                expression: "string",
                documentId: "string",
                chapterId: "string",
                paragraphId: "string",
                clock: "integer",
                timestamp: "timestamp",
                valueFUnction: "string",
                clockFUnction: "string"
            }
        });

        await persistence.createIndex("user", "email");
        await persistence.createIndex("personality", "name");
        await persistence.createIndex("variable", "name");
        await persistence.createIndex("document", "docId");

        await persistence.createCollection("documents", "document", "category");
        await persistence.createCollection("snapshots", "snapshot", "document");

        return new WorkspaceCore(persistence);
    }
}