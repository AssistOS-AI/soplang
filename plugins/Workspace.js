import {createVarsGraph} from "../src/graph/VarsGraph.js";
import {createRegistry} from "../src/graph/CommandsRegistry.js";
import '../src/util/debugUtil.js';
import {promises as fsPromises} from "fs";
import path from "path";

const ROLES = {
    ADMIN: "admin",
    MEMBER: "member",
    GUEST: "guest",
}

const customTypeRegistry = await import("../src/graph/customTypeRegistry.js");


async function Workspace() {
    let self = {};
    let persistence = $$.loadPlugin("DefaultPersistence");
    let Email = $$.loadPlugin("EmailPlugin");
    let WorkspaceUser = $$.loadPlugin("WorkspaceUser");

    let commandsRegistry = await createRegistry(self);
    let graph = await createVarsGraph(commandsRegistry);

    self.getGraph = function () {
        return graph;
    }

    self.buildAll = async function () {
        return await graph.buildAll();
    }

    self.buildOnlyForDocument = async function (docId) {
        return await graph.buildOnlyForDocument(docId);
    }

    self.getBuildErrors = function () {
        throw new Error("Not implemented");
    }

    self.getVarValue = async function (documentId, variableName) {
        return await graph.getVarValue(documentId, variableName);
    }
    self.getVariablesForDoc = async function (docId) {
        let variables = await persistence.getVariablesObjectsByDocId(docId);
        for (let variable of variables) {
            variable.value = await graph.getVarValue(docId, variable.varName);
        }
        return variables;
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
    self.getCustomTypes = async function () {
        return customTypeRegistry.getTypes();
    }
    self.getCommands = async function () {
        return graph.getCommands();
    }
    self.getDocCommandsParsed = async function (docId) {
        return await graph.getDocCommandsParsed(docId);
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
            name: workspaceName,
            ownerId: ownerId,
            spaceGlobalId: spaceGlobalId,
            documents: [],
            clock: 0
        });
    }
    self.setCurrentChatId = async function (spaceId, chatId) {
        let spaceStatus = await persistence.getWorkspace(spaceId);
        spaceStatus.currentChatId = chatId;
        await persistence.updateWorkspace(spaceId, spaceStatus);
    }

    self.getCollaborators = async function () {
        return await WorkspaceUser.getAllUsers();
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
            if (process.env.NODE_ENV === 'development') {
                continue;
            }
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
        if (user === ROLES.ADMIN) {
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
        if (user === ROLES.ADMIN) {
            let owners = self.getOwnersCount(allUsers);
            if (owners === 1 && role !== ROLES.ADMIN) {
                return "Can't change the role of the last owner of the space";
            }
        }
        user.role = role;
        await WorkspaceUser.updateUser(user.id, user.email, user.displayName, role);
    }
    self.getOwnersCount = function (users) {
        let owners = 0;
        for (let id in users) {
            if (users[id].role === ROLES.ADMIN) {
                owners++;
            }
        }
        return owners;
    }

    self.getWorkspace = async function (globalId) {
        return await persistence.getWorkspace(globalId);
    }
    self.getWorkspaceInfo = async function (globalId) {
        let workspace = await persistence.getWorkspace(globalId);
        let users = await self.getCollaborators();
        let documents = await persistence.getEveryDocument();
        return {
            id: workspace.id,
            spaceGlobalId: workspace.spaceGlobalId,
            name: workspace.name,
            documents: documents,
            clock: workspace.clock,
            users: users,
        };
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
        singletonInstance = await Workspace();
    }
    return singletonInstance;
}

export function getAllow() {
    return async function (globalUserId, email, command, ...args) {
        return true;
    };
}

export function getDependencies() {
    return ["DefaultPersistence", "EmailPlugin", "WorkspaceUser", "ChatScript"];
}