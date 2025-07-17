import {} from "../../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");

let initialVarId;
function CustomType(docId, varId) {
    this.varId = varId;
    if(!initialVarId){
        initialVarId = varId;
    } else {
        if(initialVarId !== varId) {
            console.error(`CustomType should be created with the same varId, first instance: ${initialVarId}, second instance: ${varId}`);
            process.exit(1);
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
await workspace.runCode(script);
await workspace.buildAll();


$$.endTest();