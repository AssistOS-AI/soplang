import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");

let initialVarId;
//the purpose of the test is to ensure thhat a p[roper varName and not a varId is passed to the constructor of a custom type
function CustomType(docId, varName) {
    this.varId = varName;
    if(!initialVarId){
        initialVarId = varName;
    } else {
        if(initialVarId !== varName) {
          $$.failTest();
          throw new Error(`CustomType should be created with the same varId, first instance: ${initialVarId}, second instance: ${varName}`);
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