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

async function Workspace() {
    let self = {};
    let persistence = await $$.loadPlugin("DefaultPersistence");
    let Email = await $$.loadPlugin("Email");
    let WorkspaceUser = await $$.loadPlugin("WorkspaceUser");

    persistence.configureTypes({
        spaceStatus: {
            name: "string"
        }
    });

    await persistence.createIndex("spaceStatus", "name");

    let commandsRegistry = await createRegistry(self);
    let graph = await createVarsGraph(commandsRegistry, persistence);

    self.listAllSpaces = async function(){
        return await persistence.getEverySpaceStatus();
    }

    self.createSpace = async function(spaceName){
        let spaceData = {
            name: spaceName
        }
        return await persistence.createSpaceStatus(spaceData);
    }

    self.deleteSpace = async function (email, authKey, spaceId) {
        // let userFile = await user.loadUser(email, authKey);
        // let spacesNr = Object.keys(userFile.spaces).length;
        // if (spacesNr === 1) {
        //     return "You can't delete your last space";
        // }
        // let spaceStatus = await getSpaceStatusObject(spaceId);
        // if (!spaceStatus.admins[email]) {
        //     return "You dont have permission to delete this space";
        // }
        // //unlink space from all users
        // for (let userId of Object.keys(spaceStatus.users)) {
        //     await user.unlinkSpaceFromUser(email, authKey, spaceId);
        // }
        // //delete space folder
        // let spacePath = getSpacePath(spaceId);
        // await fsPromises.rm(spacePath, {recursive: true, force: true});
        // //delete documents
        // let documentsList = await documentService.getDocuments(spaceId);
        // for (let document of documentsList) {
        //     await documentService.deleteDocument(spaceId, document.id);
        // }
        // //delete api keys
        // let keys = await secrets.getAPIKeys(spaceId);
        // for (let keyType in keys) {
        //     await secrets.deleteSpaceKey(spaceId, keyType);
        // }
    }

    self.getSpaceStatus = async function(spaceId){
        let spaceExists = await persistence.hasSpaceStatus(spaceId);
        if(spaceExists){
            return await persistence.getSpaceStatus(spaceId);
        }
    }

    self.getDefaultSpaceAgentId = async function (spaceId) {
        let spaceStatus = await persistence.getSpaceStatus(spaceId);
        return spaceStatus.defaultAgent;
    }
    self.getSpaceStatus = async function (spaceId) {
        return await persistence.getSpaceStatus(spaceId);
    }
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
    self.linkSpaceToUser = async function (email, spaceId) {
        let UserLogin = await $$.loadPlugin("UserLogin");

        let result = await UserLogin.getUserInfo(email);
        let userInfo = result.userInfo;
        userInfo.currentSpaceId = spaceId;
        if(!userInfo.spaces){
            userInfo.spaces = [];
        }
        if(userInfo.spaces.includes(spaceId)){
            console.log(`User ${email} is already linked to space ${spaceId}`);
            return;
        }
        userInfo.spaces.push(spaceId);
        await UserLogin.setUserInfo(email, userInfo);
    }
    self.addSpaceToUsers = async function(userEmails, spaceId){
        let UserLogin = await $$.loadPlugin("UserLogin");

        for(let email of userEmails){
            let result = await UserLogin.getUserInfo(email);
            if(result.status === "success"){
                if(!result.userInfo.spaces.includes(spaceId)){
                    result.userInfo.spaces.push(spaceId);
                }
                await UserLogin.setUserInfo(email, result.userInfo);
            } else {
                throw new Error(result.reason);
            }
        }
    }
    self.unlinkSpaceFromUser = async function (email, spaceId) {
        let UserLogin = await $$.loadPlugin("UserLogin");

        let result = await UserLogin.getUserInfo(email);
        let userInfo = result.userInfo;
        userInfo.spaces = userInfo.spaces.filter(id => id !== spaceId);
        if (userInfo.currentSpaceId === spaceId) {
            userInfo.currentSpaceId = userInfo.spaces.length > 0 ? userInfo.spaces[0] : null;
        }
        await UserLogin.setUserInfo(email, userInfo);
    }
    self.getDefaultSpaceId = async function(email) {
        let UserLogin = await $$.loadPlugin("UserLogin");

        let result = await UserLogin.getUserInfo(email);
        return result.userInfo.currentSpaceId;
    }
    self.setUserCurrentSpace = async function (email, spaceId) {
        let UserLogin = await $$.loadPlugin("UserLogin");

        let result = await UserLogin.getUserInfo(email);
        result.userInfo.currentSpaceId = spaceId;
        await UserLogin.setUserInfo(email, result.userInfo);
    }
    self.listUserSpaces = async function(email) {
        let UserLogin = await $$.loadPlugin("UserLogin");
        let result = await UserLogin.getUserInfo(email);
        let userInfo = result.userInfo;
        let spaces = [];
        if(userInfo.spaces){
            for(let spaceId of userInfo.spaces){
                let space = await persistence.getSpaceStatus(spaceId);
                spaces.push({id: spaceId, name: space.name});
            }
        }
        return spaces;
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
    return ["DefaultPersistence", "Email", "WorkspaceUser"];
}