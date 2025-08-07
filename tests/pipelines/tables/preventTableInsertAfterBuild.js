import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
import assert from "assert";
let documents = $$.loadPlugin("Documents");

const doc = await documents.createDocument("docId", "category", "title");
const commands = `
    @table new Table from message
    @sourceTable new Table from message
    
    @res table.upsert John Hello
    
    @res2 sourceTable.upsert 'sop:object:{"from":"Michael","message":"Hi"}'
    
    @res3 table.upsert $sourceTable
`;

await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, commands, doc.comments);
await workspace.buildOnlyForDocument(doc.docId);
let graph = workspace.getGraph();
console.log((await graph.varDump("docId/table")).info);
console.log((await graph.varDump("docId/res")).info);

await $$.checkDocVar(doc.docId, "res", {from: "John", message:"Hello", truid: "TRUID_1"});
await $$.checkDocVar(doc.docId, "res2", {from: "Michael", message:"Hi", truid: "TRUID_2"});

let table = await workspace.getVarValue(doc.docId, "table");

let tableRes = [{from: "John", message:"Hello", truid: "TRUID_1"},{from: "Michael", message:"Hi", truid: "TRUID_2"}];
//assert(table.data.length === 2, `expected table data length to be 2, but got ${table.data.length}`);
// for(let i = 0; i < table.data.length; i++) {
//     assert(table.data[i], tableRes[i], `expected table data[0] to be ${tableRes}, but got ${table.data[0]}`);
// }

await workspace.buildOnlyForDocument(doc.docId);
//await $$.checkDocVar(doc.docId, "res", {from: "John", message:"Hello", truid: "TRUID_1"});
//await $$.checkDocVar(doc.docId, "res2", {from: "Michael", message:"Hi", truid: "TRUID_2"});

console.log((await graph.varDump("docId/table")).info);
console.log((await graph.varDump("docId/res")).info);

table = await workspace.getVarValue(doc.docId, "table");
//assert(table.data.length === 2, `expected table data length to be 2, but got ${table.data.length}`);
//for(let i = 0; i < table.data.length; i++) {
    //assert(table.data[i], tableRes[i], `expected table data[0] to be ${tableRes}, but got ${table.data[0]}`);
//}

await workspace.buildOnlyForDocument(doc.docId);
table = await workspace.getVarValue(doc.docId, "table");

console.log((await graph.varDump("docId/table")).info);
console.log((await graph.varDump("docId/res")).info);

assert(table.data.length === 2, `expected table data length to be 2, but got ${table.data.length}`);
await $$.endTest();
