import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

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

    this.setName = async function(inputValues, parsedCommand, currentDocId, workspace) {
        self.name = inputValues[0];
        return true;
    }
}

let testCode = `@nob1 new NamedObject "NOB1"
    @varX := $nob1.name 
    @waitSetNameResult nob1.setName "NOB1_1" await $varX 
    @var0 := $nob1.name await $waitSetNameResult 
    @waitOverwrite overwrite ~nob1.name "NOB1_2" await $var0    
    @var1 := $nob1.name await $waitOverwrite
    @a new NamedObject "A"
    @b alias $arg0 a
    b.setName "B"
    @res1 := $a.name
    @res2 := $b.name
    `

await workspace.defineCustomType("NamedObject", NamedObject);
let docId = await workspace.runCode(testCode);
await workspace.buildAll();

console.debug("Checking var, var0 and var1 after the first build");
await $$.check(docId, "varX", "NOB1_1");
await $$.check(docId, "var0", "NOB1_1");
await $$.check(docId, "var1", "NOB1_1");
await $$.check(docId, "res1", "B");
await $$.check(docId, "res2", "B");

//await graph.printGraph();

await workspace.buildAll();
//await graph.printGraph();
await $$.check(docId, "varX", "NOB1_1");
await $$.check(docId, "var0", "NOB1_1");
await $$.check(docId, "var1", "NOB1_1");
await $$.check(docId, "res1", "B");
await $$.check(docId, "res2", "B");

await $$.endTest();
