import {markAsReferenceToVariable} from "../graph/varUtil.js";

let varUtil = await import("../graph/varUtil.js");
const TABLE_ROW_UID = "TRUID"

function RowSchemaUtil(columnDescriptionArray) {
    let valueColumns = {};
    let computedColumns = {

    };
    for(let i = 0; i < columnDescriptionArray.length; i++){
        let columnDescription = columnDescriptionArray[i];
        if(columnDescription.includes(":") ){
            let parsedDescription = columnDescription.split(":");
            let columnName = parsedDescription[0].trim();
            if(columnName.length === 0 || parsedDescription.length !== 2){
                $$.recordBuildError(`Ignoring invalid column description ${columnDescription}`);
                continue;
            }
            computedColumns[columnName] = parsedDescription[1].split(" ").map( item =>  item.trim());
        } else {
            valueColumns[columnDescription] = i;
        }
    }

    this.computeValues = async function (jsonObject, docId, graph){
        let res = {};
        for(let key in jsonObject){
            if(valueColumns[key] !== undefined){
                res[key] = jsonObject[key];
            }
        }

        let persistence = await $$.loadPlugin("DefaultPersistence");
        res.truid = TABLE_ROW_UID+ "_" + await persistence.getNextNumber(TABLE_ROW_UID)
        for(let key in computedColumns){
            let expression = computedColumns[key];
            let command = expression[0];
            let args = [];
            for(let i = 1; i < expression.length; i++){
                let arg = expression[i];
                if(valueColumns[arg] !== undefined){
                    args.push(res[arg]);
                } else {
                    args.push(arg);
                }
            }
            res[key] = await graph.runCustomCommand(docId, command.command, ...args);
            console.debug(">>>>>> computed value for column", key, "is", res[key]);
        }

    }
}
function Table(docId, tableVarId) {
    let self = this;
    self.columnDescription = undefined; // Column names
    self.data = [];    // Array of objects
    self.__type = "Table";
    if(!docId || !tableVarId){
        throw new Error("Table constructor requires docId and tableVarId");
    }
    let schemaUtil;

    self.init = async function (...columnDescription) {
        self.columnDescription = columnDescription;
        self.data = [];
        schemaUtil = new RowSchemaUtil(columnDescription);
    }

    self.restore = async function (JSONSerialisation) {
        if (JSONSerialisation) {
            self.columnDescription = JSONSerialisation.columnDescription ;
            self.data = JSONSerialisation.data || [];
            schemaUtil = new RowSchemaUtil( self.columnDescription);
        }
    }

    // Append rows to the table - similar to tableUtil.js
    self.append = async function (inputValues, parsedCommand, currentDocId, workspace, graph, buildInstance) {
        let validJson;
        try {
            let pseudoJson = inputValues[0];
            validJson = $$.SOPParse(pseudoJson);
        } catch (error) {
            await buildInstance.setErrorInfo(parsedCommand.outputVars[0], `Invalid JSON format: ${error.message}`);
            console.error("Error parsing JSON self.data:", error);
            return;
        }
        self.data.push(await schemaUtil.computeValues(validJson));
        await varUtil.setVarValue(tableVarId, self);
        await varUtil.markAsReferenceToVariable(parsedCommand.outputVars[0], tableVarId, currentDocId);
    }

    self.extractAndDelete = async function (inputValues, parsedCommand, currentDocId, workspace, graph, buildInstance) {
        let newTable = new Table(currentDocId, parsedCommand.outputVars[0]);
        let testRowCommand = inputValues[0];
        for(let i = 0; i < self.data.length; i++){
            let row = self.data[i];
            let result = await graph.runCustomCommand(currentDocId, testRowCommand, row);
            if(result){
                await newTable.append(row);
            }
        }
        self.data = [];
        await varUtil.setVarValue(parsedCommand.outputVars[0], newTable);
        await varUtil.setVarValue(tableVarId, self);
        return newTable;
    }

    self.upsert = async function (inputValues, parsedCommand, currentDocId, workspace, graph, buildInstance) {
        let inputTable = inputValues[0];
        let truidIndex = {};
        for(let i = 0; i < self.data.length; i++){
            truidIndex[inputTable.data[i].truid] = i;
        }

        for(let i = 0; i < inputTable.data.length; i++){
            let truid = inputTable.data[i].truid;
            if(truidIndex[truid] !== undefined){
                let row = self.data[truidIndex[truid]];
                for(let key in inputTable.data[i]){
                    if(key === "truid"){
                        continue;
                    }
                    row[key] = inputTable.data[i][key];
                }
            } else {
                self.data.push(inputTable.data[i]);
            }
        }
        await varUtil.setVarValue(tableVarId, self);
        await varUtil.markAsReferenceToVariable(parsedCommand.outputVars[0], tableVarId, currentDocId);
    }
}

$$.registerCustomType("Table", Table);
