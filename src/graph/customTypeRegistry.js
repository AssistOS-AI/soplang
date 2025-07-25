const customTypes = {};

import {getVarID} from "./varUtil.js";

import {getCache} from "./varsValuesCache.js";
let customTypesValuesCache = getCache("customTypesValuesCache");

const registerType = (name, typeDefinition) => {
    if (typeof customTypes[name] !== "undefined") {
        throw Error(`Type ${name} already registered`);
    }

    customTypes[name] = typeDefinition;
}

const restoreInstance = async (currentDocId, typeName, outputVarName, JSONSerialisation) => {
    if (typeof customTypes[typeName] === "undefined") {
        throw Error(`Type ${typeName} not registered`);
    }
    let outputVarId = getVarID(currentDocId, outputVarName);
    if(customTypesValuesCache.has(outputVarId)){
        return customTypesValuesCache.get(outputVarId);
    }

    if(!JSONSerialisation){
        return undefined;
    }

    let instance = new customTypes[typeName](currentDocId, outputVarName);
    customTypesValuesCache.set(outputVarId, instance);

    try{
        await instance.restore(JSONSerialisation);
        $$.debug("objectLifeCycle", `restoreInstance instance of type ${typeName} with output variable ${outputVarName}`);
    }
    catch(e){
        $$.debug("objectLifeCycle", `Exception restoring instance of type '${typeName}' with output variable '${outputVarName}': '${e}'`);
        throw Error(`Exception restoring instance of type ${typeName} with output variable ${outputVarName}: ${e.message}`);
    }
    instance.__type = typeName;
    return instance;
}

$$.restoreCustomTypeInstance = async function(typeName, JSONSerialisation){
    if(!JSONSerialisation){
        return undefined;
    }
    let instance = new customTypes[typeName]("unknown", "unknown");
    try{
        $$.debug("objectLifeCycle", `$$.restoreCustomTypeInstance instance of type ${typeName}`);
        await instance.restore(JSONSerialisation);
    }
    catch(e){
        $$.recordBuildError(`Exception restoring instance of type ${typeName} : ${e.message}`);
    }
};

const newInstance = async (currentDocId,  typeName, outputVarName, ...args) => {
    if (typeof customTypes[typeName] === "undefined") {
        throw Error(`Type ${typeName} not registered`);
    }
    let instance = new customTypes[typeName](currentDocId, outputVarName);
    await instance.init(...args);
    let outputVarId = getVarID(currentDocId, outputVarName);
    customTypesValuesCache.set(outputVarId, instance);
    instance.__type = typeName;
    instance.__initialArgs = args;
    $$.debug("objectLifeCycle", `Creating new instance of type ${typeName} with output variable ${outputVarName}`);
    return instance;
}

const lookupInstance = async (currentDocId,  typeName, outputVarName, primaryKey, ...args) => {
    if (typeof customTypes[typeName] === "undefined") {
        $$.recordBuildError(`Type ${typeName} not registered! The output variable will remain undefined!`);
        return undefined;
    }
    let outputVarId = getVarID(currentDocId, outputVarName);
    if (customTypesValuesCache.has(outputVarId)) {
        return customTypesValuesCache.get(outputVarId);
    }

    let instance = new customTypes[typeName](currentDocId, outputVarName);
    customTypesValuesCache.set(outputVarId, instance);

    try{
        $$.debug("objectLifeCycle", `Lookup  instance of type ${typeName} with output variable ${outputVarName}`);
        await instance.lookup(primaryKey, ...args);
    } catch(e){
        console.debug(`Error looking up instance of type ${typeName} with primary key ${primaryKey}: ${e.message}`);
        return undefined;
    }
    instance.__type = typeName;
    console.debug(`>>>>>>>>>>>> Found instance of type ${typeName} with primary key ${primaryKey}`);
    return instance;
}
const getTypes = () => {
    return ["Document", "Table", "Agent", "Set"]
}

$$.registerCustomType = registerType;




export {
    registerType,
    restoreInstance,
    newInstance,
    lookupInstance,
    getTypes
}