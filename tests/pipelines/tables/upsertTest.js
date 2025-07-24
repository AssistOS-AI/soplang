import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
import assert from "assert";

let script = `
    @table new Table from message
    @sourceTable new Table from message
    
    @res table.upsert John Hello
    
    @res2 sourceTable.upsert 'sop:object:{"from":"Michael","message":"Hi"}'
    
    @res3 table.upsert $sourceTable
    
    @tableOneColumn new Table from
    @res4 tableOneColumn.upsert 'sop:object:{"from":"John"}'
    @res5 tableOneColumn.upsert John
    
`;
let docId = await workspace.runCode(script);

await $$.checkDocVar(docId, "res", {from: "John", message:"Hello", truid: "TRUID_1"});
await $$.checkDocVar(docId, "res2", {from: "Michael", message:"Hi", truid: "TRUID_2"});
let table = await workspace.getVarValue(docId, "table");

let tableRes = [ {from: "John", message:"Hello", truid: "TRUID_1"},{from: "Michael", message:"Hi", truid: "TRUID_2"}];
assert(table.data.length === 2, `expected table data length to be 2, but got ${table.data.length}`);
for(let i = 0; i < table.data.length; i++) {
    assert(table.data[i], tableRes[i], `expected table data[0] to be ${tableRes}, but got ${table.data[0]}`);
}

await $$.checkDocVar(docId, "res4", {from: "John", truid: "TRUID_3"});
await $$.checkDocVar(docId, "res5", {from: "John", truid: "TRUID_4"});
await $$.endTest();

/*
table = [truid: "TRUID_1", from: "John", message: "Hello"]
sourceTable = [truid: "TRUID_2", from: "Michael", message: "Hi"]

table = [{truid: "TRUID_1", from: "John", message: "Hello"}, {truid: "TRUID_2", from: "Michael", message: "Hi"}]

table.upsert $table
*/