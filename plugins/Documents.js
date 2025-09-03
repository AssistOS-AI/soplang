import {createVarsGraph} from "../src/graph/VarsGraph.js";
import {createRegistry} from "../src/graph/CommandsRegistry.js";
const customTypeRegistry = import("../src/graph/customTypeRegistry.js");

async function Documents(){
    let self = {};
    let persistence = $$.loadPlugin("DefaultPersistence");
    let workspace = $$.loadPlugin("Workspace");
    let graph = workspace.getGraph();

    self.createDocument = async function (docId, documentCategory, title) {
        return await persistence.createDocument({
            title: title,
            docId: docId,
            category: documentCategory,
            infoText: "",
            comments: {
                messages: [],
                status: ""
            },
            commands: "",
            chapters: []
        });
    }

    self.deleteDocument = async function (documentId) {
        let doc = await persistence.getDocument(documentId);
        let allVars = await persistence.getVariablesObjectsByDocId(doc.docId);
        for(let variable of allVars){
            await graph.deleteVariable(doc.docId, variable.varName);
        }
        return await persistence.deleteDocument(documentId);
    }

    self.updateDocument = async (documentId, title, docId, category, infoText, commands, comments) => {
        if (!title) throw new Error("Field 'title' is required, received: " + title);
        if (!docId) throw new Error("Field 'docId' is required, received: " + docId);
        if (!category) throw new Error("Field 'category' is required, received: " + category);
        if (infoText == null) throw new Error("Field 'infoText' is required, received: " + infoText);
        if (commands == null) throw new Error("Field 'commands' is required, received: " + commands);
        let doc = await persistence.getDocument(documentId);

        await graph.analiseCommandSection(doc.docId, undefined, undefined, commands, doc.commands);
        await graph.analiseTextSection(doc.docId, undefined, undefined, infoText);

        return await persistence.updateDocument(documentId, {
            title: title,
            docId: docId,
            category: category,
            infoText: infoText,
            commands: commands,
            comments: comments,
        });
    }

    self.updateDocId = async function (documentId, docId) {
        return await persistence.setDocIdForDocument(documentId, docId);
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
        res.comments = doc.comments;
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
                        comments: chapter.comments,
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

        await graph.analiseCommandSection(doc.docId, undefined, undefined, template.commands, doc.commands);
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

    self.createChapter = async function (documentId, chapterTitle, commands , comments, position) {
        //console.debug(">>>> Creating chapter", chapterTitle, "for document", documentId);
        let document = await persistence.getDocument(documentId);
        if(!commands){
            commands = "";
        }
        let chapter =  await persistence.createChapter({
            title: chapterTitle,
            docId: document.docId,
            commands: commands,
            comments: comments || {
                messages: [],
                status: ""
            },
            paragraphs: []
        });

        await graph.analiseCommandSection(document.docId, chapter.id, undefined, commands);
        await graph.analiseChapterTile(document.docId, chapter.id,  chapterTitle);

        let chapters = document.chapters;
        if(!chapters){
            chapters = [];
        }
        if(position === undefined || position === null){
            position = chapters.length;
        }
        if (position < 0 || position > chapters.length) {
            throw new Error("Cannot create chapter: invalid position");
        }
        chapters.splice(position, 0, chapter.id);
        await persistence.updateDocument(documentId, {chapters});
        return await persistence.getChapter(chapter.id);
    }

    self.createParagraph = async function (chapterId, paragraphText, commands, comments, position) {
        console.debug(">>>> Creating paragraph", paragraphText, "for chapter", chapterId, "commands", commands);
        let chapter = await persistence.getChapter(chapterId);
        if(!commands){
            commands = "";
        }
        let par = await persistence.createParagraph({
            text: paragraphText,
            commands: commands,
            comments: comments || {
                messages: [],
                status: ""
            },
        });

        await graph.analiseCommandSection(chapter.docId, chapter.id, par.id, commands);
        await graph.analiseTextSection(chapter.docId, chapter.id, par.id, paragraphText);

        let paragraphs = chapter.paragraphs;
        if(position === undefined || position === null){
            position = paragraphs.length;
        }
        if (position < 0 || position > paragraphs.length) {
            throw new Error("Cannot create paragraph: invalid position");
        }
        paragraphs.splice(position, 0, par.id);
        //console.debug("!!!!! Created paragraph", chapter, "for chapter", chapter, "new chapters", paragraphs);
        await persistence.updateChapter(chapterId, {paragraphs});
        return await persistence.getParagraph(par.id);
    }

    self.deleteParagraph = async function (chapterId, paragraphId) {
        let chapter = await persistence.getChapter(chapterId);
        let paragraphs = chapter.paragraphs.filter(p => p !== paragraphId);
        await persistence.updateChapter(chapterId, {paragraphs});
        return await persistence.deleteParagraph(paragraphId);
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

    self.getChapterAt = async function (documentId, position) {
        let doc = await persistence.getDocument(documentId);
        let chapterId;
        if(doc.chapters){
            chapterId = doc.chapters[position]
        }
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
        if(!paragraphId){
            return undefined;
        }
        return await persistence.getParagraph(paragraphId);
    }
    self.getParagraph = async function(paragraphId){
        return await persistence.getParagraph(paragraphId);
    }

    self.updateChapter = async function (chapterId, chapterTitle, comments, commands) {
        if (!chapterId) throw new Error(`Field 'chapterId' is required but received: ${chapterId}`);
        if (!chapterTitle) throw new Error(`Field 'chapterTitle' is required but received: ${chapterTitle}`);
        // if (!comments) throw new Error(`Field 'comments' is required but received: ${comments}`);
        if (commands == null) throw new Error(`Field 'commands' is required but received: ${commands}`);

        let chapter = await persistence.getChapter(chapterId);
        await graph.analiseCommandSection(chapter.docId, chapterId, undefined, commands, chapter.commands);
        await graph.analiseChapterTile(chapter.docId, chapterId,  chapterTitle);

        return await persistence.updateChapter(chapterId,{
            title: chapterTitle,
            comments,
            commands
        });
    }
    self.getChapter = async function (chapterId) {
        return await persistence.getChapter(chapterId);
    }
    self.deleteChapter = async function (documentId, chapterId) {
        let document = await persistence.getDocument(documentId);
        let chapters = document.chapters.filter(c => c !== chapterId);
        await persistence.updateDocument(documentId, {chapters});
        return await persistence.deleteChapter(chapterId);
    }

    self.updateParagraph = async function (chapterId, paragraphId, paragraphText, commands, comments) {
        if (!chapterId) throw new Error(`Field 'chapterId' is required but received: ${chapterId}`);
        if (!paragraphId) throw new Error(`Field 'paragraphId' is required but received: ${paragraphId}`);
        if (paragraphText == null) throw new Error(`Field 'paragraphText' is required but received: ${paragraphText}`);
        if (commands == null) throw new Error(`Field 'commands' is required but received: ${commands}`);
        // if (!comments) throw new Error(`Field 'comments' is required but received: ${comments}`);

        let chapter = await persistence.getChapter(chapterId);
        let paragraph = await persistence.getParagraph(paragraphId);
        await graph.analiseCommandSection(chapter.docId, chapterId, paragraphId, commands, paragraph.commands);
        await graph.analiseTextSection(chapter.docId, chapterId, paragraphId, paragraphText);
        return await persistence.updateParagraph(paragraphId,{
            text: paragraphText,
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
    self.deleteSnapshot = async function(documentId, snapshotId) {
        return await persistence.deleteSnapshot(documentId, snapshotId);
    }

    self.getAllDocuments = async function () {
        return await persistence.getEveryDocument();
    }
    self.getAllDocumentObjects = async function () {
        return await persistence.getEveryDocumentObject();
    }

    return self;
}

let singletonInstance = undefined;
export async function getInstance() {
    if (!singletonInstance) {
        singletonInstance = await Documents();
    }
    return singletonInstance;
}
export function getAllow() {
    return async function(globalUserId, email, command, ...args) {
        return true;
    };
}
export function getDependencies() {
    return ["DefaultPersistence", "Workspace"];
}