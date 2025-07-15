import constants from "../util/constants.js"
function ChatAIAgent(docId, varId) {
    let agentConfig;
    this.__type = "ChatAIAgent";
    this.varId = varId;
    this.docId = docId;
    let persistence = $$.loadPlugin("DefaultPersistence");
    let llmPlugin = $$.loadPlugin("LLM");
    let chatPlugin = $$.loadPlugin("Chat");
    this.context = [];
    this.init = async function(agentName) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        this.agentName = agentName;
        agentConfig = await persistence.getAgent(agentName);
        this.description = agentConfig.description || "";
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            agentConfig = await persistence.getAgent(this.agentName);
            this.description = agentConfig.description || "";
        }
    }
    this.getSystemPromptReply = function() {
        let message = `You are an assistant within a web application. Your name is ${this.agentName}. You must respect these general instructions: ${this.description}`;
        return {
            role: "system",
            message: message
        }
    }

    this.acknowledge = async function(from, message) {
        let id = await chatPlugin.chatInput(this.docId, this.agentName, constants.AGENT_PROCESSING_MESSAGE, constants.ROLES.AI)
        let chatConfig = agentConfig.llms["chat"];
        let chatContext = await this.buildDynamicContext(from, message);
        let response;
        try {
            response = await llmPlugin.getChatCompletionResponse(chatConfig.providerName, chatConfig.modelName, chatContext);
        } catch (e){
            response = e.message;
        }
        await chatPlugin.editReply(id, this.docId, this.agentName, response, constants.ROLES.AI);
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
