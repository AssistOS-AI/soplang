import {} from "../../../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");

let script = `
    @outsideTable new Table c1 c2    
    @callTable macro table       
        @row table.append 1 2
        return $row
    end
`;

await workspace.insertCode("doc1", script);

await workspace.buildAll();
let value = await workspace.runMacro("doc1", "callTable" , "$outsideTable");
await $$.checkValue(value, {c1: 1, c2: 2, truid: "TRUID_1"});

await $$.endTest();