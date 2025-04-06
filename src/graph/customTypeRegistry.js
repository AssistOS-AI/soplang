const varUtil = require("./varUtil");
const {} = require("./varUtil");
const customTypes = {};

const registerType = (name, typeDefinition) => {
    if (typeof customTypes[name] !== "undefined") {
        throw Error(`Type ${name} already registered`);
    }

    customTypes[name] = typeDefinition;
}

const restoreInstance = async (name, JSONSerialisation) => {
    if (typeof customTypes[name] === "undefined") {
        throw Error(`Type ${name} not registered`);
    }
    let instance = new customTypes[name];
    await instance.restore(JSONSerialisation);
    instance.customType = name;
    return instance;
}

const newInstance = async (name, ...args) => {
    if (typeof customTypes[name] === "undefined") {
        throw Error(`Type ${name} not registered`);
    }
    let instance = new customTypes[name];
    await instance.init(...args);
    instance.customType = name;
    return instance;
}

$$.registerCustomType = registerType;

module.exports = {
    registerType,
    restoreInstance,
    newInstance
}