import {} from "../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;
function NameObject(name) {
    this.id = 1;
    this.name = name;

    this.serialize = async function() {
        return JSON.stringify({
            id: this.id,
            name: this.name
        });
    };

    this.deserialize = async function(valueFromVariable) {
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

        return this;
    };

    this.getInnerValue = function(obj, workspace) {
        return obj;
    };

    this.setInnerValue = function(obj, newValue, workspace) {
        for (let key in newValue) {
            obj[key] = newValue[key];
        }
    };

    this.delete = function() {
        // Nothing to do for cleanup
    };
}
let testScript = `@nob1 new NamedObject "Initial name NOB1" 
    overwrite ~nob1.name "New name NOB1"
    @var1 := $nob1.name`
await workspace.defineCustomType("NamedObject", NameObject);

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
