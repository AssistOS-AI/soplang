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
            valueColumns[columnDescription] = i+1;
        }
    }

    this.computeValues = async function (jsonObject, docId, graph){
        let res = {};

        for(let key in jsonObject){
            if(valueColumns[key] !== undefined){
                res[key] = jsonObject[key];
            }
        }

        if(!res.truid){
            let persistence = await $$.loadPlugin("DefaultPersistence");
            res.truid = TABLE_ROW_UID + "_" + await persistence.getNextNumber(TABLE_ROW_UID);
        }

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
        }
        return res;
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
            schemaUtil = new RowSchemaUtil(self.columnDescription);
        } else {
            throw new Error("Invalid JSONSerialisation for Table");
        }
    }

    // Append rows to the table - similar to tableUtil.js
    self.append = async function (inputValues, parsedCommand, currentDocId, graph, buildInstance) {
        let validJson;
        try {
            let pseudoJson = inputValues[0];
            if (typeof pseudoJson === "string") {
                validJson = $$.SOPParse(pseudoJson);
            } else {
                validJson = pseudoJson;
            }
        } catch (error) {
            console.error("Error parsing JSON self.data:", error);
            await buildInstance.setErrorInfo(parsedCommand.outputVars[0], `Invalid JSON format: ${error.message}`);
            return;
        }
        self.data.push(await schemaUtil.computeValues(validJson));
        await varUtil.setVarValue(tableVarId, self);
        let resultedAliasTableId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
        await varUtil.markAsReferenceToVariable(resultedAliasTableId, tableVarId, currentDocId);
        return self;
    }

    self.internalAppend = async function (row) {
        self.data.push(row);
    }

    self.exwipe = async function (inputValues, parsedCommand, currentDocId, graph, buildInstance) {
        let newTableId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
        let newTable = new Table(currentDocId, newTableId);
        await newTable.init(...self.columnDescription);
        let testRowCommand = `${currentDocId}_${inputValues[0]}`;
        for(let i = 0; i < self.data.length; i++){
            let row = self.data[i];
            $$.debug("special", "Type of row", typeof row, "row", $$.SOPStringify(row));
            let result = await graph.runCustomCommand(currentDocId, testRowCommand, row);
            console.debug("!!!!! Extract and delete command", testRowCommand, "result", result);
            if(result && result !== "false"){
                await newTable.internalAppend(row);
            }
        }
        self.data = [];
        console.debug(">>>>>> Status of host data", self.data.length, "status of new table", newTable.data.length);
        await varUtil.setVarValue(newTableId, newTable);
        await varUtil.setVarValue(tableVarId, self);
        return newTable;
    }

    self.upsert = async function (inputValues, parsedCommand, currentDocId, graph, buildInstance) {
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
        return self;
    }
}

$$.registerCustomType("Table", Table);
