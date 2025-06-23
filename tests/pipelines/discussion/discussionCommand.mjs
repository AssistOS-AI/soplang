import {} from "../../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");

let script = `
    @currentUser := "Michael"
    @cars discussion currentUser
        @intro := "Hello." 
        @favCar := "Find the favorite car of" $currentUser
        @instruction := $intro $favCar
        @number math 5 * ( 200 / 100 )        
    end
    @res cars $currentUser
`;
let docId = await workspace.runCode(script);
let localDocId = await workspace.getVarValue(docId, "res");
await $$.checkDocVar(localDocId, "favCar", "Find the favorite car of Michael");
await $$.checkDocVar(localDocId, "instruction", "Hello. Find the favorite car of Michael");
await $$.checkDocVar(localDocId, "number", 10);

$$.endTest();