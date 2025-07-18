import constants from "../util/constants.js"
function ChatAIAgent(docId, varId) {
    let agentConfig;
    this.__type = "ChatAIAgent";
    this.varId = varId;
    this.docId = docId;
    let persistence = $$.loadPlugin("DefaultPersistence");
    let llmPlugin = $$.loadPlugin("LLM");
    let chatPlugin = $$.loadPlugin("Chat");
    let workspace = $$.loadPlugin("Workspace");
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
    this.getSystemPrompt = function() {
        return `You are an assistant within a web application. Your name is ${this.agentName}. You must respect these general instructions: ${this.description}`;
    }
    this.analiseRelevance = async function(inputValues){
        let reply = inputValues[0];
        reply.relevance = 7
        return reply;
    }
    this.acknowledge = async function(from, message, chatContext) {
        if(from === this.agentName) {
            return;
        }
        let truid = await chatPlugin.chatInput(this.docId, this.agentName, constants.AGENT_PROCESSING_MESSAGE, constants.ROLES.AI)
        let chatConfig = agentConfig.llms["chat"];
        let response;
        try {
            response = await llmPlugin.getChatCompletionResponse(chatConfig.providerName, chatConfig.modelName, chatContext);
        } catch (e){
            response = e.message;
        }
        let chat = await workspace.getVarValue(this.docId, "chat");
        await chat.updateReply(truid, this.agentName, response, constants.ROLES.AI);
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
