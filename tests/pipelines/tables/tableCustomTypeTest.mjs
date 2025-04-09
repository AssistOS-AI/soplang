import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();
let allOk = true;

function Table() {
    let self = this;
    self.columns = []; // Column names
    self.data = [];    // Array of objects

    function assertIsTable() {
        if (!self.columns || self.columns.length === 0) {
            console.error("Not a good table definition: empty definition");
            return false;
        }
        return true;
    }

    function pseudoJsonToValidJson(pseudoJson) {
        const split = pseudoJson.split(",");
        const result = {};
        split.forEach(item => {
            let trimmed = item.trim();
            const [key, value] = trimmed.split(":");
            result[key.trim()] = value.trim();
        });
        return result;
    }


    // Helper function to extract an area from the table
    function extractArea(lines_range, columns_range) {
        let res = [];

        if (lines_range === undefined || lines_range === "" || lines_range === null) {
            lines_range = "0-" + (self.data.length - 1);
        }

        if (columns_range === undefined || columns_range === "" || columns_range === null) {
            columns_range = "0-" + (self.columns.length - 1);
        }

        // Parse line range
        let firstLine, lastLine;
        let columnsList = [];

        if (typeof lines_range === "string") {
            if (lines_range.includes("-")) {
                let range = lines_range.split("-");
                firstLine = parseInt(range[0]);
                lastLine = parseInt(range[1]);
                if (isNaN(lastLine) || lastLine >= self.data.length || lastLine < 0) {
                    lastLine = self.data.length - 1;
                }
                if (isNaN(firstLine) || firstLine > lastLine) {
                    console.error("Invalid line range:", lines_range);
                    return res;
                }
            } else {
                let value = parseInt(lines_range);
                if (isNaN(value)) {
                    console.error("Invalid line range:", lines_range);
                    return res;
                }
                firstLine = value;
                lastLine = value;
            }
        } else {
            firstLine = 0;
            lastLine = self.data.length - 1;
        }

        // Parse column range
        if (typeof columns_range === "string") {
            if (columns_range.includes(",")) {
                columnsList = columns_range.split(",").map(col => col.trim());
            } else if (columns_range.includes("-")) {
                let range = columns_range.split("-");
                let firstColumn = parseInt(range[0]);
                let lastColumn = parseInt(range[1]);

                if (isNaN(firstColumn) || isNaN(lastColumn) || firstColumn > lastColumn ||
                    firstColumn < 0 || lastColumn >= self.columns.length) {
                    console.error("Invalid column range:", columns_range);
                    return res;
                }

                for (let col = firstColumn; col <= lastColumn; col++) {
                    columnsList.push(self.columns[col]);
                }
            } else {
                // Single column (name or index)
                let colNo = parseInt(columns_range);
                if (isNaN(colNo)) {
                    columnsList.push(columns_range);
                } else {
                    if (colNo >= 0 && colNo < self.columns.length) {
                        columnsList.push(self.columns[colNo]);
                    } else {
                        console.error("Invalid column index:", colNo);
                        return res;
                    }
                }
            }
        } else if (typeof columns_range === "number") {
            if (columns_range >= 0 && columns_range < self.columns.length) {
                columnsList.push(self.columns[columns_range]);
            } else {
                console.error("Invalid column index:", columns_range);
                return res;
            }
        }

        // Validate self.columns list
        if (columnsList.length === 0) {
            console.error("Invalid column range:", columns_range);
            return res;
        }

        // Extract self.data based on ranges
        if (lastLine >= self.data.length) {
            lastLine = self.data.length - 1;
        }

        // Return rows with selected self.columns
        for (let line = firstLine; line <= lastLine; line++) {
            if (self.data[line] === undefined) {
                console.error("Invalid line number:", line);
                continue;
            }

            // If extracting a single column and it's a direct access (not a single column of multiple rows)
            if (columnsList.length === 1 && firstLine === lastLine) {
                res.push(self.data[line][columnsList[0]]);
            } else {
                // Otherwise extract all requested self.columns from this row
                const rowObj = {};
                for (const col of columnsList) {
                    if (col in self.data[line]) {
                        rowObj[col] = self.data[line][col];
                    }
                }
                res.push(rowObj);
            }
        }

        return res;
    }

    self.init = async function(...args) {
        self.columns = args;
    }

    self.restore = async function(JSONSerialisation) {
        if (JSONSerialisation) {
            self.columns = JSONSerialisation.columns || [];
            self.data = JSONSerialisation.data || [];
        }
    }

    self.getRuntimeValue = async function() {
        return {
            tableHeader: self.columns,
            tableData: self.data
        };
    }

    self.setData = async function(inputValues, outputValues, currentDocId, workspace) {
        // Handle direct array input
        if (Array.isArray(inputValues[0])) {
            self.data = [...inputValues[0]];
        }
        // Handle JSON string input
        else if (typeof inputValues[0] === 'string' && inputValues[0].startsWith('[')) {
            try {
                // Convert single quotes to double quotes for proper JSON parsing
                let jsonStr = inputValues[0].replace(/'/g, '"');
                self.data = JSON.parse(jsonStr);
            } catch (error) {
                console.error("Error parsing JSON self.data:", error);
            }
        }

        // If there's self.data and self.columns are not yet determined, extract them from the first row
        if (self.data.length > 0 && self.columns.length === 0) {
            self.columns = Object.keys(self.data[0]);
        }

        return true;
    }

    self.getData = async function(inputValues, outputValues, currentDocId, workspace) {
        return self.data;
    }

    self.getColumns = async function(inputValues, outputValues, currentDocId, workspace) {
        return self.columns;
    }

    // Area extraction function
    self.area = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return [];

        const lines_range = inputValues[0];
        const columns_range = inputValues[1];

        return extractArea(lines_range, columns_range);
    }

    // Extract a single column
    self.column = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return [];

        const columnNameOrNumber = inputValues[0];
        return extractArea(undefined, columnNameOrNumber);
    }

    // Alias for column
    self.col = self.column;

    // Extract a single row
    self.row = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return null;

        const rowNumber = inputValues[0];
        return extractArea(rowNumber, undefined);
    }

    // Alias for row
    self.line = self.row;

    // Filter the table
    self.filter = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return [];

        const JSFilterCode = inputValues[0];
        const lines_range = inputValues[1];
        const columns_range = inputValues[2];

        try {
            const filterFunc = new Function("item", JSFilterCode);

            // Get self.data to filter
            let dataToFilter;
            if (lines_range || columns_range) {
                dataToFilter = extractArea(lines_range, columns_range);
            } else {
                dataToFilter = self.data;
            }

            return dataToFilter.filter(filterFunc);
        } catch (error) {
            console.error("Error in filter function:", error);
            return [];
        }
    }

    // Reduce function
    self.reduce = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return inputValues[1] || 0;

        const JSReduceCode = inputValues[0];
        const accumulatorInitialValue = inputValues[1];
        const lines_range = inputValues[2];
        const columns_range = inputValues[3];

        try {
            const reduceFunc = new Function("acc", "item", JSReduceCode);

            // Get self.data to reduce
            let dataToReduce;
            if (lines_range || columns_range) {
                dataToReduce = extractArea(lines_range, columns_range);
            } else {
                dataToReduce = self.data;
            }

            return dataToReduce.reduce(reduceFunc, accumulatorInitialValue);
        } catch (error) {
            console.error("Error in reduce function:", error);
            return accumulatorInitialValue;
        }
    }

    // Sum values
    self.sum = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) {
            return 0;
        }
        // If first argument is an array, sum that directly
        if (Array.isArray(inputValues[0])) {
            return inputValues[0].reduce((acc, item) => {
                if (typeof item === 'object') {
                    return acc + Object.values(item).reduce((objSum, val) => {
                        const num = parseFloat(val);
                        return objSum + (isNaN(num) ? 0 : num);
                    }, 0);
                } else {
                    const num = parseFloat(item);
                    return acc + (isNaN(num) ? 0 : num);
                }
            }, 0);
        }

        // Otherwise interpret as lines_range and columns_range
        const lines_range = inputValues[1];
        const columns_range = inputValues[2];

        // Simple lambda for summing
        const lambda = function(acc, item) {
            const val = parseFloat(item);
            return acc + (isNaN(val) ? 0 : val);
        };

        // Get the area to sum
        const areaToSum = extractArea(lines_range, columns_range);

        // Convert area objects to flat values for summing
        const flatValues = [];
        for (const item of areaToSum) {
            if (typeof item === 'object') {
                Object.values(item).forEach(val => flatValues.push(val));
            } else {
                flatValues.push(item);
            }
        }

        const result = flatValues.reduce(lambda, 0);
        return result;
    }

    // Calculate minimum value
    self.min = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return null;

        const lines_range = inputValues[0];
        const columns_range = inputValues[1];

        // Lambda for minimum calculation
        const lambda = function(acc, item) {
            const val = parseFloat(item);
            if (isNaN(val)) return acc;
            return acc === undefined || val < acc ? val : acc;
        };

        // Get the area to search
        const areaToSearch = extractArea(lines_range, columns_range);

        // Extract flat array of values
        const flatValues = [];
        for (const item of areaToSearch) {
            if (typeof item === 'object') {
                Object.values(item).forEach(val => flatValues.push(val));
            } else {
                flatValues.push(item);
            }
        }

        return flatValues.reduce(lambda, undefined);
    }

    // Calculate maximum value
    self.max = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return null;

        const lines_range = inputValues[0];
        const columns_range = inputValues[1];

        // Lambda for maximum calculation
        const lambda = function(acc, item) {
            const val = parseFloat(item);
            if (isNaN(val)) return acc;
            return acc === undefined || val > acc ? val : acc;
        };

        // Get the area to search
        const areaToSearch = extractArea(lines_range, columns_range);

        // Extract flat array of values
        const flatValues = [];
        for (const item of areaToSearch) {
            if (typeof item === 'object') {
                Object.values(item).forEach(val => flatValues.push(val));
            } else {
                flatValues.push(item);
            }
        }

        return flatValues.reduce(lambda, undefined);
    }

    // Calculate average
    self.avg = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return 0;

        const lines_range = inputValues[0];
        const columns_range = inputValues[1];

        // Get the area to calculate average for
        const areaToAvg = extractArea(lines_range, columns_range);

        // Extract flat array of values
        const flatValues = [];
        for (const item of areaToAvg) {
            if (typeof item === 'object') {
                Object.values(item).forEach(val => {
                    const num = parseFloat(val);
                    if (!isNaN(num)) flatValues.push(num);
                });
            } else {
                const num = parseFloat(item);
                if (!isNaN(num)) flatValues.push(num);
            }
        }

        return flatValues.length > 0 ?
            flatValues.reduce((sum, val) => sum + val, 0) / flatValues.length : 0;
    }

    // Set value at specific position
    self.setAt = async function(inputValues, outputValues, currentDocId, workspace) {
        if (!assertIsTable()) return false;

        const lineNo = parseInt(inputValues[0]);
        let colName = inputValues[1];
        const value = inputValues[2];

        if (isNaN(lineNo) || lineNo < 0 || lineNo >= self.data.length) {
            console.error("Invalid line number:", lineNo);
            return false;
        }

        // Handle column as number (index) or name
        const colIndex = parseInt(colName);
        if (!isNaN(colIndex) && colIndex >= 0 && colIndex < self.columns.length) {
            colName = self.columns[colIndex];
        }

        if (!self.columns.includes(colName)) {
            console.error("Column not found:", colName);
            return false;
        }

        self.data[lineNo][colName] = value;
        return true;
    }

    // Append rows to the table - similar to tableUtil.js
    self.append = async function(inputValues, outputValues, currentDocId, workspace) {
        let validJson;
        try {
            let pseudoJson = inputValues[0];
            validJson = pseudoJsonToValidJson(pseudoJson);
        } catch (error) {
            console.error("Error parsing JSON self.data:", error);
            return;
        }
        self.data.push(validJson);  
    }
}

let testScript = `
    @t1 new Table "c1" "c2" "c3" "c4" "c5"
    t1.append "c1:'a', c2:1, c3:10, c4:0, c5:1"
    t1.append "c1:'b', c2:100, c3:1000, c4:0, c5:1"
    t1.append "c1:'c', c2:10000, c3:100000, c4:0, c5:1"
    t1.append "c1:'d', c2:1000000, c3:10000000, c4:0, c5:1"
    t1.append "c1:'3', c2:'xxx', c3:'yyy', c4:0, c5:1"
    @area1 t1.area "2-3" "2-3"
    @s1 t1.sum $area1
    
    @sarea1 t1.sum $t1 "2-3" "1-3"
    @sarea1_cn t1.sum $t1 "2-3" "c2,c3,c4"
    
    @area2 t1.area "3" "2-4"
    @s2 t1.sum $area2
    
    @area3 t1.area "2-3" "4"
    @s3 t1.sum $area3
        
    @col_c2 t1.column "c2"
    @s_col_c2 t1.sum $col_c2
`;

// # Testing append method
// @new_row t1.append "c1:'z', c2:5000, c3:50000, c4:0, c5:1"
// @after_append t1.getData
//
// @min_c2 t1.min "" "c2"
// @max_c3 t1.max "" "c3"
// @avg_c2 t1.avg "" "c2"
//
// @set_val t1.setAt "0" "c2" "999"
// @c2_after_set t1.column "c2"

await workspace.defineCustomType("Table", Table);

let docId = await workspace.runScript(testScript);

await workspace.buildAll();
await graph.printGraph();

await $$.check(docId, "s1", 10100000);
await $$.check(docId, "s2", 10000001);
await $$.check(docId, "s3", 2);
await $$.check(docId, "sarea1_cn", 11110000);
await $$.check(docId, "sarea1", 11110000);

await workspace.shutDown();
console.log("All tests passed:", $$.allOk ? "true" : "false");