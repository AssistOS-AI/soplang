

let autoSaverModule = require('../../src/persistence/ObjectsAutoSaver.js');
let extensiblePersistenceModule = require('../../src/persistence/ExtensiblePersistence.js');


function WorkspaceCore(persistence){

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

    this.createDocument = async function (documentName, documentCategory) {
        return await persistence.createDocument({
            title: documentName,
            category: documentCategory
        });
    }

    this.getDocumentInfo = async function (documentId) {
        return await persistence.getDocument(documentId);
    }

    this.dumpDocument = async function (documentId) {
        let res = {};
        let doc = await persistence.getDocument(documentId);
        res.id = doc.id;
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
        return await persistence.applyDocumentTemplate(documentId, template);
    }

    this.createChapter = async function (documentId, chapterTitle) {
        return await persistence.createChapter(documentId,{
            title: chapterTitle
        });
    }

    this.createParagraph = async function (chapterId, paragraphText, commands, comments) {
        return await persistence.createParagraph(chapterId, {
            text: paragraphText,
            commands,
            comments
        });
    }

    this.changeOrderParagraphs = async function (chapterId, paragraphId, newPosition) {
        return await persistence.changeOrderParagraphs(chapterId, paragraphId, newPosition);
    }

    this.changeOrderChapters = async function (documentId, chapterId, newPosition) {
        return await persistence.changeOrderChapters(documentId, chapterId, newPosition);
    }

    this.updateDocument = async function (documentId, title, category, infoText, commands) {
        return await persistence.updateDocument(documentId,{
            title,
            category,
            infoText,
            commands
        });
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

    this.listDocuments = async function (category) {
        return await persistence.listDocuments(category);
    }

    this.listCategories = async function () {
        return await persistence.listCategories();
    }

    this.listPersonalities = async function () {
        return await persistence.listIndexPersonality();
    }

    this.listUsers = async function (role) {
        return await persistence.listMindexUser(role);
    }

    this.listDocumentSnapshots = async function (documentId) {
        return await persistence.listSindexDocument(documentId);
    }

}

module.exports = {
    getCore: function (baseFolder) {

        let autoSaver = autoSaverModule.getAutoSaverPersistence(baseFolder);
        let persistence = extensiblePersistenceModule.getPersistentStorage(autoSaver, {
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
            personalities: {
                id: "singleton workspacePersonalities",
                index: "index personality name"
            },
            user: {
                id: "random",
                email: "string",
                displayName: "string",
                role: "string"
            },
            spaceUsers: {
                id: "singleton workspaceUsers",
                index: "index user email",
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
            snapshots: {
                id: "random",
                sindex: "sindex document"
            },
            categories: {
                id: "singleton documentCategories",
                mindex: "mindex document category",
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
            },
            variables: {
                id: "singleton workspaceVariables",
                index: "index variable name"
            },
        });
        return new WorkspaceCore(persistence);
    }
}