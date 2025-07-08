function ChatAIAgent(docId, varId) {
    let agentConfig;
    this.__type = "ChatAIAgent";
    this.varId = varId;
    this.docId = docId;
    let workspace = $$.loadPlugin("Workspace");
    let persistence = $$.loadPlugin("DefaultPersistence");
    let llmPlugin = $$.loadPlugin("LLM");
    let chatPlugin = $$.loadPlugin("Chat");
    this.init = async function(agentName) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        this.agentName = agentName;
        agentConfig = await persistence.getAgent(agentName);
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            agentConfig = await persistence.getAgent(this.agentName);
        }
    }

    this.acknowledge = async function(from, message) {
        let replyId = await chatPlugin.chatInput(this.docId, this.agentName, "Processing request...")
        let chatConfig = agentConfig.llms["chat"];
        let response = await llmPlugin.getTextResponse(chatConfig.providerName, chatConfig.modelName, message, {});
        await chatPlugin.editReply(replyId, this.docId, this.agentName, response);
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
