import {} from "../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;
function NameObjectConstructor(id, name) {
    this.id = id;
    this.name = name;

    this.serialize = function() {
        return JSON.stringify({
            id: this.id,
            name: this.name
        });
    };

    this.deserialize = function(valueFromVariable) {
        let data;
        if (typeof valueFromVariable === 'string') {
            try {
                data = JSON.parse(valueFromVariable);
            } catch (e) {
                data = { id: valueFromVariable, name: "" };
            }
        } else {
            data = valueFromVariable;
        }

        return new NameObjectConstructor(
            data.id || "",
            data.name || ""
        );
    };

    this.getInnerValue = function(obj, workspace) {
        return this;
    };

    this.setInnerValue = function(obj, newValue, workspace) {

    };

    this.delete = function() {
        // Nothing to do for cleanup
    };
}
let testScript = `@nob1 new NamedObject "NOB1" "Constructor Name NOB1"
    overwrite ~nob1.name "Second Name of all NOBs"
    @var1 := $nob1.name`
await workspace.defineCustomType("NamedObject", NameObjectConstructor);

let docId = await workspace.runScript(testScript);

await workspace.buildAll();
// await graph.printGraph();

let value = await graph.getVarValue(docId, "nob1");
allOk &&= value.name === "Second Name of all NOBs";

await workspace.buildAll();

// value = await graph.getVarValue(docId, "var1");
// allOk &&= value === "Second Name of all NOBs";

await graph.printGraph();
await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");
