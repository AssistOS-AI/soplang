const varUtil = require("./varUtil");
const {setNewValue} = require("./varUtil");
const customTypes = {};

const registerType = (name, typeDefinition) => {
    if (typeof customTypes[name] !== "undefined") {
        throw Error(`Type ${name} already registered`);
    }

    customTypes[name] = typeDefinition;
}

const createInstance = (name, ...args) => {
    if (typeof customTypes[name] === "undefined") {
        throw Error(`Type ${name} not registered`);
    }

    return new customTypes[name](...args);
}

const serializeInstance = (name, obj) => {
    if (typeof customTypes[name] === "undefined") {
        throw Error(`Type ${name} not registered`);
    }

    return customTypes[name].serialize(obj);
}

const deserializeInstance = (name, value) => {
    if (typeof customTypes[name] === "undefined") {
        throw Error(`Type ${name} not registered`);
    }

    return customTypes[name].deserialize(value);
}

const deleteInstance = (name, obj) => {
    if (typeof customTypes[name] === "undefined") {
        throw Error(`Type ${name} not registered`);
    }

    return customTypes[name].delete(obj);
}

function AliasObject(docId, varId) {
    this.docId = docId;
    this.varId = varId;

    this.commands = {}
    this.serialize = function (obj) {
        return JSON.stringify(obj);
    }
    this.deserialize = function (valueFromVariable) {
        let parsed = JSON.parse(valueFromVariable);
        return new AliasObject(parsed.docId, parsed.varId);
    }

    this.getInnerValue = function (obj, workspace) {
        return workspace.getVarValue(obj.docId, obj.varId);
    }
    this.setInnerValue = function (obj, newValue, workspace) {
        // nothing to do here
    }
    this.getDependencies = function (obj, workspace) {
        const varUtil = require("./varUtil");
        return [varUtil.getVarID(obj.docId, obj.varId)];
    }
    this.delete = function () {
    }
}

const chainAlias = async function (inputValues, outputValues, currentDocId, workspace) {
    return new ChainAliasObject(inputValues[0] + "." + inputValues[1], currentDocId);
}

function ChainAliasObject(chain, docId) {
    let objId;
    let objPath;
    if (typeof chain === "string") {
        this.chain = chain;
        const splitChain = chain.split(".");
        objId = splitChain[0];
        objPath = splitChain[1];
    }

    const commands = {
        chainAlias: chainAlias
    }

    this.getCommands = function () {
        return commands;
    }

    this.serialize = async function (obj) {
        return JSON.stringify(obj);
    }

    this.deserialize = async function (valueFromVariable) {
        let parsed = JSON.parse(valueFromVariable);
        return new ChainAliasObject(parsed.chain);
    }

    this.getInnerValue = async function () {
        let obj = await varUtil.getVarValue(varUtil.getVarID(docId, objId));
        if (!obj) {
            return undefined;
        }
        return obj[objPath];
    }

    this.setInnerValue = async function (obj, newValue) {
        obj[objPath] = newValue;
        await varUtil.setNewValue(varUtil.getVarID(docId, objId), obj);
    }

    this.getDependencies = function (obj, workspace) {
        const varUtil = require("./varUtil");
        let deps = [];
        if (obj.chain && Array.isArray(obj.chain)) {
            for (let link of obj.chain) {
                deps.push(varUtil.getVarID(link.docId, link.varId));
            }
        }
        return deps;
    }

    this.delete = async function () {
        // Clean up if needed
    }
}
registerType("alias", AliasObject);
registerType("chainAlias", ChainAliasObject);

module.exports = {
    registerType,
    createInstance,
    serializeInstance,
    deserializeInstance,
    deleteInstance
}