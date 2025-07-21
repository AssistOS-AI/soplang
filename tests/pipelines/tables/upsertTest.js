import {} from "../../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");

let script = `
    @table new Table from message
    @res table.upsert John Hello
`;
let docId = await workspace.runCode(script);
let graph = workspace.getGraph();

await graph.printGraph();
await $$.checkDocVar(docId, "res", {from: "John", message:"Hello", truid: "TRUID_1"});
await $$.endTest();