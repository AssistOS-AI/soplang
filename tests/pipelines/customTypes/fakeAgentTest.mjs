import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let persistence = await $$.loadPlugin("DefaultPersistence");
let graph = workspace.getGraph();

persistence.declareType("FakeAgent", {
    agentName: {
        type: "string",
        defaultValue: "FakeAgent"
    },
    agentType: {
        type: "string",
        defaultValue: "FakeAgent"
    },
    agentId: {
        type: "string",
        defaultValue: "FakeAgent"
    }
});

let allOk = true;

function FakeAgent() {
    let self = this;

    this.init = async function(x) {
        self.agentName = name;
        persistence.createFakeAgent(self.agentName);
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            self.agentName = JSONSerialisation.agentName;
        }
    }

    this.ask = async function(inputValues, outputValues, currentDocId, workspace) {
        let agentName = inputValues[0];
        let prompt = "You are an useful agent named" + inputValues.join(" ") + " Please respond!";
        if(agentName === "007Agent"){
            return "I am a fake James Bond!";
        } else {
            return `Answer for: '${prompt}'`;
        }
    }
}

let testScript = `
    @agent1 := new Agent 007Agent
    @agent2 := lookup Agent Einstein     
    @resp1  := $agent1.ask "What is your name?" #debug
    @resp2  := $agent2.ask "What is your name?" #debug    
    `


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