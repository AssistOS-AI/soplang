import {} from "../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let allOk = true;

let myObjects = {

}

let NamedObject = {
    setters:{
      name: function(name, value){
            this[name] = value;
      }
    },
    getters:{
        name: function(name){
            return this[name];
        }
    },
    commands:{
        doubleName: function(name){
            this[name] = this[name] + this[name];
            return this[name];
        }
    },
    serialize: function(){
        return this.id;
    },
    deserialize: function(valueFromVariable){
        return myObjects[valueFromVariable];
    },
    new: function(...args){
        myObjects[args[0]] = {
            id: args[0],
            name: args[1]
        }
        return myObjects[args[0]];
    },
    delete: function(){
        delete myObjects[this.id];
    },
    lookup: function(){
        return myObjects[this.id];
    }

}

let script = `
    @nob1       := new NamedObject "NOB1" "Constructor Name NOB1"
    @nob1.name  := "Second Name of all NOBs"
    #initial value will be null as no object exists with id NOB2
    @nob2Alias  lookup "NOB2"   
    @name       := $nob1Alias.name 
    #new become a lokup on the re-execution of the script, added @nob2Alias dependency to force order of execution
    @nob2       new NamedObject "NOB2" @nob2Alias
    @nob2.name  := $nob1Alias.name
    #force deletion of nob1.    
    @deleteNob1 if [exists $nob1] then [ delete nob1 ] else "already deleted" 
    `
await workspace.defineCustomType("NamedObject", NamedObject);

let docId =await workspace.runScript(script);

await workspace.buildAll();
await graph.printGraph();

let value = await graph.getVarValue(docId,"deleteNob1");
allOk &&= value === true;
value = await graph.getVarValue(docId,"nob1");
allOk &&= value === null;

value = await graph.getVarValue(docId,"nob2");
allOk &&= value.name === "Second Name of all NOBs";

await workspace.buildAll();

value = await graph.getVarValue(docId,"nob1Alias");
allOk &&= value.name === null;

value = await graph.getVarValue(docId,"deleteNob1");
allOk &&= value.name === "already deleted";

await workspace.shutDown();

console.log("All tests passed:", allOk? "true" : "false");

assert(allOk === true, "Some tests failed");