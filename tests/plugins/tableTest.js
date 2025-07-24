import {} from "../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
let table = $$.loadPlugin("Table");

let script = `
    @t1 new Table "c1" "c2" "c3" "c4: math c2 * c3" 
    `;
let docId = await workspace.runCode(script);
let varName = "t1";
await table.insert(docId, varName , {c1: "a", c2: 2, c3: 10});
let tableVar = await workspace.getVarValue(docId, varName);
await $$.checkValue(tableVar.data[0].c4, 20);

await table.insert(docId, varName , {c1: "b", c2: 3, c3: 5});
tableVar = await workspace.getVarValue(docId, varName);
$$.checkValue(tableVar.data[1].c4, 15);

tableVar.data[1].c3 = 7;
await table.updateRow(docId, varName, tableVar.data[1]);
$$.checkValue(tableVar.data[1].c4, 21);

await table.insert(docId, varName , {c1: "c", c2: 4, c3: 8}, 0);
tableVar = await workspace.getVarValue(docId, varName);
$$.checkValue(tableVar.data[0].c4, 32);

await table.deleteRow(docId, varName, tableVar.data[1].truid);
tableVar = await workspace.getVarValue(docId, varName);
$$.checkValue(tableVar.data[1].c1, "b");

console.log(tableVar);

await $$.endTest();
