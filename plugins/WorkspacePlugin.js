let {createVarsGraph} = require("../src/graph/VarsGraph.js");
let {createRegistry} = require("../src/graph/CommandsRegistry.js");
const customTypeRegistry = require("../src/graph/customTypeRegistry.js");


let errorFromLastBuild = [];
let infoFromLastBuild = [];
$$.recordBuildError = function (text, err) {
    console.debug("Recording build error", text, err);
    errorFromLastBuild.push({
        text: text,
        err: err
    });
}

$$.recordBuildInfo = function (text) {
    console.debug("Recording build info:", text);
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
    let graph = createVarsGraph(commandsRegistry, persistence);

    self.getGraph = function(){
        return graph;
    }

    self.buildAll = async function () {
        errorFromLastBuild = [];
        graph.topologicalSort();
        return await graph.buildAll();
    }

    self.getVarValue = async function (documentId, variableName) {
        return await graph.getVarValue(documentId, variableName);
    }

    self.setVarValue = async function (documentId, variableName, value) {
        return await graph.setVarValue(documentId, variableName, value);
    }

    self.registerCommand = function (commandName, commandFunction) {
        commandsRegistry.addCommand(commandName, commandFunction);
    }

    self.runScript = async function (script, ...args) {
        return await graph.runScript(script, ...args);
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
    getDependencies: function(){
        return ["DefaultPersistence"];
    }
}