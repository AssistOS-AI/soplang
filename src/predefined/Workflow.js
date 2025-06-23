function Workflow(){
    let self = this;
    let documentsPlugin, persistence, agentPlugin;
    this.agentName = undefined;
    let agentInstance = undefined;
    self.__type = "Agent";

    this.init = async function(agentName) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        this.agentName = agentName;
        agentInstance = await persistence.createAgent({name: agentName});
    }
    this.configure = async function(inputValues, parsedCommand, currentDocId, graph) {
        console.log(inputValues);
    }

    this.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            agentInstance = await persistence.getAgent(this.agentName);
        }
    }
}

$$.registerCustomType("Workflow", Workflow);