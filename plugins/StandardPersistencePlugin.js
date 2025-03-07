

let extensiblePersistenceModule = require('../ExtensiblePersistence/ExtensiblePersistence.js');
let systemLogger = require("../src/logging/WorkSpaceLogger.js").getSystemLogger();
let autoSaverModule = require('../ExtensiblePersistence/ObjectsAutoSaver.js');

//let autoSaverModule = require('../src/persistence/ObjectsAutoSaver.js');
//let extensiblePersistenceModule = require('../src/persistence/ExtensiblePersistence.js');
async function createStandardPersistencePlugin(){
    let autoSaver = await autoSaverModule.getAutoSaverPersistence();
    let persistence = await extensiblePersistenceModule.getPersistentStorage(autoSaver, systemLogger, {
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

    return persistence;
}

let singleton = null;

module.exports = {
    getInstance: async function () {
        if(!singleton){
            singleton = await createStandardPersistencePlugin();
        }
        return singleton;
    },
    getAllow: function(){
        return async function(userId, command, ...args){
            return true;
        }
    }
}