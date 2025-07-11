async function ChatScript() {
    const self = {};

    const persistence = await $$.loadPlugin("DefaultPersistence");

    await persistence.configureTypes({
        chatScript: {
            name: "string",
            code: "string",
            description: "string"
        },
    })

    await persistence.createIndex("chatScript", "name");

    self.getChatScripts= async function () {
        return await persistence.getEveryChatScriptObject();
    }
    self.getChatScript = async function (scriptId) {
        return await persistence.getChatScript(scriptId);
    }
    self.createChatScript = async function (name, code, description) {
        return await persistence.createChatScript({name, code, description});
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