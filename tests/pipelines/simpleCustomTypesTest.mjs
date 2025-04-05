import {} from "../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;
async function check(varName, expectedValue) {
    let value = await graph.getVarValue(docId, varName);
    allOk &&= (value === expectedValue);
    console.assert(value === expectedValue, `Expected '${expectedValue}' but got '${value}' for '${varName}'`);
}

function NamedObject() {
    let self = this;

    this.init = async function(name) {
        self.name = name;
        self.id = name;
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            self.name = JSONSerialisation.name;
            self.id = JSONSerialisation.id;
        }
    }

    this.setName = async function(inputValues, outputValues, currentDocId, workspace) {
        self.name = inputValues[0];
        return true;
    }
}
let testScript = `@nob1 new NamedObject "NOB1" #debug
    @var := $nob1.name #debug
    @waitSetNameResult nob1.setName "Second Name of NOB1" await $var #debug  
    @var0 := $nob1.name await $waitSetNameResult #debug 
    @waitOverwrite overwrite ~nob1.name "Final name of NOB1" await $var0 $waitSetNameResult #debug   
    @var1 := $nob1.name await $waitOverwrite`

await workspace.defineCustomType("NamedObject", NamedObject);

let docId = await workspace.runScript(testScript);

await workspace.buildAll();
let value = undefined;

console.debug("Checking var, var0 and var1 after the first build");
await check("var", "NOB1");
await check("var0", "Second Name of NOB1");
await check("var1", "Final name of NOB1");

await workspace.buildAll();

// allOk &&= value === "Second Name of all NOBs";

await graph.printGraph();
await check("var", "Final name of NOB1");
await check("var0", "Second Name of NOB1");
await check("var1", "Final name of NOB1");

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");
