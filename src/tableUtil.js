function Table(headerArray, data){

    if(data.tableHeader ){
        $$.throwError("Data should not contain the table header");
    }
    let clonedData = structuredClone(data);

    /******************************** private functions */
    function assertIsTable(){
        if(!headerArray || headerArray.length === 0){
            $$.throwError("Not a good table definition: empty definition");
        }
    }

    function isArray(){
        return !headerArray || headerArray.length === 0;
    }

    function getColName(colNumber){
        colNumber = parseInt(colNumber)
        if(isNaN(colNumber) || colNumber < 0 || colNumber >= headerArray.length){
            $$.throwError("Invalid column number: " + colNumber);
        }
        return headerArray[colNumber];
    }

    function createLambda(argsString, JSCodeAsString){
        let code = "(function(" + argsString +"){" + JSCodeAsString + "})";
        console.debug("Defining function:", code);
        return eval(code);
    }

    function extractArea(lines_range, columns_range){
        let res = [];

        if(lines_range === undefined || lines_range === "" || lines_range === null) {
            lines_range = "0-" + clonedData.length-1;
        }

        if(columns_range === undefined || columns_range === "" || columns_range === null) {
            columns_range = "0-" + headerArray.length-1;
        }

        console.debug(">>>>> Extracting area function:", lines_range, columns_range);
        //lines_range could be a single number or number1 - number2
        let firstLine;
        let lastLine;
        let columns = [];

        function registerColumn(colName){
            if(columns.includes(colName)){
                $$.throwError("Column " + colName + " already registered");
            }
            if(colName === undefined || colName === "" || colName === null) {
                $$.throwError("Invalid column name: " + colName);
            }
            columns.push(colName);
        }

        if(typeof lines_range === "string"){
            if(lines_range.includes("-")) {
                let range = lines_range.split("-");
                firstLine = parseInt(range[0]);
                lastLine = parseInt(range[1]);
                if(isNaN(lastLine) || lastLine >= clonedData.length || lastLine < 0){
                    lastLine = clonedData.length -1;
                }

                if(isNaN(firstLine) || firstLine > lastLine){
                    $$.throwError("Invalid line range: " + lines_range + "Max range is between 0 and " + clonedData.length );
                }
            } else{
                let value = parseInt(lines_range);
                if(isNaN(value)){
                    $$.throwError("Invalid line range: " + lines_range);
                }
                firstLine = value;
                lastLine = value;
            }
        } else {
            firstLine = 0;
            lastLine = clonedData.length -1;
        }


        if(typeof columns_range === "string"){
            if(columns_range.includes(",")){
                columns_range.split(",").forEach(col => {
                    registerColumn(col);
                })
            }
            else if(columns_range.includes("-")){
                let range = columns_range.split("-");
                let firstColumn = parseInt(range[0]);
                let lastColumn = parseInt(range[1]);

                if(isNaN(firstColumn) || isNaN(lastColumn) || firstColumn > lastColumn || firstColumn < 0 || lastColumn >= headerArray.length){
                    $$.throwError("Invalid column range: " + columns_range);
                }
                for(let col = firstColumn; col <= lastColumn; col++){
                    registerColumn(getColName(col));
                }
            } else {
                let colNo = parseInt(columns_range);
                if(isNaN(colNo)){
                    registerColumn(columns_range);
                } else {
                    console.debug("Registering column with number #", colNo);
                    registerColumn(headerArray[colNo]);
                }
            }
        } else {
            if(typeof columns_range === "number"){
                registerColumn(headerArray[columns_range]);
            } else {
                $$.throwError("Invalid column range: " + columns_range);
            }
        }

        if(columns.length === 0 || columns[0] === undefined){
            $$.throwError("Invalid column range: " + columns_range + columns.join("|"));
        }

        if(lastLine >= clonedData.length){
            lastLine = clonedData.length - 1;
        }

        for(let line = firstLine; line <= lastLine; line++){
            if(clonedData[line] === undefined){
                $$.throwError("Invalid line number: " + line);
            }
            for(let col of columns){
                res.push(clonedData[line][col]);
            }
        }

        console.debug("Extracting area with columns identified:", lines_range, columns_range, "Columns", columns, "Resulted in: ", res);
        return res;
    }

    function internalReduce(lambda, accumulatorInitialValue, lines_range, columns_range){
        let arr;
        if(isArray()){
            arr = clonedData;
        } else {
            arr = extractArea(lines_range, columns_range);
        }
        return arr.reduce(lambda, accumulatorInitialValue)
    }

    /******************************** public functions *********************************/
    this.area = function( lines_range, columns_range){
        assertIsTable();
        return extractArea(lines_range, columns_range);
    }

    /* extracts a column as an array value*/
    this.column = function(columnNameOrNumber){
        assertIsTable();
        return extractArea(undefined, columnNameOrNumber)
    }

    /* extracts a row as an array value*/
    this.row = function(rowNumber){
        assertIsTable();
        return extractArea(rowNumber, undefined)
    }

    this.line = this.row;

    /*
        returns an array with values that satisfy the JSFilterCode
     */
    this.filter = function(JSFilterCode, lines_range, columns_range){
        let lambda = createLambda("item", JSFilterCode);
        let arr;
        if(isArray()){
            arr = clonedData;
        } else {
             arr = extractArea(lines_range, columns_range);
        }
        return arr.filter(lambda);
    }


    /* takes all values and apply JSReduceCode, returns a single value */
    this.reduce = function(JSReduceCode, accumulatorInitialValue,  lines_range, columns_range){
        let lambda = createLambda("acc, item", JSReduceCode);
        return internalReduce(lambda, accumulatorInitialValue, lines_range, columns_range);
    }

    this.sum = function(lines_range, columns_range){
        let lambda = function(acc, item){
            item = parseFloat(item);
            return acc + item;
        };
        return internalReduce(lambda, 0, lines_range, columns_range);
    }

    this.min = function(lines_range, columns_range){
        let lambda = function(acc, item){
            item = parseFloat(item);
            return (acc === undefined || item < acc) ? item : acc;
        };
        return internalReduce(lambda, undefined, lines_range, columns_range);
    }

    this.max = function(lines_range, columns_range){
        let lambda = function(acc, item){
            item = parseFloat(item);
            return (acc === undefined || item > acc) ? item : acc;
        };
        return internalReduce(lambda, undefined, lines_range, columns_range);
    }

    this.avg = function(lines_range, columns_range){
        let arr;
        if(isArray()){
            arr = clonedData;
        } else {
            arr = extractArea(lines_range, columns_range);
        }
        return arr.reduce((acc, item) => acc + item, 0) / arr.length;
    }

    /* takes all values and apply JSMapCode, return values for a new table*/
    this.map = function(JSMapCode, lines_range, columns_range ){
        $$.throwError("Not implemented");
    }

    this.setAt = function(lineNo, columnDesc, value){
        assertIsTable();
        let line = clonedData[lineNo];
        let colName = parseInt(columnDesc);
        if(isNaN(colName)){
            colName = columnDesc;
        }
        line[getColName(colName)] = value;
        return clonedData;
    }

    this.fresher = function(otherTable){

    }

    this.append = function(newValues){
        assertIsTable();
        let newArr = [...clonedData];
        newValues.forEach(value => {
            newArr.push(value);
        })
        return newArr;
    }
}

function createTable(inputValues){
    if(!inputValues[0]){
        $$.throwError("Not a proper table or array");
    }
    let value = inputValues[0].tableData;
    let header = inputValues[0].tableHeader;
    if(!header){
        value = inputValues[0];
    }
    return  new Table(header, value);
}

let tableCommands = {
    table: async function (inputValues, outputValues, varContext) {
        //input variables represents the table's description
        console.debug(">>>>>Table definition:", inputValues, varContext);
        throw "Mush be never called as it is just a definition ";
    },
    area: async function (inputValues) {
        if(!inputValues[0] || !inputValues[0].tableHeader){
            $$.throwError("Not a proper table ");
        }
        let table = new Table(inputValues[0].tableHeader, inputValues[0].tableData);
        return table.area(inputValues[1], inputValues[2]);
    },
    row: async function (inputValues) {
        if(!inputValues[0] || !inputValues[0].tableHeader){
            $$.throwError("Not a proper table ");
        }
        let table = new Table(inputValues[0].tableHeader, inputValues[0].tableData);
        return table.row(inputValues[1]);
    },
    column: async function (inputValues) {
        if(!inputValues[0] || !inputValues[0].tableHeader){
            $$.throwError("Not a proper table ");
        }
        let table = new Table(inputValues[0].tableHeader, inputValues[0].tableData);
        return table.column(inputValues[1]);
    },
    filter: async function (inputValues) {
        let table = createTable(inputValues);
        return table.filter(inputValues[1], inputValues[2], inputValues[3]);
    },
    reduce: async function (inputValues) {
        let table = createTable(inputValues);
        return table.reduce(inputValues[1], inputValues[2], inputValues[3]);
    },
    sort: async function (inputValues) {
        let table = createTable(inputValues);
        return table.sort(inputValues[1], inputValues[2], inputValues[3]);
    },
    sum: async function (inputValues) {
        let table = createTable(inputValues);
        return table.sum(inputValues[1], inputValues[2], inputValues[3]);
    },
    avg: async function (inputValues) {
        let table = createTable(inputValues);
        return table.avg(inputValues[1], inputValues[2], inputValues[3]);
    },
    max: async function (inputValues) {
        let table = createTable(inputValues);
        return table.max(inputValues[1], inputValues[2], inputValues[3]);
    },
    min: async function (inputValues) {
        let table = createTable(inputValues);
        return table.min(inputValues[1], inputValues[2], inputValues[3]);
    },
    setCell: async function (inputValues) {
        $$.throwError("Not implemented");
    },
    getCell: async function (inputValues) {
        $$.throwError("Not implemented");
    },
    append: async function (inputValues) {
        $$.throwError("Not implemented");
    }
}

tableCommands.line = tableCommands.row;

module.exports = {
    tableCommands: tableCommands,
    getTable: function(headerDefinition, data){
        return new Table(headerDefinition, data);
    }
}