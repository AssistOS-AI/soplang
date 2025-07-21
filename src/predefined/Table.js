let varUtil = await import("../graph/varUtil.js");
const TABLE_ROW_UID = "TRUID"

function RowSchemaUtil(columnDescriptionArray) {
    let valueColumns = {};
    let computedColumns = {
    };
    $$.debug("table", `RowSchemaUtil config: ${JSON.stringify(columnDescriptionArray)}`);
    for(let i = 0; i < columnDescriptionArray.length; i++){
        let columnDescription = columnDescriptionArray[i];
        if(columnDescription.includes(":") ){
            let parsedDescription = columnDescription.split(":");
            let columnName = parsedDescription[0].trim();
            if(columnName.length === 0 || parsedDescription.length !== 2){
                $$.recordBuildError(`Ignoring invalid column description ${columnDescription}`);
                continue;
            }
            computedColumns[columnName] = parsedDescription[1].split(" ").map( item =>  item.trim()).filter( item => item.length > 0);
        } else {
            valueColumns[columnDescription] = i+1;
        }
    }

    //$$.debug("table", `RowSchemaUtil settings ${columnDescriptionArray.length} columns: ${JSON.stringify(valueColumns)} Self computed columns: ${JSON.stringify(computedColumns)}`);

    this.computeValues = async function (jsonObject, docId, graph){
        let res = {};

        $$.debug("table", "RowSchemaUtil computeValues:", `'${JSON.stringify(jsonObject)}' in docId '${docId}' for table with schema '${JSON.stringify(columnDescriptionArray)}'`);

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
            $$.debug("table", "Key in selfComputed Columns", key, "computedColumns", computedColumns[key]);
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
            res[key] = await graph.runCustomCommand(docId, command, ...args);
        }
        return res;
    }
}
function Table(docId, varName) {
    let self = this;
    self.columnDescription = undefined; // Column names
    self.data = [];    // Array of objects
    self.__type = "Table";
    this.docId = docId;
    this.varName = varName;
    this.varId = varUtil.getVarID(docId, varName);
    if(!docId || !varName){
        throw new Error("Table constructor requires docId and varName");
    }
    let schemaUtil;

    self.init = async function (...columnDescription) {
        if(self.columnDescription !== columnDescription){
            self.columnDescription = columnDescription;
            self.data = [];
            schemaUtil = new RowSchemaUtil(columnDescription);
        }
    }

    self.restore = async function (JSONSerialisation) {
        if (JSONSerialisation && self.columnDescription !== JSONSerialisation.columnDescription) {
            self.columnDescription = JSONSerialisation.columnDescription ;
            self.data = JSONSerialisation.data || [];
            schemaUtil = new RowSchemaUtil(self.columnDescription);
            this.docId = JSONSerialisation.docId;
            this.varName = JSONSerialisation.varName;
            this.varId = JSONSerialisation.varId;
        } else {
            throw new Error("Invalid JSONSerialisation for Table");
        }
    }

    // Append rows to the table - similar to tableUtil.js
    self.append = async function (inputValues, parsedCommand, currentDocId, graph, buildInstance) {
        let validJson = {};
        try {
            let pseudoJson = inputValues[0];
            if (typeof pseudoJson === "string" && inputValues.length === 1) {
                if( pseudoJson.startsWith("'sop:") || pseudoJson.startsWith('"sop:') ){
                    validJson = $$.SOPParse(pseudoJson);
                } else {
                     validJson[self.columnDescription[0]] = inputValues[0];
                }
            } else if(typeof pseudoJson === "object"){
                validJson = pseudoJson;
            } else {
                for(let i = 0; i < self.columnDescription.length; i++){
                    let key = self.columnDescription[i];
                    validJson[key] = inputValues[i];
                }
            }
        } catch (error) {
            console.error("Error parsing JSON self.data:", error);
            await buildInstance.setErrorInfo(parsedCommand.outputVars[0], `Invalid JSON format: ${error.message}`);
            return;
        }
        let computedRow = await schemaUtil.computeValues(validJson, currentDocId, graph);
        self.data.push(computedRow);
        await varUtil.setVarValue(this.varId, self);
        return computedRow;
    }

    self.internalInsert = async function (validJson, graph, position) {
        if(position == null){
            position = self.data.length; // Default to append
        }
        if (position < 0 || position > self.data.length) {
            throw new Error(`Invalid position ${position} for inserting into table with length ${self.data.length}`);
        }
        let computedRow = await schemaUtil.computeValues(validJson, docId, graph);
        self.data.splice(position, 0, computedRow);
        return computedRow;
    }
    self.internalDeleteRow = async function (rowId) {
        let position = self.data.findIndex(row => row.truid === rowId);
        self.data.splice(position, 1);
    }
    self.internalUpdateRow = async function (validJson, graph) {
        let rowId = validJson.truid;
        if(!rowId){
            return await self.internalInsert(validJson, graph);
        }
        let rowToUpdate = self.data.find(row => row.truid === rowId);
        if(!rowToUpdate){
            return await self.internalInsert(validJson, graph);
        }
        let computedRow = await schemaUtil.computeValues(validJson, docId, graph);
        for(let key in computedRow){
            if(key === "truid"){
                continue;
            }
            rowToUpdate[key] = computedRow[key];
        }
        return computedRow;
    }

    self.exwipe = async function (inputValues, parsedCommand, currentDocId, graph, buildInstance) {
        let newTableId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
        let newTable = new Table(currentDocId, newTableId);
        await newTable.init(...self.columnDescription);
        let testRowCommand = `${currentDocId}_${inputValues[0]}`;
        for(let i = 0; i < self.data.length; i++){
            let row = self.data[i];
            //$$.debug("table", "Type of row", typeof row, "row", JSON.stringify(row));
            let result = await graph.runCustomCommand(currentDocId, testRowCommand, row);
            if(result && result !== "false"){
                await newTable.internalInsert(row, graph);
            }
        }
        self.data = [];
        //$$.debug("table",">>>>>> Status of host data", self.data.length, "status of new table", newTable.data.length);
        await varUtil.setVarValue(newTableId, newTable);
        await varUtil.setVarValue(this.varId, self);
        return newTable;
    }
//TODO upsert expects a table as input
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
                    row[key] = await schemaUtil.computeValues(inputTable.data[i][key], currentDocId, graph);
                }
            } else {
                self.data.push(await schemaUtil.computeValues(inputTable.data[i], currentDocId, graph));
            }
        }
        await varUtil.setVarValue(tableVarId, self);
        await varUtil.markAsReferenceToVariable(parsedCommand.outputVars[0], tableVarId, currentDocId);
        return self;
    }
}

$$.registerCustomType("Table", Table);
