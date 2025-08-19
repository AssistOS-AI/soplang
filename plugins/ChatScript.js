async function ChatScript() {
    const self = {};

    const persistence = $$.loadPlugin("DefaultPersistence");

    await persistence.configureTypes({
        chatScript: {
            name: "string",
            code: "string",
            description: "string",
            widgets: "array",
            role: "string"
        },
    })

    await persistence.createIndex("chatScript", "name");
    await persistence.createGrouping("chatScripts", "chatScript", "role");

    self.getChatScripts = async function () {
        return await persistence.getEveryChatScriptObject();
    }

    self.getChatScriptNamesByRole = async function () {
        return await persistence.getEveryChatScriptName();
        // let scripts = await persistence.getChatScriptsByRole(role);
        // return scripts.map(script => script.name);
    }
    self.getChatScript = async function (scriptId) {
        return await persistence.getChatScript(scriptId);
    }
    self.createChatScript = async function (name, code, description, widgets, role) {
        return await persistence.createChatScript({name, code, description, widgets, role});
    }
    self.updateChatScript = async function (scriptId, chatScript) {
        return await persistence.updateChatScript(scriptId, chatScript);
    }
    self.updateChatScriptName = async function (scriptId, name) {
        return await persistence.setNameForChatScript(scriptId, name);
    }
    self.deleteChatScript = async function (scriptId) {
        return await persistence.deleteChatScript(scriptId);
    }
    self.getDefaultChatScript = async function () {
        const script = await persistence.getChatScript("DefaultChatScript");
        return script.id;
    }
    return self;
}

let singletonInstance;

const getInstance = async function () {

    if (!singletonInstance) {
        singletonInstance = await ChatScript();
    }
    return singletonInstance;
}
const getAllow = function () {
    return async function (globalUserId, email, command, ...args) {
        return true;
    }
}
const getDependencies = function () {
    return ["DefaultPersistence"];
}
export {
    getInstance,
    getAllow,
    getDependencies
}