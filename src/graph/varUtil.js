import {
    parseCommandLine,
    parseTextVars,
    parseCommandBlock,
    renameSpecialVars,
    makeNameForSpecialVars,
    parseComplexLine,
    decodePercentCustom} from "../util/soplangUtil.js";

let customTypeRegistry = await import("./customTypeRegistry.js");

let defaultPersistence;
function getDefaultPersistence(){
    if(!defaultPersistence){
        defaultPersistence = $$.loadPlugin("DefaultPersistence");
    }
    return defaultPersistence;
}


function getVarID(docId, varName){
    return docId + "." + varName;
}


function getDocIdFromVarId(varId){
    let splitVarId = varId.split(".");
    if(splitVarId.length === 1){
        return undefined;
    }
    if(splitVarId.length >= 2){
        return splitVarId[0];
    }
}

function getLocalVarName(docId, fullVarName){
    //reverse getVarId
    let splitVarName = fullVarName.split(".");
    if(splitVarName.length === 1){
        return getVarID(docId, fullVarName);
    }
    if(splitVarName.length === 2){
        if(splitVarName[0] === docId){
            return splitVarName[1];
        } else {
            $$.throwErrorSync("Invalid variable name", fullVarName, "for document", docId);
        }
    }
    if(splitVarName.length > 2){
        $$.throwErrorSync("Invalid variable name", fullVarName, "for document", docId);
    }
}

async function isDefined(varId){
    let persistence = await getDefaultPersistence();
    return await persistence.hasVariable(varId);
}

async function getVariable(varId){
    try{
        let persistence = await getDefaultPersistence();
        return persistence.getVariable(varId);
    } catch(err){
        return undefined;
    }
}
async function getVarValue(varId){
    let varDef = await getVariable(varId);
    if(!varDef){
        $$.recordBuildError(`Variable ${varId} not found`);
        return undefined;
    }

    if(varDef.referencedVariable) {
        //the current variable is just a proxy
        return await getVarValue(varDef.referencedVariable);
    }

    //console.debug(">>>Getting value of variable", varId, "with command", varDef.parsedCommand.command, "and is custom type", varDef.__type);
    if(varDef.__type){
        let instance = customTypeRegistry.restoreInstance(getDocIdFromVarId(varId), varDef.__type, varDef.value);
        if(!instance){
            await updateErrorInfo(varId, `Error restoring instance of type ${varDef.__type}. The value will be set to undefined`);
        }
        return instance;
    }
    return varDef.value;
}

function sameValue(oldValue, newValue){
    if(oldValue === newValue){
        return true;
    }
    if(typeof oldValue !== typeof newValue){
        return false;
    }
    if(typeof oldValue === "object"){
        if(Array.isArray(oldValue)){
            if(oldValue.length !== newValue.length){
                return false;
            }
            for(let i = 0; i < oldValue.length; i++){
                if(!sameValue(oldValue[i], newValue[i])){
                    return false;
                }
            }
            return true;
        } else {
            //compare the number of keys
            let oldKeys = Object.keys(oldValue);
            let newKeys = Object.keys(newValue);
            if(oldKeys.length !== newKeys.length){
                return false;
            }

            for(let key in oldValue){
                if(!sameValue(oldValue[key], newValue[key])){
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}



async function setVarValue(varId, newValue, options){
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
    let defaultPersistence = getDefaultPersistence();

    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }

    if(varDef.referencedVariable){
        //the only dependency is now the variable it is referencing
        return await setVarValue(varDef.referencedVariable, newValue);
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

    let serialisedNewValue = serialiseValue(newValue);
    if(sameValue(varValue, serialisedNewValue)){
        //console.debug(">>>Variable", varId, "has the same value as before. Not updating");
        return false;
    }


    let varContext = {value: serialisedNewValue, clock: defaultPersistence.getLogicalTimestamp()};
    varContext.updateTime = Date.now();
    if(options){
        if(options.duration){
            varContext.duration = options.duration;
        } else {
            varContext.duration = undefined;
        }
        if(options.errorInfo){
            varContext.errorInfo = options.errorInfo;
        } else {
            varContext.errorInfo = undefined;
        }

        if(options.warningInfo){
            varContext.warningInfo = options.warningInfo;
        } else {
            varContext.warningInfo = undefined;
        }

        if(options.debugInfo){
            varContext.debugInfo = options.debugInfo;
        } else {
            varContext.debugInfo = undefined;
        }
    }

    if(newValue !== undefined && newValue.__type !== undefined){
        varContext.__type = newValue.__type;
    }
    await defaultPersistence.updateVariable(varId, varContext);
    return true;
}

async function updateErrorInfo(varId, errorMessage){
    console.debug("ERROR: Updating error info for variable", varId, "with message", errorMessage);
    try{
        let varContext = { updateTime : Date.now(), errorInfo : errorMessage, value: undefined};
        await defaultPersistence.updateVariable(varId, varContext);
    }catch(err){
       $$.recordBuildError("Error updating error info" + varId + errorMessage, err);
    }
}
async function updateWarningInfo(varId, warningMessage){
    try{
        let varContext = {  warningInfo : warningMessage};
        await defaultPersistence.updateVariable(varId, varContext);
    }catch(err){
        $$.recordBuildError("Error updating warning info" + varId + errorMessage, err);
    }
}

async function updateDebugInfo(varId, debugMessage){
    try{
        let varContext = {  debugInfo : debugMessage};
        await defaultPersistence.updateVariable(varId, varContext);
    }catch(err){
        $$.recordBuildError("Error updating debug info" + varId + errorMessage, err);
    }
}
async function getDependencies(varId){

    let varDef = await getVariable(varId);
    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }
    let deps = [];

    if(varDef.referencedVariable) {
        //the only dependency is now the variable it is referenced
        deps = [varDef.referencedVariable];
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

    if(varDef.parsedCommand.inputVars.length > 0){
        for(let i = 0; i < varDef.parsedCommand.inputVars.length; i++){
            let inputVar = varDef.parsedCommand.inputVars[i];
            const varType = varDef.parsedCommand.varTypes[i];
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

async function markAsReferenceToVariable(varId, referencedVarId){
    let defaultPersistence = getDefaultPersistence();
    let varDef = await getVariable(varId);
    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }
    if(varDef.referencedVariable){
        if(varDef.referencedVariable === referencedVarId){
            //already has the reference
            return;
        }
        await $$.throwError("Variable already has a reference", varId, "to", varDef.referencedVariable , "and cannot be changed to", referencedVarId);
    }
    await defaultPersistence.updateVariable(varId, {referencedVariable: referencedVarId});
}

async function markAsMutableReferenceToVariable(varId, referencedVarId, graph, buildInstance){
    let defaultPersistence = getDefaultPersistence();
    let varDef = await getVariable(varId);
    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }
    if(varDef.referencedVariable){
        if(varDef.referencedVariable === referencedVarId){
            //already has the same reference
            return;
        }
    }
    await defaultPersistence.updateVariable(varId, {referencedVariable: referencedVarId});
    await buildInstance.restartBuild(varId);
}



async function updateVarDefinition(_varName, _docId, _chapterId, _paragraphId, _parsedCommand) {
    if (!_docId) {
        throw new Error("Document ID is required");
    }
    let existingVarContext = {};
    let varId = getVarID(_docId, _varName);
    let defaultPersistence = getDefaultPersistence();

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
        varContext.__type = _parsedCommand.inputVars[0];
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
        $$.recordBuildError(`Variable ${varId} not found in getVarClock`);
        return undefined;
    }
    if(varDef.referencedVariable){
        //the real clock is now the clock of the variable it is referencing
        return await getVarClock(varDef.referencedVariable);
    }
    return varDef.clock;
}

export {
    decodePercentCustom,
    getVarID,
    getDocIdFromVarId,
    getLocalVarName,
    isDefined,
    sameValue,
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
    parseTextVars,
    markAsReferenceToVariable,         // does not allow changing the referenced variable. It is used during script expansion and the referenced variable should not change
    markAsMutableReferenceToVariable, // allow the referenced variable to be changed. It is used by commands from Set types and in any advanced cases where the value changes
    updateErrorInfo,
    updateWarningInfo,
    updateDebugInfo,

}