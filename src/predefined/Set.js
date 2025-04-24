let varUtil = await import("../graph/varUtil.js");
async function createSet(docId){
    let newSet = new SetContainer(docId);
    await newSet.init();
    return newSet;
}

function SetContainer(docId){
    let self = this;
    let persistence;
    self.__type = "Set";
    self.executionStatuses = {};
    self.vars = [];

    if(!docId){
        throw new Error("SetContainer: docId is undefined");
    }
     function getDeletedVars (outputVarId) {
        let status = self.executionStatuses[outputVarId];
        let deletedVars = [];
        if(status === undefined) {
            self.executionStatuses[outputVarId] = {};
            self.executionStatuses[outputVarId] = status;
        }
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
        let status = self.executionStatuses[outputVarId];
        if(status === undefined) {
            self.executionStatuses[outputVarId] = {};
            return false;
        }
        for (let vn of self.vars) {
            if( status[vn] === undefined){
                newVars.push(vn);
            }
        }
        return newVars;
    }

    function setCorrespondingReturnVar (outputVarId, memberVarId, macroResultVarId) {
        let status = self.executionStatuses[outputVarId];
        if(status === undefined) {
            self.executionStatuses[outputVarId] = {};
            return false;
        }
        if(status[memberVarId] === undefined){
            status[memberVarId] = macroResultVarId;
        }
    }



    self.init = async function(...args){
        persistence = await $$.loadPlugin("DefaultPersistence");
        for(let i = 0; i < args.length; i++){
            let varId = varUtil.getVarID(docId, args[i]);
            self.vars.push(varId);
        }
    }

    self.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
           self.executionStatuses = JSONSerialisation.executionStatuses;
           self.vars = JSONSerialisation.vars;
        }
    }

    self.add = async function(inputValues, outputValues, currentDocId, graph) {
        for(let i = 0; i < inputValues.length; i++){
            let varId = varUtil.getVarID(docId, inputValues[i]);
            self.vars.push(varId);
        }
    }

    self.remove = async function(inputValues) {
        for(let i = 0; i < inputValues.length; i++){
            let varId = varUtil.getVarID(docId, inputValues[i]);
            let index = self.vars.indexOf(varId);
            if(index !== -1){
                self.vars.splice(index, 1);
            }
        }
    }

    async function decideWhatToDO(inputValues, outputValues, currentDocId, graph){
        let outputVarId = outputValues[0];
        console.debug(">>> Set.map for:", outputVarId, self.vars, self.executionStatuses[outputVarId]);
        let whatToDO = {
            outputVarValue:undefined,
            outputVarId,
            newVars: getNewVars(outputVarId),
            deletedVars: getDeletedVars(outputVarId)
        }
        if(await persistence.hasVariable(outputVarId)){
            whatToDO.outputVarValue = await varUtil.getVarValue(outputVarId);
        } else {
            whatToDO.outputVarValue = await createSet(currentDocId);
        }
        return whatToDO;
    }

    self.map = async function(inputValues, outputValues, currentDocId, graph) {
        let whatToDO = await decideWhatToDO(inputValues, outputValues, currentDocId, graph);
        let macroName = inputValues[0];
        let macroArgs = inputValues.slice(1);
        //for the new vars, we need to expand the macro and add the result od the macro execution to the output var
        let newVars = whatToDO.newVars;
        // expand the macro for each new var
        for(let i = 0; i < newVars.length; i++){
            let varId = newVars[i];
            //docId, targetVarId,  intendedCommand, parsedCommand
            let macroResultVarId = await graph.expandInlineMacro(currentDocId, varId, macroName, macroArgs);
            setCorrespondingReturnVar(whatToDO.outputVarId, varId, macroResultVarId);
        }

        //for the deleted vars, we need to remove them from the output var
        let deletedVars = whatToDO.deletedVars;
        for(let i = 0; i < deletedVars.length; i++){
            let varId = deletedVars[i];
         whatToDO.outputVarValue.remove([varId]);
        }

        return whatToDO.outputVarValue;
    }

    self.filter = async function(inputValues, outputValues, currentDocId, graph) {
        let whatToDO = decideWhatToDO(inputValues, outputValues, currentDocId, graph);
        return whatToDO.outputVarValue;
    }

    self.reduce = async function(inputValues, outputValues, currentDocId, graph) {
        return undefined;
    }



    self.getAt = async function(inputValues, outputValues, currentDocId, graph) {

    }

    self.first = async function(inputValues, outputValues, currentDocId, graph) {

    }

    self.rest = async function(inputValues, outputValues, currentDocId, graph) {

    }

}
$$.registerCustomType("Set", SetContainer);
