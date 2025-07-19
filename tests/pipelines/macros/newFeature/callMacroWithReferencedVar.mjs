import {} from "../../../deps/clean.mjs";

let workspace = await $$.loadPlugin("Workspace");

let myTestCode = `
    @outsideTable new Table c0 c1 c2 
    @callTable macro outsideTable        
        outsideTable.append 1 2 3
    end            
`;

await workspace.insertCode("doc1", myTestCode);
await workspace.buildAll();

//new feature
await workspace.runMacro("doc1", "callTable" , "$outsideTable");
await $$.endTest();