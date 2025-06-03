import {} from "../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");
let table = await $$.loadPlugin("Table");

let script = `
    @t1 new Table "c1" "c2" "c3" "c4: math c2 * c3" 
    `;
let docId = await workspace.runCode(script);
let varId = "t1";
await table.insert(docId, varId , {c1: "a", c2: 2, c3: 10});
let tableVar = await workspace.getVarValue(docId, varId);

await $$.checkValue(tableVar.data[0].c4, 20);

await table.insert(docId, varId , {c1: "b", c2: 3, c3: 5});
tableVar = await workspace.getVarValue(docId, varId);

await $$.checkValue(tableVar.data[1].c4, 15);
tableVar.data[1].c3 = 7;
await table.updateRow(docId, varId, tableVar.data[1]);

await $$.checkValue(tableVar.data[1].c4, 21);

await table.insert(docId, varId , {c1: "c", c2: 4, c3: 8}, 0);
tableVar = await workspace.getVarValue(docId, varId);
await $$.checkValue(tableVar.data[0].c4, 32);

console.log(tableVar);

await $$.endTest();
