let varUtil = await import("../graph/varUtil.js");
async function doRecOverwrite(fullVarName, withValue, graph, buildInstance) {
    //console.debug(">>>>> doRecOverwrite variable", fullVarName, "with value", withValue);
    let varDef = await varUtil.getVariable(fullVarName);
    if(varDef === undefined){
        await varUtil.updateWarningInfo(fullVarName,` Ignoring invalid overwrite command trying to overwrite unknown variable '${fullVarName}'`);
        return;
    }
    //console.debug(">>>>> Overwriting variable", varDef);
    let commandName = varDef.parsedCommand.command;
    switch(commandName){
        case "assign":
            if(varDef.parsedCommand.varTypes.includes("var")){
                await varUtil.updateWarningInfo(fullVarName,`Ignoring invalid overwrite command for variable '${fullVarName}'. It is not allowed to overwrite a variable with dependencies`);
                return;
            }

            let diffFound = await graph.setValue(fullVarName, withValue);
            if(diffFound){
                await buildInstance.restartBuild(undefined);
            }
            return withValue;
        case "alias":
            //allow to overwrite the alias because it will actually go to overwrite the value of the actual variable
            let referencedVariable = varDef.referencedVariable;
            let referredVar = await varUtil.getVariable(referencedVariable);
            if(referredVar === undefined){
                await varUtil.updateWarningInfo(fullVarName,`Ignoring invalid overwrite command for variable '${fullVarName}'. The variable it refers to is not defined`);
                return;
            }
            return await doRecOverwrite(varDef.referencedVariable, withValue, graph, buildInstance);
        case "chainAlias":
            await varUtil.updateWarningInfo(fullVarName,`Ignoring invalid overwrite command for variable '${fullVarName}'. It is not allowed to directly overwrite a variable member of a custom type`);
            return;
        default:
            await varUtil.updateWarningInfo(fullVarName,`Ignoring invalid overwrite command for variable '${fullVarName}'. Only simple variables can be overwritten`);
            return;
    }
}

 export async function overwrite (inputValues, parsedCommand, currentDocId, graph, buildInstance) {
    let varName = inputValues[0];
    //let outputVarId = parsedCommand.outputVars[0];

    if(varName[0] === "~"){
        varName = varName.slice(1);
    }

    let fullVarName = varUtil.getVarID(currentDocId, varName);
    if(! await varUtil.isDefined(fullVarName)){
        //maybe is a macro expanded variable
        fullVarName = varUtil.getVarID(currentDocId, currentDocId+"_"+varName);
        if(!await varUtil.isDefined(fullVarName)){
            await varUtil.updateWarningInfo(fullVarName,` Ignoring invalid overwrite command trying to overwrite unknown variable '${fullVarName}'`);
            return;
        }
    }
    return await doRecOverwrite(fullVarName, inputValues[1], graph, buildInstance);
}
