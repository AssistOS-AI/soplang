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

     this.getCommands = function () {
        return {
        }
     }

    this.getRuntimeValue = async function (workspace) {
        return workspace.getVarValue(this.docId, this.varId);
    }
    this.setRuntimeValue = async function (obj, newValue, workspace) {
         await $$.throwError("Cannot set value of alias. Change the original variable instead");
    }
    this.getDependencies = function (obj, workspace) {
        const varUtil = require("./varUtil");
        return [varUtil.getVarID(obj.docId, obj.varId)];
    }
    this.delete = function () {
    }
}

const chainAlias = async function (inputValues, outputValues, currentDocId, workspace) {
    return new ChainAliasObject(currentDocId, inputValues[0] + "." + inputValues[1] );
}

function ChainAliasObject(docId, chain) {
    let self = this;
    let targetObjectId = undefined;
    if (typeof chain === "string") {
        this.chain = chain;
        const splitChain = chain.split(".");
        this.objId = splitChain[0];
        this.objPath = splitChain[1];
    }

    this.getCommands = function () {
        return {
            chainAlias
        };
    }

    this.getRuntimeValue = async function () {
        let targetVarId = varUtil.getVarID(docId, this.objId);
        let obj = await varUtil.getVarValue(targetVarId);
        if (!obj) {
            return undefined;
        }
        return obj[this.objPath];
    }

    this.setRuntimeValue = async function (newValue) {
        let targetVarId = varUtil.getVarID(docId, this.objId);
        let obj = await varUtil.getVarValue(targetVarId);
        obj[this.objPath] = newValue;
        await varUtil.setNewValue(targetVarId, obj);
    }

    this.getDependencies = function (obj, workspace) {
        const varUtil = require("./varUtil");
        let targetVarId = varUtil.getVarID(docId, this.objId);
        return [targetVarId];
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