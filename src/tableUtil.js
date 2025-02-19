function Table(definition, data){
    let columnsNumber  = {};
    let clonedData = structuredClone(data);
    let self = this;

    for(let i = 0; i < definition.length; i++){
        columnsNumber[definition[i]] = i;
    }

    /******************************** private functions */
    function assertIsTable(){
        if(!definition || definition.length === 0){
            $$.throwError("Not a good table definition: empty definition");
        }
    }

    function isArray(){
        return !definition || definition.length === 0;
    }

    function getColNo(colDescription){
        if(Number.isInteger(colDescription) && colDescription >= 0 && colDescription < definition.length){
            return colDescription;
        }
        if(typeof colDescription === 'string' && columnsNumber[colDescription] !== undefined){
            return columnsNumber[colDescription];
        }
        $$.throwError("Unknown column description '" + colDescription + "'");
    }

    function createLambda(argsString, JSCodeAsString){
        let code = "(function(" + argsString +"){" + JSCodeAsString + "})";
        console.debug("Defining function:", code);
        return eval(code);
    }

    function extractArea(lines_range, columns_range){
        let res = [];
        //lines_range could be a single number or number1 - number2
        let firstLine;
        let lastLine;
        let columns = [];

        if(lines_range.includes("-")) {
            let range = lines_range.split("-");
            firstLine = parseInt(range[0]);
            lastLine = parseInt(range[1]);
        } else{
            let value = parseInt(lines_range);
            firstLine = value;
            lastLine = value;
        }

        if(columns_range.includes(",")){

        }
        else if(columns_range.includes("-")){
            let range = columns_range.split("-");
            let firstColumn = range[0];
            let lastColumn = range[1];
             for(let col = firstColumn; col <= lastColumn; col++){
                 columns.push(getColNo(col));
             }
        } else {
            let colNo = parseInt(columns_range);
            if(isNaN(colNo)){
                columns.push(columns_range);
            } else {
                columns.push(definition[colNo]);
            }
        }

        for(let line = firstLine; line <= lastLine; line++){
            for(let col of columns){
                res.push(clonedData[line][col]);
            }
        }

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
    }

    /* extracts a column as an array value*/
    this.column = function(columnNameOrNumber){
        assertIsTable();
    }

    /* extracts a row as an array value*/
    this.row = function(lineNumber){
        assertIsTable();
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
            return acc + item;
        };
        return internalReduce(lambda, 0, lines_range, columns_range);
    }

    this.min = function(lines_range, columns_range){
        let lambda = function(acc, item){
            return (acc === undefined || item < acc) ? item : acc;
        };
        return internalReduce(lambda, undefined, lines_range, columns_range);
    }

    this.max = function(lines_range, columns_range){
        let lambda = function(acc, item){
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


    this.replace = function(lineNo, columnDesc, value){
        assertIsTable();
        let line = clonedData[lineNo];
        line[getColNo(columnDesc)] = value;
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


module.exports = {
    getTable: function(definition, data){
        return new Table();
    }
}