import {createVarsGraph} from "../src/graph/VarsGraph.js";
import {createRegistry} from "../src/graph/CommandsRegistry.js";
const customTypeRegistry = await import("../src/graph/customTypeRegistry.js");


let errorFromLastBuild = [];
let infoFromLastBuild = [];
$$.recordBuildError = function (text, err) {
    console.warn("WARNING: Recording build error", text);
    if(!err){
        err = new Error(text);
    }
    errorFromLastBuild.push({
        text: text,
        err: err
    });
}

$$.recordBuildInfo = function (text) {
    console.debug("INFO:Recording build info:", text);
    infoFromLastBuild.push(text);
}

$$.dumpObject = function (obj) {
    let res = "{";
    for(let key in obj){
        if(typeof obj[key] === "function"){
            continue;
        }
        res += key + ": " + obj[key] + ", ";
    }
    res += `type: ${obj?.constructor?.name || typeof obj}`;
    res += "}";
    return res;
}

async function WorkspacePlugin(){
    let self = {};
    let persistence = await $$.loadPlugin("DefaultPersistence");

    let commandsRegistry = await createRegistry(self);
    let graph = await createVarsGraph(commandsRegistry, persistence);

    self.getGraph = function(){
        return graph;
    }
    self.getErrorFromLastBuild = function(){
        return errorFromLastBuild;
    }
    self.buildAll = async function () {
        errorFromLastBuild = [];
        return await graph.buildAll();
    }

    self.getVarValue = async function (documentId, variableName) {
        return await graph.getVarValue(documentId, variableName);
    }
    self.getEveryVariableObject = async function () {
        return await persistence.getEveryVariableObject();
    }
    self.setVarValue = async function (documentId, variableName, value) {
        return await graph.setVarValue(documentId, variableName, value);
    }

    self.registerCommand = function (commandName, commandFunction) {
        commandsRegistry.addCommand(commandName, commandFunction);
    }

    self.runMacro = async function (docId, scriptName, ...args) {
        return await graph.runMacro(docId, scriptName, ...args);
    }

    self.runCode = async function (code, ...args) {
        return await graph.runCode(code, ...args);
    }

    self.insertCode = async function (docId, code) {
        return await graph.insertCode(docId, code);
    }

    self.createWorkspace = async function (workspaceName, ownerId, spaceGlobalId) {
        return await persistence.createWorkspace({
            id: workspaceName,
            ownerId: ownerId,
            spaceGlobalId: spaceGlobalId,
            documents: [],
            clock: 0
        });
    }

    self.getWorkspace = async function (globalId) {
        return await persistence.getWorkspace(globalId);
    }

    self.defineCustomType = function (typeName, typeDefinition) {
        customTypeRegistry.registerType(typeName, typeDefinition);
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

export async function getInstance() {
    if (!singletonInstance) {
        singletonInstance = await WorkspacePlugin();
    }
    return singletonInstance;
}

export function getAllow() {
    return async function(globalUserId, email, command, ...args) {
        return true;
    };
}

export function getDependencies() {
    return ["DefaultPersistence"];
}