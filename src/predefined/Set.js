let varUtil = await import("../graph/varUtil.js");
async function createSet(docId, ...args){
    let newSet = new SetContainer(docId);
    await newSet.init(...args);
    return newSet;
}

function SetContainer(docId){
    let self = this;
    let persistence;
    self.__type = "Set";
    self.executionStatuses = {};
    self.vars = [];

    if(!docId){
        throw new Error("SetContainer: docId is undefined but it is required for sets because they store variable IDs. Invalid initialisation of the set container");
    }

    self.init = async function(...args){
        persistence = $$.loadPlugin("DefaultPersistence");
        for(let i = 0; i < args.length; i++){
            let varId = varUtil.getVarID(docId, args[i]);
            self.vars.push(varId);
        }
    }

    self.restore = async function(JSONSerialisation) {
        persistence = $$.loadPlugin("DefaultPersistence");
        $$.debug("set", `Restoring SetContainer with docId ${docId} and vars ${JSONSerialisation.vars}`);
        if(JSONSerialisation){
            self.executionStatuses = JSONSerialisation.executionStatuses;
            self.vars = JSONSerialisation.vars;
        }
    }

    function getExecutionStatus (outputVarId) {
        let status = self.executionStatuses[outputVarId];
        if(status === undefined){
            status = self.executionStatuses[outputVarId] = {};
        }
        return status;
    }
     function getDeletedVars (outputVarId) {
        let status = getExecutionStatus(outputVarId);
        let deletedVars = [];
        for(let vn in status){
            if(self.vars.indexOf(vn) === -1){
                deletedVars.push(vn);
                delete status[vn];
            }
        }
        return deletedVars;
    }

     function getNewVars (outputVarId) {
        let newVars = [];
        let status = getExecutionStatus(outputVarId);
        for (let vn of self.vars) {
            if( status[vn] === undefined){
                newVars.push(vn);
            }
        }
        return newVars;
    }
    function setCorrespondingReturnVar (outputVarId, memberVarId, macroResultVarId) {
        let status = getExecutionStatus(outputVarId);
        if(status[memberVarId] === macroResultVarId){
            return;
        }
        if(status[memberVarId] === undefined){
            status[memberVarId] = macroResultVarId;
        } else {
            $$.throwErrorSync(`It is not allowed to replace the output correspondences with another one. The output var id is ${outputVarId} and the member var id is ${memberVarId}. The current value is ${status[memberVarId]} and the new value is ${macroResultVarId}`);
        }
    }

    function getCorrespondence (outputVarId, memberVarId) {
        let status = getExecutionStatus(outputVarId);
        return status[memberVarId];
    }


    self.empty = async function() {
        self.vars = [];
    }

    self.add = async function(inputValues, parsedCommand, currentDocId, graph) {
        for(let i = 0; i < inputValues.length; i++){
            let varId = inputValues[i];
            if(!varId.includes("/")){
                varId = varUtil.getVarID(docId, varId);
            }
            self.vars.push(varId);
        }
    }

    self.remove = async function(inputValues) {
        for(let i = 0; i < inputValues.length; i++){
            let varId = inputValues[i];
            if(!varId.includes("/")){
                varId = varUtil.getVarID(docId, varId);
            }
            let index = self.vars.indexOf(varId);
            if(index !== -1){
                self.vars.splice(index, 1);
            }
        }
    }

    async function decideWhatToDO(inputValues, parsedCommand, currentDocId, graph){
        let outputVarId = varUtil.getVarID(currentDocId,parsedCommand.outputVars[0]);
        let whatToDO = {
            outputVarValue:undefined,
            outputVarId,
            newVars: getNewVars(outputVarId),
            deletedVars: getDeletedVars(outputVarId)
        }
        whatToDO.outputVarValue = await varUtil.getVarValue(outputVarId);
        if(!whatToDO.outputVarValue){
            //console.debug(`>>> Creating new value for variable ${outputVarId} for the command ${parsedCommand.command}`);
            whatToDO.outputVarValue = await createSet(currentDocId);
            await varUtil.setVarValue(outputVarId, whatToDO.outputVarValue);
        }
        return whatToDO;
    }

    self.map = async function(inputValues, parsedCommand, currentDocId, graph, buildInstance) {
        let whatToDO = await decideWhatToDO(inputValues, parsedCommand, currentDocId, graph);
        let macroName = inputValues[0];
        //console.debug(`>>> Executing 'map' command for '@${whatToDO.outputVarId}' with new members to process: [${whatToDO.newVars}], Deleted vars [${whatToDO.deletedVars}] this set is [${self.vars}] and existing set being [${whatToDO.outputVarValue.vars}]`);

        //for the deleted vars, we need to remove them from the output var
        let deletedVars = whatToDO.deletedVars;
        for(let i = 0; i < deletedVars.length; i++){
            let varId = deletedVars[i];
            let macroResultVarId = getCorrespondence(whatToDO.outputVarId, varId);
            whatToDO.outputVarValue.remove([macroResultVarId]);
        }

        //for the new vars, we need to expand the macro and add the result of the macro expansion to the output var
        let newVars = whatToDO.newVars;
        // expand the macro for each new var
        for(let i = 0; i < newVars.length; i++){
            let macroResultVarId;
            let currentItemId = newVars[i];
            macroResultVarId = getCorrespondence(whatToDO.outputVarId, currentItemId);
            if(macroResultVarId){
                //console.debug(`!!!!! ${macroResultVarId} already exists in output set of map, but making sure that we have in output`);
                whatToDO.outputVarValue.add([macroResultVarId]);
                continue; // do not expand it again
            }
            let preparedParsedCommand = {
                command: macroName
            }

            preparedParsedCommand.inputVars = [currentItemId];
            preparedParsedCommand.varTypes = ["var"];

            for(let j = 1; j < parsedCommand.varTypes.length; j++){
                let varType = parsedCommand.varTypes[j];
                preparedParsedCommand.varTypes.push(varType);
                if(varType === "var"){
                    preparedParsedCommand.inputVars.push(parsedCommand.inputVars[j]);
                } else {
                    preparedParsedCommand.inputVars.push(inputValues[j]);
                }
            }
            macroResultVarId = await graph.expandInlineMacro(currentDocId, undefined, macroName, preparedParsedCommand,buildInstance);
            whatToDO.outputVarValue.add([macroResultVarId]);
            setCorrespondingReturnVar(whatToDO.outputVarId, currentItemId, macroResultVarId);
        }

        //console.debug(`>>> Ending execution of 'map' command for '@${whatToDO.outputVarId}' with new members to process: [${whatToDO.newVars}], Deleted vars [${whatToDO.deletedVars}] this set is [${self.vars}] and final set becoming [${whatToDO.outputVarValue.vars}]`);
        await varUtil.setVarValue(whatToDO.outputVarId, whatToDO.outputVarValue);
        return whatToDO.outputVarValue;
    }

    self.filter = async function(inputValues, parsedCommand, currentDocId, graph) {
        let outputVarId = varUtil.getVarID(currentDocId,parsedCommand.outputVars[0]);
        let outputVarValue = await varUtil.getVarValue(outputVarId);
        if(!outputVarValue){
            //console.debug(`>>> Creating new value for variable ${outputVarId} for the command ${parsedCommand.command}`);
            outputVarValue = await createSet(currentDocId);
        }
        let jsDefCommandName = inputValues[0];
        try{
            //console.debug(`>>> Executing 'filter' command for '@${parsedCommand.outputVars[0]}' with new members to process: [${self.vars}]`);
            outputVarValue.empty();
            for(let i=0; i < self.vars.length; i++){
                let varValue = await graph.getVarValue(self.vars[i]);
                let isOK = await graph.runCustomCommand(currentDocId, jsDefCommandName, varValue);
                //console.debug(`>>> isOK [${isOK}]`, typeof isOK);
                //console.debug(`>>> Executed 'filter' command for '@${parsedCommand.outputVars[0]}' with varValue [${varValue}] and isOK [${isOK}]`);
                if(isOK !== false && isOK !== "false"){
                    //console.debug(`>>> Adding var [${self.vars[i]}] to the output set [${outputVarValue.vars}]`);
                    outputVarValue.add([self.vars[i]]);
                }
            }
        } catch(err){
            await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `The reduce command failed with error: ${err.message}`);
        }
        await varUtil.setVarValue(outputVarId, outputVarValue);
        //console.debug(`>>> Ending execution of 'filter' command for '@${parsedCommand.outputVars[0]}' with members to process: [${self.vars}] and resulted set becoming [${outputVarValue.vars}]`);
        return outputVarValue;
    }

    self.reduce = async function(inputValues, parsedCommand, currentDocId, graph) {
        let jsDefCommandName = inputValues[0];
        let resultOfReduce = undefined;
        try{
            //console.debug(`>>> Executing 'reduce' command for '@${parsedCommand.outputVars[0]}' with new members to process: [${self.vars}]`);
            for(let i=0; i < self.vars.length; i++){
                resultOfReduce = await graph.runCustomCommand(currentDocId, jsDefCommandName, self.vars[i], resultOfReduce);
            }
        } catch(err){
           await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `The reduce command failed with error: ${err.message}`);
        }
        return resultOfReduce;
    }

        async function reusableGetAt(index, outputVarId, graph, buildInstance) {
            if(index < 0 || index >= self.vars.length){
                await varUtil.updateErrorInfo(outputVarId, `The index is out of bounds! The getAt command will return 'undefined' for  output variable  ${outputVarId}`);
                return undefined;
            }
            await varUtil.markAsMutableReferenceToVariable(outputVarId, self.vars[index], graph, buildInstance);
        }

    self.getAt = async function(inputValues, parsedCommand, currentDocId, graph, buildInstance) {
        let index = parseInt(inputValues[0]);
        if(isNaN(index)){
            await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `The index must be a number! The getAt command will return 'undefined' for  output variable  ${parsedCommand.outputVars[0]}`);
        }

        let outputVarId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
        return reusableGetAt(index, outputVarId, graph, buildInstance); // undefined is fine as value fo variables keeping references to other variables
    }

    self.first = async function(inputValues, parsedCommand, currentDocId, graph, buildInstance) {
        let outputVarId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
        return reusableGetAt(0, outputVarId, graph, buildInstance);
    }

    self.rest = async function(inputValues, parsedCommand, currentDocId, graph) {
        let rest = self.vars.slice(1);
        return await createSet(currentDocId, ...rest);
    }

    self.export   = async function(inputValues, parsedCommand, currentDocId, graph) {
        return self.vars.join(",");
    }

}
$$.registerCustomType("Set", SetContainer);
