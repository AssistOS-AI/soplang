import {} from "../../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");
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
    
    @insertRows macro row ~sourceTable 
       sourceTable.upsert $row
    end
`;
let docId = await workspace.runCode(script);

await $$.checkDocVar(docId, "res", {from: "John", message:"Hello", truid: "TRUID_1"});
await $$.checkDocVar(docId, "res2", {from: "Michael", message:"Hi", truid: "TRUID_1"});
let table = await workspace.getVarValue(docId, "table");

let tableRes = {from: "Michael", message:"Hi", truid: "TRUID_1"}
assert(table.data.length === 1, `expected table data length to be 1, but got ${table.data.length}`);
for(let key in table.data[0]) {
    assert(table.data[0][key], tableRes[key], `expected table data[0][${key}] to be ${tableRes[key]}, but got ${table.data[0][key]}`);
}

await $$.checkDocVar(docId, "res4", {from: "John", truid: "TRUID_1"});
await $$.checkDocVar(docId, "res5", {from: "John", truid: "TRUID_2"});

await $$.endTest();

/*
table = [truid: "TRUID_1", from: "John", message: "Hello"]
sourceTable = [truid: "TRUID_2", from: "Michael", message: "Hi"]

table = [{truid: "TRUID_1", from: "John", message: "Hello"}, {truid: "TRUID_2", from: "Michael", message: "Hi"}]

table.upsert $table
*/