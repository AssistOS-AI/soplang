import {createVarsGraph} from "../src/graph/VarsGraph.js";
import {createRegistry} from "../src/graph/CommandsRegistry.js";

const ROLES = {
    OWNER: "owner",
    ADMIN: "admin",
    WRITE: "member",
    GUEST: "guest",
}

const customTypeRegistry = await import("../src/graph/customTypeRegistry.js");

let errorFromLastBuild = [];
let infoFromLastBuild = [];
$$.recordBuildError = function (text, err) {
    console.debug("WARNING: Recording build error", text);
    if (!err) {
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
    for (let key in obj) {
        if (typeof obj[key] === "function") {
            continue;
        }
        res += key + ": " + obj[key] + ", ";
    }
    if(!obj.__type){
        res += `type: ${obj?.constructor?.name || typeof obj}`;
    }
    res += "}";
    return res;
}

async function WorkspacePlugin() {
    let self = {};
    let persistence = await $$.loadPlugin("DefaultPersistence");
    let Email = await $$.loadPlugin("Email");
    let WorkspaceUser = await $$.loadPlugin("WorkspaceUser");

    let commandsRegistry = await createRegistry(self);
    let graph = await createVarsGraph(commandsRegistry, persistence);

    self.getGraph = function () {
        return graph;
    }
    self.getErrorFromLastBuild = function () {
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
    self.getCollaborators = async function () {
        const userIds = await WorkspaceUser.getAllUsers();
        let users = [];
        for (let userId of userIds) {
            let user = await WorkspaceUser.getUser(userId);
            users.push(user);
        }
        return users;
    }
    self.addCollaborators = async function (referrerEmail, collaborators, spaceName) {
        const users = await self.getCollaborators();
        let existingUserEmails = users.map(user => user.email);
        let existingCollaborators = [];
        for (let collaborator of collaborators) {
            if (existingUserEmails.includes(collaborator.email)) {
                existingCollaborators.push(collaborator.email);
                continue;
            }
            await WorkspaceUser.createUser(collaborator.email, collaborator.email, collaborator.role);
            let subject = "You have been added to a space";
            let text = `You have been added to the space ${spaceName} by ${referrerEmail}`;
            let html = `<p>You have been added to the space ${spaceName} by ${referrerEmail}</p>`;
            await Email.sendEmail(collaborator.email, process.env.SENDGRID_SENDER_EMAIL, subject, text, html);
        }
        return existingCollaborators;
    }
    self.removeCollaborator = async function (email) {
        let allUsers = await self.getCollaborators();
        let user = await allUsers.find(user => user.email === email);
        if (user === ROLES.OWNER) {
            let owners = self.getOwnersCount(allUsers);
            if (owners === 1) {
                return "Can't delete the last owner of the space";
            }
        }
        await WorkspaceUser.deleteUser(email);
    }
    self.setCollaboratorRole = async function (email, role) {
        let allUsers = await self.getCollaborators();
        let user = await allUsers.find(user => user.email === email);
        if (user === ROLES.OWNER) {
            let owners = self.getOwnersCount(allUsers);
            if (owners === 1 && role !== ROLES.OWNER) {
                return "Can't change the role of the last owner of the space";
            }
        }
        user.role = role;
        await WorkspaceUser.updateUser(user.id, user.email, user.displayName, role);
    }
    self.getOwnersCount = function (users) {
        let owners = 0;
        for (let id in users) {
            if (users[id].role === ROLES.OWNER) {
                owners++;
            }
        }
        return owners;
    }
    self.getDefaultAgentId = async function () {
        return "Assistant";
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
    return async function (globalUserId, email, command, ...args) {
        return true;
    };
}

export function getDependencies() {
    return ["DefaultPersistence", "Email", "WorkspaceUser"];
}