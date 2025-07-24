import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");
let graph = workspace.getGraph();

let allOk = true;
function CustomType() {
    this.name = "CustomType";
    this.value = "1 2 3 4 5";

    this.init = function (...args) {
        this.name = args[0];
        this.value = args[1];
    }

    this.restore = function (JSONSerialisation) {
        if (JSONSerialisation) {
            this.name = JSONSerialisation.name;
            this.value = JSONSerialisation.value;
        }
    }

    this.getName = function() {
        return this.name;
    }

    this.getValue = function() {
        return this.value;
    }
}

let script = `
    @a new CustomType "doc1" "1 2 3 4 5"
    @b := [ a.getValue ]
`;


await workspace.defineCustomType("CustomType", CustomType);
let docId = await workspace.runCode(script);
await workspace.buildAll();
await graph.printGraph();

await $$.check(docId, "b", "1 2 3 4 5");

console.log("All tests passed:", $$.allOk? "true" : "false");

assert(allOk === true, "Some tests failed");
await workspace.shutDown();
$$.endTest();