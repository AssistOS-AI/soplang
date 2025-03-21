const {LocalSafeTimestamp} = require("../util/soplangUtil");

let defaultPersistence = $$.loadPlugin("DefaultPersistence");

function getVarID(docId, varName){
    return docId + "." + varName;
}

async function getVariable(varId){
    return await defaultPersistence.getVariable(varId);
}

async function getVarTimestamp(varId){
    let varContext = await getVariable(varId);
    return varContext.clock;
}
async function getVarValue(varId){
    let varDef = await getVariable(varId);
    if(!varDef){
        await $$.throwError("Variable not found:", varId);
        return undefined;
    }
    return varDef.value;
}

async function setNewValue(varId, newValue, force = false){
    let varDef = await getVariable(varId);
    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }


    if(varDef.parsedCommand.command === "alias" && !force){
        await $$.throwError("Cannot set value of alias", varId);
    }

    if(varDef.parsedCommand.command === "table"){
        newValue = {tableHeader: varDef.parsedCommand.inputVars, tableData:newValue};
    }
    await defaultPersistence.updateVariable(varId, {value: newValue, clock: defaultPersistence.getLogicalTimestamp()});
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

    if(varDef.parsedCommand.command === "alias"){
        deps.push( getVarID(varDef.parsedCommand.inputVars[0], varDef.parsedCommand.inputVars[1]));
    } else if(varDef.parsedCommand.inputVars.length > 0){
        for(let i = 0; i < varDef.parsedCommand.inputVars.length; i++){
            let inputVar = varDef.parsedCommand.inputVars[i];
            if(varDef.parsedCommand.varTypes[i] === "alias"){
                deps.push(inputVar);
            }
            if(varDef.parsedCommand.varTypes[i] === "var"){
                deps.push(inputVar);
            }
        }
    }
    return deps;
}

async function updateVarDefinition(_varName, _docId, _chapterId, _paragraphId, _parsedCommand) {
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

    if(diffObjects(existingVarContext, varContext)){
        this.clock = undefined;
    } else {
        return false; //nothing changed
    }


    if(_parsedCommand.outputVars.length > 1){
        $$.throwErrorSync("Command", _parsedCommand.command, "has more than one output variable. This is not supported!");
    }

    if(_parsedCommand.outputVars[0] !== _varName){
        $$.throwErrorSync("Command", _parsedCommand.command, "has output variable '"+ _parsedCommand.outputVars[0]+ "' which is different from expected name '"+ _varName + "'");
    }


    /*
    if(_parsedCommand.command === "alias" ){
        console.debug(">>>Alias ",
                _parsedCommand.outputVars[0], " as ",  _parsedCommand.inputVars[0],
                "Input Types", _parsedCommand.varTypes[0],
            "Initial value ", _value);
    } */

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

module.exports = {
    getVarID,
    getVariable,
    getVarValue,
    getVarClock,
    setNewValue,
    getDependencies,
    updateVarDefinition
}