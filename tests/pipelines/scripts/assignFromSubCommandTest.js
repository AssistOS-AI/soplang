import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let documents = await $$.loadPlugin("Documents");
let graph = workspace.getGraph();

let allOk = true;
function CustomType() {
    this.name = "CustomType";
    this.value = "1 2 3 4 5";

    this.getName = function() {
        return this.name;
    }

    this.getValue = function() {
        return this.value;
    }
}

let script = `
    @var := [ := "1 2 3 4 5" ]
    @var2 := [ $var.getValue ]
`;


let docId = await workspace.runScript(script);
await workspace.buildAll();
await graph.printGraph();

await $$.check(docId, "var", "1 2 3 4 5");
await $$.check(docId, "var2", "1 2 3 4 5");

console.log("All tests passed:", $$.allOk? "true" : "false");

assert(allOk === true, "Some tests failed");