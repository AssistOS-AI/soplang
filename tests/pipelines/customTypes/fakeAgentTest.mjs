import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = await $$.loadPlugin("Workspace");
let persistence = await $$.loadPlugin("DefaultPersistence");
let graph = workspace.getGraph();

await persistence.configureTypes({
    fakeAgent: {
        name: "string"
    }
});

await persistence.createIndex("fakeAgent", "name");

await persistence.createFakeAgent({name:"Einstein"});

//this is for testing lookup and an example when the persistent objects handled by Persisto are adapted to be used in SOP Lang
function FakeAgent() {
    let self = this;
    let agent = undefined; // should never be added to "this" as it will create unnecessary copies of the object

    this.init = async function(name, persistentInstance) {
        self.agentName = name;
        if(persistentInstance){
            agent = persistentInstance;
        } else {
            agent = await persistence.createFakeAgent({name:self.agentName});
        }
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            self.agentName = JSONSerialisation.agentName;
            agent = await persistence.getFakeAgent(self.agentName);
        }
    }

    this.ask = async function(inputValues, outputValues, currentDocId, workspace) {
        let prompt = `You are an useful agent named ${self.agentName} ${inputValues.join(" ")}  Please respond!`;
        if(self.agentName === "007Agent"){
            return "I am a fake James Bond!";
        } else {
            return `I am:[${self.agentName}] Prompt was: '${prompt}'`;
        }
    }
}

let testCode = `
    @agent1 new FakeAgent 007Agent
    @agent2 lookup FakeAgent Einstein  # it was created before and now loaded from persistence
    @agent3 lookup FakeAgent BigAnonymous  #  was not created before and now loaded from persistence    
    @agent4 alias [currentDocId] agent1
    @agent5 alias CODEX_1 agent1       
    @agent6 alias $arg0 agent1
    @curDocId currentDocId
    @agent7 alias $curDocId agent1   
    @resp1  agent1.ask "What is your name?" #debug
    @resp2  agent2.ask "What is your name?" #debug
    @resp3  agent3.ask "What is your name?" #debug        
    @resp4  agent4.ask "What is your name?" #debug
    @resp5  agent5.ask "What is your name?" #debug
    @resp6  agent6.ask "What is your name?" #debug
    @resp7  agent7.ask "What is your name?" #debug    
    #ignored line
    `

await workspace.defineCustomType("FakeAgent", FakeAgent);

let docId = await workspace.runCode(testCode);

await graph.printGraph();

await $$.check(docId, "resp1", "I am a fake James Bond!");
await $$.check(docId, "resp2", "I am:[Einstein] Prompt was: 'You are an useful agent named Einstein What is your name?  Please respond!'");
await $$.check(docId, "resp3", "I am:[BigAnonymous] Prompt was: 'You are an useful agent named BigAnonymous What is your name?  Please respond!'");
await $$.check(docId, "resp4", "I am a fake James Bond!");
await $$.check(docId, "resp5", "I am a fake James Bond!");
await $$.check(docId, "resp6", "I am a fake James Bond!");
await $$.check(docId, "resp7", "I am a fake James Bond!");

await $$.endTest();