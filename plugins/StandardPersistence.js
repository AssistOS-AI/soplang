import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const persistoModule = require('../Persisto/index.cjs');

process.on("SIGTERM", async ()=>{
    console.debug("SIGTERM received");
    let persistence = $$.loadPlugin("DefaultPersistence");
    if(persistence){
        await persistence.shutDown();
    }
})
async function createStandardPersistencePlugin(){
    let persistence = await persistoModule.initialisePersisto();

    await persistence.configureTypes({
        workspace: {
            id: "singleton workspace",
            spaceGlobalId: "string",
            name: "string",
            documents: "array document",
            clock : "integer",
            permissions: "any"
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
            documentId: "string",
            commands: "string",
            comments: "string",
            paragraphs: "array paragraph",
            lastChangeClock: "integer"
        },
        document: {
            id: "random",
            title: "string",
            docId: "string",
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
            varId: "string",
            varName: "string",
            value: "any",
            _parsedCommand: "string",
            documentId: "string",
            chapterId: "string",
            paragraphId: "string",
            clock: "integer"
        },
        graph:{
            id: "singleton GRAPH",
            alias: "string",
            state: "any"
        }
    });

    await persistence.createIndex("workspace", "spaceGlobalId");
    await persistence.createIndex("user", "email");

    await persistence.createIndex("variable", "varId");
    await persistence.createIndex("document", "docId");

    await persistence.createGrouping("documents", "document", "category");
    await persistence.createGrouping("snapshots", "snapshot", "document");

    await persistence.createGrouping("variables", "variable", "docId");

    await persistence.createIndex("graph", "alias");

    try{
        console.debug("Checking if GRAPH exists!");
        if(! await persistence.hasGraph("GRAPH")){
            console.debug("Creating graph");
            await persistence.createGraph({alias: "GRAPH", state: {}});
        } else{
            console.debug("GRAPH already exists!");
        }
    } catch (err){
        await $$.throwError("Could not create graph", err);
    }

    return persistence;
}

let singleton = null;

export async function getInstance() {
    if (!singleton) {
        singleton = await createStandardPersistencePlugin();
    }
    return singleton;
}

export function getAllow() {
    return async function(globalUserId, email, command, ...args) {
        return true;
    };
}

export function getDependencies() {
    return [];
}