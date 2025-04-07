import {
    parseCommandLine,
    parseTextVars,
    parseCommandBlock,
    renameSpecialVars,
    makeNameForSpecialVars,
    parseComplexLine } from "../util/soplangUtil.js";

let customTypeRegistry = await import("./customTypeRegistry.js");

let defaultPersistence = $$.loadPlugin("DefaultPersistence");

function getVarID(docId, varName){
    return docId + "." + varName;
}

async function getVariable(varId){
    return await defaultPersistence.getVariable(varId);
}
async function getVarValue(varId){
    let varDef = await getVariable(varId);
    if(!varDef){
        $$.recordBuildError(`Variable ${varId} not found`);
        return undefined;
    }
    //console.debug(">>>Getting value of variable", varId, "with command", varDef.parsedCommand.command, "and is custom type", varDef.customType);
    if(varDef.customType){
        return customTypeRegistry.restoreInstance(varDef.customType, varDef.value);
    }
    if(typeof varDef.value === "object" && typeof varDef.value.customType === "string"){
        return customTypeRegistry.restoreInstance(varDef.value.customType, varDef.value);
    }
    return varDef.value;
}

async function setVarValue(varId, newValue, force = false){
    function serialiseValue(newValue){
        let typeOfValue = typeof newValue;
        switch(typeOfValue){
            case "string":
            case "number":
            case "boolean":
            case "undefined":
            case "bigint":
                return newValue;
            case "object":
                if(Array.isArray(newValue)){
                    let serializedArray = [];
                    for(let i = 0; i < newValue.length; i++){
                        serializedArray.push(serialiseValue(newValue[i]));
                    }
                    return serializedArray;
                } else {
                    let serializedObject = {};
                    for(let key in newValue){
                        if(typeof newValue[key] === "function"){
                            continue;
                        }
                        serializedObject[key] = serialiseValue(newValue[key]);
                    }
                    return serializedObject;
                }
            default:
                $$.throwError("Cannot set value of variable", varId, "with type", typeOfValue);
        }
    }

    let varDef = await getVariable(varId);
    let varValue = await getVarValue(varId);

    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }

    if(varDef.parsedCommand.command === "alias" && !force){
        //TODO: investigate if writing to an alias is a good idea, currently  it is ignoring the request, and the value of the alias is not updated
        await defaultPersistence.updateVariable(varId, {value: undefined, clock: defaultPersistence.getLogicalTimestamp()});
    }

    if(varDef.parsedCommand.command === "chainAlias"){
        let targetVarId = varDef.parsedCommand.inputVars[2];
        let obj = await defaultPersistence.getVariable(targetVarId);
        if(!obj){
            await $$.throwError(`Variable ${targetVarId} not found!`);
        }
        obj[varDef.parsedCommand.inputVars[1]] = newValue;
        await defaultPersistence.updateVariable(targetVarId, {value: serialiseValue(obj), clock: defaultPersistence.getLogicalTimestamp()});
        return await defaultPersistence.updateVariable(varDef.varId, {value: undefined, clock: defaultPersistence.getLogicalTimestamp()});
    }

    if(varDef.parsedCommand.command === "table"){
        //TODO: make tables as typed objects! (@daniel)
        newValue = {tableHeader: varDef.parsedCommand.inputVars, tableData:newValue};
    }

    await defaultPersistence.updateVariable(varId, {value: serialiseValue(newValue), clock: defaultPersistence.getLogicalTimestamp()});
}
async function getDependencies(varId){
    let deps = [];
    let varDef = await getVariable(varId);
    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }
    if(!varDef.parsedCommand){
        return deps;
    }

    //if parsed command has an 'obj.methodName' form, get the obj and add in the dependencies
    let hasCustomTypeCommand = varDef.parsedCommand.command.includes(".");
    if(hasCustomTypeCommand){
        let splitCommand = varDef.parsedCommand.command.split(".");
        let objName = splitCommand[0];
        let objVarId = getVarID(varDef.docId, objName);
        deps.push(objVarId);
    }

    if(varDef.parsedCommand.command ===  "alias"){
        deps.push( getVarID(varDef.parsedCommand.inputVars[0], varDef.parsedCommand.inputVars[1]));
    } else if(varDef.parsedCommand.inputVars.length > 0){
        for(let i = 0; i < varDef.parsedCommand.inputVars.length; i++){
            let inputVar = varDef.parsedCommand.inputVars[i];
            const varType = varDef.parsedCommand.varTypes[i];
            if(varType === "alias"){
                deps.push(inputVar);
            }
            if(varType === "var"){
                deps.push(inputVar);
            }
            if(inputVar[0] === "~"){
                deps.push(getVarID(varDef.docId, inputVar.slice(1)));
            }
        }
    }
    return deps;
}

async function updateVarDefinition(_varName, _docId, _chapterId, _paragraphId, _parsedCommand) {
    if (!_docId) {
        throw new Error("Document ID is required");
    }
    let existingVarContext = {};
    let varId = getVarID(_docId, _varName);

    if(!await defaultPersistence.hasVariable(varId)){
        let obj = await defaultPersistence.createVariable({varId: varId});
        await defaultPersistence.setVarIdForVariable(obj.id, varId);
    }

    function diffObjects(existing, updated){
        for(let key in updated){
            if(existing[key] !== updated[key]){
                return true;
            }
        }
        return false;
    }

    let varContext = {};
    varContext.varId = varId;
    varContext.varName = _varName;
    varContext.docId = _docId;
    varContext.chapterId = _chapterId;
    varContext.paragraphId = _paragraphId;
    varContext.parsedCommand = _parsedCommand;
    if (_parsedCommand.command === "new" || _parsedCommand.command === "lookup") {
        varContext.customType = _parsedCommand.inputVars[0];
    }

    if(diffObjects(existingVarContext, varContext)){
        //console.debug(">>>Updating variable", _varName, "in", _docId, "with command", _parsedCommand.command, "and input vars", _parsedCommand.inputVars , "and var types", _parsedCommand.varTypes);
        varContext.clock = undefined;
    } else {
        return false; //nothing changed
    }


    if(_parsedCommand.outputVars.length > 1){
        $$.throwErrorSync("Command", _parsedCommand.command, "has more than one output variable. This is not supported!");
    }

    if(_parsedCommand.outputVars[0] !== _varName){
        console.debug("Dump varContext", varContext);
        $$.throwErrorSync("Output variable '"+ _parsedCommand.outputVars[0]+ "' which is different from expected name '"+ _varName + "'");
    }

    if(varContext.parsedCommand){
        varContext.parsedCommand.inputVars = varContext.parsedCommand.inputVars ? Array.from(varContext.parsedCommand.inputVars) : [];
        for(let i = 0; i < varContext.parsedCommand.inputVars.length; i++){
            let inputVar = varContext.parsedCommand.inputVars[i];
            if(varContext.parsedCommand.varTypes[i] === "var"){
                varContext.parsedCommand.inputVars[i] = getVarID(_docId, inputVar);
            }
        }
    }

    await defaultPersistence.updateVariable(varContext.varId, varContext);
    return true; //changed
}

async function getVarClock(varId){
    let varDef = await getVariable(varId);
    if(!varDef){
        console.debug("Variable", varId, "not found");
        return undefined;
    }
    return varDef.clock;
}

export {
    getVarID,
    getVariable,
    getVarValue,
    getVarClock,
    setVarValue,
    getDependencies,
    updateVarDefinition,
    parseCommandBlock,
    renameSpecialVars,
    makeNameForSpecialVars,
    parseComplexLine,
    parseCommandLine,
    parseTextVars
}