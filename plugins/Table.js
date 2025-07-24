async function Table() {
    let self = {};
    let workspace = $$.loadPlugin("Workspace");
    let graph = workspace.getGraph();

    self.insert = async function (docId, varName, row, position) {
        let tableValue = await workspace.getVarValue(docId, varName);
        let computedRow = await tableValue.internalInsert(row, graph, position);
        await workspace.setVarValue(docId, varName, tableValue);
        return computedRow;
    };
    self.deleteRow = async function (docId, varName, rowId) {
        let tableValue = await workspace.getVarValue(docId, varName);
        await tableValue.internalDeleteRow(rowId, graph);
        await workspace.setVarValue(docId, varName, tableValue);
    }
    self.updateRow = async function (docId, varName, row) {
        let tableValue = await workspace.getVarValue(docId, varName);
        return await tableValue.internalUpdateRow(row, graph);
    };

    return self;
}

let singletonInstance = undefined;

export async function getInstance() {
    if (!singletonInstance) {
        singletonInstance = await Table();
    }
    return singletonInstance;
}

export function getAllow() {
    return async function (globalUserId, email, command, ...args) {
        return true;
    };
}

export function getDependencies() {
    return ["DefaultPersistence", "Workspace"];
}