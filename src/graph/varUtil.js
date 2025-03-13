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
    /*
      if(!variables[docId]){
                console.warn("Document", docId , " not found when trying to get a value for variable", varName);
                return undefined;
          }
        let varContext = variables[docId][varName];
    if(varContext._parsedCommand.command === "special"){
        let newValue = _parsedCommand.get(_varName, _docId, _chapterId, _paragraphId);
        if(newValue !== _value){
            this.safeTimestamp = new LocalSafeTimestamp();
            _value = newValue;
            console.debug("Special command", _parsedCommand.command, "changed value to", _value);
        }
    }
    if(varContext.parsedCommand.command === "table"){
        //console.debug("Adding the header to the actual value", _value, "for table", _parsedCommand.inputVars, "in document", _docId, "chapter", _chapterId, "paragraph", _paragraphId);
        if(_value.tableHeader !== undefined){
            await $$.throwError("Table variable has already has a header. Why?");
        }
        return { tableHeader: _parsedCommand.inputVars, tableData: _value};
    } */
    return varDef.value;
}

async function setNewValue(varId, newValue){
    /*
    let varContext = variables[docId][varName];
    if(!varContext){
        console.debug("All Variables", variables, "in document", docId, "are", Object.keys(variables[docId]));
        await $$.throwError("Variable '" + varName + "' not found in document " + docId);
    }
    if(varContext.parsedCommand.command === "alias"){
        await $$.throwError("Cannot set value of alias", varName);
    }
    if(_parsedCommand.command === "special"){
        return _parsedCommand.set(newValue, _varName, _docId, _chapterId, _paragraphId);
    }
    if(_parsedCommand.command === "table"){
        if(newValue.tableHeader !== undefined){
            newValue = newValue.tableData;
        }
    }*/
    let varDef = await getVariable(varId);
        if(!varDef){
         await $$.throwError("Variable not found", varId);
        }
    varDef.value = newValue;
    varDef.clock = defaultPersistence.getLogicalTimestamp();
    await defaultPersistence.updateVariable(varId, varDef);
}

async function getDependencies(varId){
    let deps = [];
    let varDef = await getVariable(varId);
    if(!varDef){
        await $$.throwError("Variable not found", varId);
    }
    if(varDef.parsedCommand && varDef.parsedCommand.inputVars.length > 0){
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
    /*if(this.parsedCommand === "alias"){
        console.debug(">>>>>>>>>>")
        deps.push(this.parsedCommand.value);
    } */
    //console.debug("Dependencies of ", varId, "are:", deps);
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