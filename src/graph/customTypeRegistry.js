//const varUtil = await import("./varUtil.js");
const {} = import("./varUtil.js");
const customTypes = {};

const registerType = (name, typeDefinition) => {
    if (typeof customTypes[name] !== "undefined") {
        throw Error(`Type ${name} already registered`);
    }

    customTypes[name] = typeDefinition;
}

const restoreInstance = async (currentDocId, name, JSONSerialisation) => {
    if (typeof customTypes[name] === "undefined") {
        throw Error(`Type ${name} not registered`);
    }
    if(!JSONSerialisation){
        return undefined;
    }
    let instance = new customTypes[name](currentDocId);
    try{
        await instance.restore(JSONSerialisation);
    }
    catch(e){
        return undefined;
    }
    instance.__type = name;
    return instance;
}

const newInstance = async (currentDocId,  typeName, ...args) => {
    if (typeof customTypes[typeName] === "undefined") {
        throw Error(`Type ${typeName} not registered`);
    }
    let instance = new customTypes[typeName](currentDocId);
    await instance.init(...args);
    instance.__type = typeName;
    instance.__initialArgs = args;
    return instance;
}

const lookupInstance = async (currentDocId,  typeName, primaryKey, ...args) => {
    if (typeof customTypes[typeName] === "undefined") {
        $$.recordBuildError(`Type ${typeName} not registered! The output variable will remain undefined!`);
        return undefined;
    }
    let instance = new customTypes[typeName](currentDocId);
    try{
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
    return Object.keys(customTypes);
}

$$.registerCustomType = registerType;

export {
    registerType,
    restoreInstance,
    newInstance,
    lookupInstance,
    getTypes
}