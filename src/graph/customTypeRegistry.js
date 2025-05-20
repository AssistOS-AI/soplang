
const {} = import("./varUtil.js");
const {} = import("./SOPEncoding.js")
const customTypes = {};

import {getCache} from "./varsValuesCache.js";
let customTypesValuesCache = getCache("customTypesValuesCache");

const registerType = (name, typeDefinition) => {
    if (typeof customTypes[name] !== "undefined") {
        throw Error(`Type ${name} already registered`);
    }

    customTypes[name] = typeDefinition;
}

const restoreInstance = async (currentDocId, typeName, outputVarID, JSONSerialisation) => {
    if (typeof customTypes[typeName] === "undefined") {
        throw Error(`Type ${typeName} not registered`);
    }

    if(customTypesValuesCache.has(outputVarID)){
        return customTypesValuesCache.get(outputVarID);
    }

    if(!JSONSerialisation){
        return undefined;
    }

    let instance = new customTypes[typeName](currentDocId, outputVarID);
    customTypesValuesCache.set(outputVarID, instance);

    try{
        $$.debug("objectLifeCycle", `restoreInstance instance of type ${typeName} with output variable ${outputVarID}`);
        await instance.restore(JSONSerialisation);
    }
    catch(e){
        throw Error(`Exception restoring instance of type ${typeName} with output variable ${outputVarID}: ${e.message}`);
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

const newInstance = async (currentDocId,  typeName, outputVarID, ...args) => {
    if (typeof customTypes[typeName] === "undefined") {
        throw Error(`Type ${typeName} not registered`);
    }
    let instance = new customTypes[typeName](currentDocId, outputVarID);
    $$.debug("objectLifeCycle", `Creating new instance of type ${typeName} with output variable ${outputVarID}`);
    await instance.init(...args);
    customTypesValuesCache.set(outputVarID, instance);
    instance.__type = typeName;
    instance.__initialArgs = args;
    return instance;
}

const lookupInstance = async (currentDocId,  typeName, outputVarID, primaryKey, ...args) => {
    if (typeof customTypes[typeName] === "undefined") {
        $$.recordBuildError(`Type ${typeName} not registered! The output variable will remain undefined!`);
        return undefined;
    }

    if (customTypesValuesCache.has(outputVarID)) {
        return customTypesValuesCache.get(outputVarID);
    }

    let instance = new customTypes[typeName](currentDocId, outputVarID);
    customTypesValuesCache.set(outputVarID, instance);

    try{
        $$.debug("objectLifeCycle", `Lookup  instance of type ${typeName} with output variable ${outputVarID}`);
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