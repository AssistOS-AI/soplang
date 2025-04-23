function Agent(){
    let self = this;
    let documentsPlugin, persistence, agentPlugin;
    this.agentName = undefined;
    let agentInstance = undefined;

    this.init = async function(agentName){
        persistence = await $$.loadPlugin("DefaultPersistence");
        self.agentName = agentName;
        agentInstance = await persistence.createAgent({agentName});
    }

    this.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            agentInstance = await persistence.getAgent(this.agentName);
        }
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

$$.registerCustomType("Agent", Agent);
