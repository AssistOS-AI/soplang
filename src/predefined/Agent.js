function Agent(docId, varId) {
    let self = this;
    let persistence, agentPlugin;
    this.agentName = undefined;
    let agentInstance = undefined;
    self.__type = "Agent";
    this.varId = varId;
    this.docId = docId;

    this.init = async function(agentName, isHuman = false) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        self.agentName = agentName;
        this.isHuman = isHuman;
        agentInstance = await persistence.createAgent({name:agentName});
    }

    this.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            agentInstance = await persistence.getAgent(this.agentName);
            this.isHuman = JSONSerialisation.isHuman;
        }
    }

    this.resolveQuestionOrResponse = function(input) {
        if(this.resolve) {
            this.resolve(input);
            this.resolve = null;
            this.reject = null;
        } else {
            throw new Error("Trying to chat without opening a chat first.");
        }
    }
    this.getQuestion = async function() {
        if(this.isHuman){
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        } else {
            return "How can I assist you today?";
        }
    }
    this.getResponse = async function (questioningAgent, question){
        if(this.isHuman){
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        } else {
            return "Im fine, thank you.";
        }
    }

    this.acknowledgeResponse = async function(respondingAgent, question){

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
