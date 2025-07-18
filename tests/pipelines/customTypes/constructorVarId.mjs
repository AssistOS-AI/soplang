import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");

let initialVarId;
function CustomType(docId, varId) {
    this.varId = varId;
    if(!initialVarId){
        initialVarId = varId;
    } else {
        if(initialVarId !== varId) {
            console.error(`CustomType should be created with the same varId, first instance: ${initialVarId}, second instance: ${varId}`);
          throw new Error(`CustomType should be created with the same varId, first instance: ${initialVarId}, second instance: ${varId}`);
        }
    }

    this.init = function (...args) {
        this.value = args[0];
    }

    this.restore = function (JSONSerialisation) {
        if (JSONSerialisation) {
            this.value = JSONSerialisation.value;
            this.varId = JSONSerialisation.varId;
        }
    }

    this.getValue = function() {
        return this.value;
    }
}

let script = `
    @a new CustomType "someValue"
    @b a.getValue
`;

await workspace.defineCustomType("CustomType", CustomType);
let docId = await workspace.runCode(script);
assert.notEqual(docId , undefined);
//await
$$.endTest();