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

    self.getVarValue = async function (documentId, variableName) {
        return graph.getVarValue(documentId, variableName);
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

        await graph.analiseCommandSection(doc.docId, undefined, undefined, template.commands);
        await graph.analiseDocumentTile(doc.docId, template.title);
        await graph.analiseTextSection(doc.docId, undefined, undefined, template.infoText);

        await persistence.updateDocument(documentId, {title: template.title, category: template.category, infoText: template.infoText, commands: template.commands, comments: template.comments});
        if(template.chapters){
            for(let chapter of template.chapters){
                console.debug(">>>> Creating chapter", chapter, "with paragraphs ", chapter.paragraphs);
                let newChapter = await self.createChapter(documentId,  chapter.title, chapter.commands, chapter.comments);
                if(Array.isArray(chapter.paragraphs) && chapter.paragraphs.length > 0){
                    console.debug(">>>> Creating paragraphs", chapter.paragraphs);
                    for(let paragraph of chapter.paragraphs){
                        //console.debug(">>>> Creating paragraph", paragraph);
                        await self.createParagraph(newChapter.id, paragraph.text,paragraph.commands,paragraph.comments);
                    }
                } else {
                    console.debug(">>>> No paragraphs for chapter", chapter);
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
            docId: document.docId,
            commands,
            comments,
            paragraphs: []
        });

        await graph.analiseCommandSection(document.docId, chapter.id, undefined, commands);
        await graph.analiseChapterTile(document.docId, chapter.id,  chapterTitle);


        let chapters = document.chapters.concat(chapter.id);
        await persistence.updateDocument(documentId, {chapters});
        return await persistence.getChapter(chapter.id);
    }

    self.createParagraph = async function (chapterId, paragraphText, commands, comments) {
        console.debug(">>>> Creating paragraph", paragraphText, "for chapter", chapterId, "commands", commands);
        let chapter = await persistence.getChapter(chapterId);
        let par = await persistence.createParagraph({
            text: paragraphText,
            commands,
            comments
        });

        await graph.analiseCommandSection(chapter.docId, chapter.id, par.id, commands);
        await graph.analiseTextSection(chapter.docId, chapter.id, par.id, paragraphText);

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
        let doc = await persistence.getDocument(documentId);
        if(!title || !category || !infoText || !commands){
            throw new Error("All fields are required to be defined");
        }

        await graph.analiseCommandSection(doc.docId, undefined, undefined, commands);
        await graph.analiseTextSection(doc.docId, undefined, undefined, infoText);

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

    self.updateChapter = async function (chapterId, chapterTitle, comments, commands) {
        let chapter = await persistence.getChapter(chapterId);
        await graph.analiseCommandSection(chapter.docId, chapterId, undefined, commands);
        await graph.analiseChapterTile(chapter.docId, chapterId,  chapterTitle);

        return await persistence.updateChapter(chapterId,{
            chapterTitle,
            comments,
            commands
        });
    }

    self.updateParagraph = async function (chapterId, paragraphId, paragraphText, commands, comments) {
        let chapter = await persistence.getChapter(chapterId);
        await graph.analiseCommandSection(chapter.docId, chapterId, paragraphId, commands);
        await graph.analiseTextSection(chapter.docId, chapterId, paragraphId, paragraphText);
        return await persistence.updateParagraph(paragraphId,{
            paragraphText,
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

    self.getDocumentsByCategory = async function (category) {
        return await persistence.getDocumentsByCategory(category);
    }

    self.getDocumentSnapshots = async function (documentId) {
        return await persistence.getSnapshotByDocument(documentId);
    }

    self.getAllDocuments = async function () {
        return await persistence.getEveryDocument();
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
    },
    getDependencies: async function(){
        return ["DefaultPersistence"];
    }
}