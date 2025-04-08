import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();
let allOk = true;

function Table() {
    let self = this;
    self.columns = [];
    self.data = [];

    this.init = async function(...args) {
        self.columns = args;
    }

    this.restore = async function(JSONSerialisation) {
        if (JSONSerialisation) {
            self.columns = JSONSerialisation.columns || [];
            self.data = JSONSerialisation.data || [];
        }
    }

    this.getRuntimeValue = async function() {
        return {
            tableHeader: self.columns,
            tableData: self.data
        };
    }

    this.addRow = async function(inputValues, outputValues, currentDocId, workspace) {
        const newRow = {};
        // Map each input value to the corresponding column
        for (let i = 0; i < inputValues.length && i < self.columns.length; i++) {
            newRow[self.columns[i]] = inputValues[i];
        }
        self.data.push(newRow);
        return true;
    }

    this.setData = async function(inputValues, outputValues, currentDocId, workspace) {
        self.data = inputValues[0];
        return true;
    }

    this.getData = async function(inputValues, outputValues, currentDocId, workspace) {
        return self.data;
    }

    this.getColumns = async function(inputValues, outputValues, currentDocId, workspace) {
        return self.columns;
    }

    this.area = async function(inputValues, outputValues, currentDocId, workspace) {
        const rowRange = inputValues[0];
        const colRange = inputValues[1];

        let startRow, endRow, selectedColumns;

        // Parse row range (zero-based indexing now)
        if (rowRange.includes('-')) {
            [startRow, endRow] = rowRange.split('-').map(Number);
        } else {
            startRow = endRow = parseInt(rowRange);
        }

        // Parse column range
        if (colRange.includes('-')) {
            const [startCol, endCol] = colRange.split('-').map(Number);
            selectedColumns = self.columns.slice(startCol, endCol + 1);
        } else if (colRange.includes(',')) {
            selectedColumns = colRange.split(',').map(c => c.trim());
        } else {
            // Single column
            const colIndex = parseInt(colRange);
            if (!isNaN(colIndex)) {
                selectedColumns = [self.columns[colIndex]];
            } else {
                selectedColumns = [colRange];
            }
        }

        const result = [];
        // Collect rows in the specified range (already zero-based)
        for (let i = startRow; i <= endRow && i < self.data.length; i++) {
            if (i < 0) continue;

            const row = self.data[i];
            if (!row) continue;

            const newRow = {};
            for (const colName of selectedColumns) {
                if (colName in row) {
                    newRow[colName] = row[colName];
                }
            }
            result.push(newRow);
        }

        return result;
    }

    this.column = async function(inputValues, outputValues, currentDocId, workspace) {
        const colName = inputValues[0];
        return self.data.map(row => row[colName]);
    }

    this.sum = async function(inputValues, outputValues, currentDocId, workspace) {
        let target = inputValues[0];
        let rowRange = inputValues[1];
        let colRange = inputValues[2];

        // Handle direct array input (from column or area methods)
        if (Array.isArray(target)) {
            return target.reduce((sum, item) => {
                if (typeof item === 'object') {
                    // Sum all numeric properties in the object
                    return sum + Object.values(item).reduce((objSum, val) => {
                        const num = parseFloat(val);
                        return objSum + (isNaN(num) ? 0 : num);
                    }, 0);
                } else {
                    // Sum simple numeric value
                    const num = parseFloat(item);
                    return sum + (isNaN(num) ? 0 : num);
                }
            }, 0);
        }

        // Handle table input (has getRuntimeValue or is already in table format)
        if (target && (target.getRuntimeValue || (target.tableHeader && target.tableData))) {
            let tableData = target.getRuntimeValue ?
                (await target.getRuntimeValue()).tableData :
                target.tableData;

            // If row and column ranges specified, extract that area first
            if (rowRange && colRange) {
                const areaResult = await this.area([rowRange, colRange], outputValues, currentDocId, workspace);
                return this.sum([areaResult], outputValues, currentDocId, workspace);
            }

            // If only column range specified
            else if (colRange) {
                let selectedColumns;

                if (colRange.includes(',')) {
                    selectedColumns = colRange.split(',').map(c => c.trim());
                } else if (colRange.includes('-')) {
                    const [startCol, endCol] = colRange.split('-').map(Number);
                    selectedColumns = self.columns.slice(startCol - 1, endCol);
                } else {
                    // Single column
                    selectedColumns = [colRange];
                }

                // Sum all values in the selected columns across all rows
                return tableData.reduce((sum, row) => {
                    return sum + selectedColumns.reduce((colSum, colName) => {
                        const val = parseFloat(row[colName]);
                        return colSum + (isNaN(val) ? 0 : val);
                    }, 0);
                }, 0);
            }

            // Default: sum all numeric values in the table
            return tableData.reduce((sum, row) => {
                return sum + Object.values(row).reduce((rowSum, val) => {
                    const num = parseFloat(val);
                    return rowSum + (isNaN(num) ? 0 : num);
                }, 0);
            }, 0);
        }

        // Fallback
        return 0;
    }
}

let testScript = `
    @t1 new Table "c1" "c2" "c3" "c4" "c5"
    @r1 t1.addRow "a" "1" "10" "0" "1"
    @r2 t1.addRow "b" "100" "1000" "0" "1"
    @r3 t1.addRow "c" "10000" "100000" "0" "1"
    @r4 t1.addRow "d" "1000000" "10000000" "0" "1"
    @r5 t1.addRow "3" "xxx" "yyy" "0" "1"
    
    @area1 t1.area "2-3" "2-3"
    @s1 t1.sum $area1
    
    @sarea1 t1.sum $t1 "2-3" "c2,c3,c4"
    @sarea1_cn t1.sum $t1 "2-3" "c2,c3,c4"
    
    @area2 t1.area "3" "2-4"
    @s2 t1.sum $area2
    
    @area3 t1.area "2-3" "4"
    @s3 t1.sum $area3
    
    @sc2 t1.sum $t1 "" "c2"
    
    @col_c2 t1.column "c2"
    @s_col_c2 t1.sum $col_c2
`;

await workspace.defineCustomType("Table", Table);

let docId = await workspace.runScript(testScript);

await workspace.buildAll();
await graph.printGraph();

// Verify results
await $$.check(docId, "s1", 10100000);
await $$.check(docId, "s2", 10000001);
await $$.check(docId, "s3", 2);
await $$.check(docId, "sarea1_cn", 11110000);
await $$.check(docId, "sarea1", 11110000);

await workspace.shutDown();
console.log("All tests passed:", $$.allOk ? "true" : "false");