import {
    parseCommandLine,
    parseTextVars,
    parseCommandBlock,
    renameSpecialVars,
    makeNameForSpecialVars,
    breakComplexLineInSimpleLines,
    decodeSOPCode,
    sameValue} from "../util/soplangUtil.js";

import {getCache} from "./varsValuesCache.js";
import { isDeepStrictEqual } from 'util';
let varDefCache = getCache("varDefCache");
let customTypesValuesCache = getCache("customTypesValuesCache");

import {restoreInstance} from "./customTypeRegistry.js";

let defaultPersistenceSingleton;
function getDefaultPersistence(){
    if(!defaultPersistenceSingleton){
        defaultPersistenceSingleton = $$.loadPlugin("DefaultPersistence");
    }
    return defaultPersistenceSingleton;
}


function getVarID(docId, varName){
    if(varName.startsWith(docId + "/")){
        $$.throwErrorSync(`Invalid varName, got ${varName}`);
    }
    return docId + "/" + varName;
}
async function deleteVariableWrapper(varId){
    customTypesValuesCache.delete(varId);
    varDefCache.delete(varId);
    let persistence = getDefaultPersistence();
    return await persistence.deleteVariable(varId);
}
async function updateVariableWrapper(varId, varContext){
    customTypesValuesCache.delete(varId);
    varDefCache.delete(varId);
    let persistence = getDefaultPersistence();
    $$.debug("varValues", `>>>Updating variable ${varId} with updated fields: '${JSON.stringify(varContext)}'`);
    return await persistence.updateVariable(varId, varContext);
}

async function getVariableWrapper(varId){
    if(varDefCache.has(varId)){
        return varDefCache.get(varId);
    }
    let persistence = getDefaultPersistence();
    let res = await persistence.getVariable(varId);
    varDefCache.set(varId, res);
    return res;
}

async function hasVariableWrapper(varId){
    if(varDefCache.has(varId)){
        return true;
    }
    let persistence = getDefaultPersistence();
    return await persistence.hasVariable(varId);
}

async function createVariableWrapper(obj){
    let persistence = getDefaultPersistence();
    return await persistence.createVariable(obj);
}

async function setVarIdForVariableWrapper(id, varId){
    customTypesValuesCache.delete(varId);
    varDefCache.delete(varId);
    let persistence = getDefaultPersistence();
    return await persistence.setVarIdForVariable(id, varId);
}

function getDocIdFromVarId(varId){
    let splitVarId = varId.split("/");
    if(splitVarId.length === 1){
        return undefined;
    }
    if(splitVarId.length >= 2){
        return splitVarId[0];
    }
}

function getLocalVarName(docId, fullVarName){
    //reverse getVarId
    let splitVarName = fullVarName.split("/");
    if(splitVarName.length === 1){
        return fullVarName;
        //return getVarID(docId, fullVarName);
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
    return await hasVariableWrapper(varId);
}

async function getVariable(varId){
    try{
        return  await getVariableWrapper(varId);
    } catch(err){
        $$.recordBuildError("Error getting variable", varId, err);
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
        let instance;
        try{
            instance = await restoreInstance(varDef.docId, varDef.__type, varDef.varName, varDef.value);
        } catch(err){
            await updateErrorInfo(varId, `Error restoring instance of type ${varDef.__type}. The value of "${varDef.varName}" will be set to undefined`, err);
        }
        return instance;
    }
    return varDef.value;
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

    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }

    if(varDef.referencedVariable){
        //the only dependency is now the variable it is referencing
        return await setVarValue(varDef.referencedVariable, newValue);
    }
    if(varDef.parsedCommand.command === "chainAlias"){
        let targetVarId = varDef.parsedCommand.inputVars[2];
        $$.debug("chainAlias",`>>>Updating chainAlias: '${targetVarId}' with value '${newValue}'`);
        /* //this code is kind of working in case that we want to have left value for chain aliases, for now we don't consider useful and kind of dangerous. Custom types mut define modifiers as functions
        let obj = await getVariableWrapper(targetVarId);
        if(!obj){
            await $$.throwError(`Variable ${targetVarId} not found!`);
        }
        obj.value[varDef.parsedCommand.inputVars[1]] = newValue;
        await updateVariableWrapper(targetVarId, {value: serialiseValue(obj.value), clock: await defaultPersistenceSingleton.getLogicalTimestamp()});
         */
        return await updateVariableWrapper(varDef.varId, {value: newValue, clock: await defaultPersistenceSingleton.getLogicalTimestamp()});
    }

    let serialisedNewValue = serialiseValue(newValue);
    if(!varDef.defaultInitialisation && sameValue(varValue, serialisedNewValue)){
        //console.debug(">>>Variable", varId, "has the same value as before. Not updating");
        return false;
    }


    let varContext = {value: serialisedNewValue, clock: await defaultPersistenceSingleton.getLogicalTimestamp()};
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

    if(varDef.defaultInitialisation){
        varContext.defaultInitialisation = false;
    }

    if(newValue !== undefined && newValue.__type !== undefined){
        varContext.__type = newValue.__type;
    }
    await updateVariableWrapper(varId, varContext);

    return true;
}

async function updateErrorInfo(varId, errorMessage){
    console.debug("ERROR: Updating error info for variable: ", varId, "with message", errorMessage);
    try{
        let varContext = { updateTime : Date.now(), errorInfo : errorMessage, value: undefined};
        await updateVariableWrapper(varId, varContext);
    }catch(err){
       $$.recordBuildError("Error updating error info: " + varId + errorMessage, err);
    }
}
async function updateWarningInfo(varId, warningMessage){
    try{
        let varContext = {  warningInfo : warningMessage, updateTime : Date.now()};
        await updateVariableWrapper(varId, varContext);
    }catch(err){
        $$.recordBuildError("Error updating warning info " + varId + warningMessage, err);
    }
}

async function updateDebugInfo(varId, debugMessage){
    try{
        let varContext = {  debugInfo : debugMessage, updateTime : Date.now()};
        await updateVariableWrapper(varId, varContext);
    }catch(err){
        $$.recordBuildError("Error updating debug info " + varId + errorMessage, err);
    }
}
async function isCustomCommand(docId, name) {
    let marcoVarId = getVarID(docId, name);

    let hasVariable = await defaultPersistenceSingleton.hasVariable(marcoVarId);
    if(!hasVariable){
        return false;
    }
    //check if the command is a macro
    let macroVar = await getVariable(getVarID(docId, name));
    return macroVar.parsedCommand.command === "macro" || macroVar.parsedCommand.command === "jsdef";
}
async function getDependencies(varId){

    let varDef = await getVariable(varId);
    if(!varDef){
        await $$.throwError("Variable not found: ", varId);
    }
    let deps = [];

    if(varDef.referencedVariable) {
        //the only dependency is now the variable it is referenced
        deps = [varDef.referencedVariable];
    }

    if(!varDef.parsedCommand){
        return deps;
    }

    if(await isCustomCommand(varDef.docId, varDef.parsedCommand.command)){
         let objVarId = getVarID(varDef.docId, varDef.parsedCommand.command);
         deps.push(objVarId);
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

            /*if(inputVar[0] === "~"){
                deps.push(getVarID(varDef.docId, inputVar.slice(1)));
            }*/
        }
    }
    return deps;
}

async function markAsReferenceToVariable(varId, referencedVarId, docId, optionalMacroId){
    if(!varId.includes("/") && !await isDefined(varId)){
        varId = getVarID(docId, varId);
    }
    if(!referencedVarId.includes("/")){
        referencedVarId = getVarID(docId, referencedVarId);
    }

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

    let newVarValue = {referencedVariable: referencedVarId, clock: await defaultPersistenceSingleton.getLogicalTimestamp(), updateTime : Date.now()};
    if(optionalMacroId){
        $$.debug("alias", `Defining macro alias reference variable ${varId} for ${referencedVarId} with macroId ${optionalMacroId}`);
        newVarValue.macroId = optionalMacroId;
        newVarValue.macroClock = await getVarClock(optionalMacroId);
    } else {
        $$.debug("alias", `Defining normal alias reference variable ${varId} for ${referencedVarId} in document ${docId}`);
    }
    await updateVariableWrapper(varId, newVarValue);
}

async function markAsMutableReferenceToVariable(varId, referencedVarId, graph, buildInstance){
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
    $$.debug("alias", `Defining alias as mutable reference for variable ${varId} for ${referencedVarId}`);
    await updateVariableWrapper(varId, {referencedVariable: referencedVarId, clock: await defaultPersistenceSingleton.getLogicalTimestamp(), updateTime : Date.now()});
    await buildInstance.restartBuild(varId);
}



async function updateVarDefinition(_varName, _docId, _chapterId, _paragraphId, _parsedCommand) {
    if (!_docId) {
        throw new Error("Document ID is required");
    }
    let existingVarContext = {};
    let varId = getVarID(_docId, _varName);

    if(!await hasVariableWrapper(varId)){
        let obj = await createVariableWrapper({varId: varId});
        await setVarIdForVariableWrapper(obj.id, varId);
    } else {
        let varContext = await getVariableWrapper(varId);
        existingVarContext = {
            varId: varContext.varId,
            varName: varContext.varName,
            docId: varContext.docId,
            chapterId: varContext.chapterId,
            paragraphId: varContext.paragraphId,
            parsedCommand: structuredClone(varContext.parsedCommand),
        }
        if (existingVarContext.parsedCommand.command === "new" || existingVarContext.parsedCommand.command === "lookup") {
            existingVarContext.__type = _parsedCommand.inputVars[0];
        }
        if(existingVarContext.parsedCommand){
            existingVarContext.parsedCommand.inputVars = existingVarContext.parsedCommand.inputVars ? Array.from(varContext.parsedCommand.inputVars) : [];
            for(let i = 0; i < existingVarContext.parsedCommand.inputVars.length; i++){
                let inputVar = existingVarContext.parsedCommand.inputVars[i];
                if(existingVarContext.parsedCommand.varTypes[i] === "var"){
                    existingVarContext.parsedCommand.inputVars[i] = getLocalVarName(_docId, inputVar);
                }
            }
        }
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
    if(!isDeepStrictEqual(existingVarContext, varContext)){
        //console.debug(">>>Updating variable", _varName, "in", _docId, "with command", _parsedCommand.command, "and input vars", _parsedCommand.inputVars , "and var types", _parsedCommand.varTypes);
        varContext.clock = undefined;
        varContext.updateTime = Date.now();
    } else {
        return false; //nothing changed
    }

    varContext.defaultInitialisation = true;
    if(_parsedCommand.outputVars.length > 1){
        await deleteVariableWrapper(varId);
        $$.throwErrorSync("Command", _parsedCommand.command, "has more than one output variable. This is not supported!" + _parsedCommand.outputVars);
    }

    if(_parsedCommand.outputVars[0] !== _varName){
        console.debug("Dump varContext", varContext);
        await deleteVariableWrapper(varId);
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

    await updateVariableWrapper(varContext.varId, varContext);
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

async function resetAlias(varId){
    await updateVariableWrapper(varId, {referencedVariable: undefined, macroId: undefined});
}
async function parseCommand(chapterId, paragraphId, line, i){
    line = renameSpecialVars(chapterId, paragraphId, line);
    let parsedCommand = null;
    try {
        parsedCommand = parseCommandLine(line);
    } catch (e) {
        console.error("Error parsing command!" + `Line ${line}  will be ignored`);
        return;
    }

    //console.debug("!!!!!!!! Parsed command", parsedCommand);
    if (parsedCommand.outputVars.length === 0) {
        parsedCommand.outputVars = [makeNameForSpecialVars(chapterId, paragraphId, "tmp" + i)];
    }
    return parsedCommand;
}
async function parseCommands(chapterId, paragraphId, commandTextSeparatedByNewLine){
    let parsedCommands = [];
    let lines = parseCommandBlock(chapterId, paragraphId, commandTextSeparatedByNewLine);
    //console.debug(">>>>>Defining variables from code:", lines);
    for (let i = 0; i < lines.length; i++) {
        let parsedCommand = await parseCommand(chapterId, paragraphId, lines[i], i);
        if(parsedCommand){
            parsedCommands.push(parsedCommand);
        }
    }
    return parsedCommands;
}
export {
    decodeSOPCode,
    getVarID,
    getDocIdFromVarId,
    getLocalVarName,
    isDefined,
    getVariable,
    getVarValue,
    getVarClock,
    setVarValue,
    getDependencies,
    updateVarDefinition,
    parseCommandBlock,
    renameSpecialVars,
    makeNameForSpecialVars,
    breakComplexLineInSimpleLines,
    parseCommandLine,
    parseTextVars,
    markAsReferenceToVariable,         // does not allow changing the referenced variable. It is used during script expansion and the referenced variable should not change
    markAsMutableReferenceToVariable, // allow the referenced variable to be changed. It is used by commands from Set types and in any advanced cases where the value changes
    updateErrorInfo,
    updateWarningInfo,
    updateDebugInfo,
    sameValue,
    deleteVariableWrapper,
    resetAlias,
    parseCommands,
    parseCommand
}