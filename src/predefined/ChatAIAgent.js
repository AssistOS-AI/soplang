function ChatAIAgent(docId, varId) {
    let workspace, persistence;
    let agentConfig;
    this.__type = "ChatAIAgent";
    this.varId = varId;
    this.docId = docId;
    let interrogator;
    this.init = async function(agentName) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        this.agentName = agentName;
        //agentConfig = await persistence.getAgent(agentName);
    }

    this.restore = async function(JSONSerialisation) {
        persistence = $$.loadPlugin("DefaultPersistence");
        workspace = $$.loadPlugin("Workspace");
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            //agentConfig = await persistence.getAgent(this.agentName);
        }
    }

    this.acknowledge = async function(from, message) {
        //recordResponse
        setTimeout(async ()=> {
            let graph = workspace.getGraph();
            let chat = await graph.getVarValue(this.docId, "chat");
            await chat.input(this.agentName, `hello, im ${this.agentName}`);
        },0);
    }

    /*
    Methods:

    expand  expectedSize prompt
    ask prompt
    respond prompt
    yesOrNo prompt
    score #maxNumber prompt
    brainstorm #nrOptions prompt
    rank set #nrCriterias prompt
    questions #number prompt
    learn docId
    plan #noC #noP prompt
    research $plan $discussion $targetDoc #sz
    review $sourcetDoc $reviewDocument
    fix $sourcetDoc $reviewDocument $target

     */

}

$$.registerCustomType("ChatAIAgent", ChatAIAgent);
