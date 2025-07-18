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
    const lastRepliesNr = 10; //number of last replies to consider in the context

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
    this.analiseRelevance = async function(inputValues) {
        let reply = inputValues[0];
        let prompt = inputValues[1];
        let chatConfig = agentConfig.llms["chat"];
        try {
            let fullPrompt = `${prompt} Your response should be a JSON object with the following structure: { "relevant": true/false, "context": "extracted context", "relevance": number from 1 to 10 }. If the message is relevant, extract the context from it and how relevant it is. If not, set relevant to false and context to an empty string.`
            let response = await llmPlugin.getTextResponse(chatConfig.providerName, chatConfig.modelName, fullPrompt);
            try{
                let parsedResponse = JSON.parse(response);
                if(!parsedResponse.hasOwnProperty("relevant") || !parsedResponse.hasOwnProperty("context") || !parsedResponse.hasOwnProperty("relevance")) {
                    console.error("Invalid response format from LLM. Expected JSON with 'relevant', 'context', and 'relevance' properties.");
                }
                return {
                    from: "System",
                    message: parsedResponse.context,
                    timestamp: new Date().toISOString(),
                    role: constants.ROLES.SYSTEM,
                    truid: reply.truid,
                    relevance: parsedResponse.relevance
                };
            } catch (e){
                console.error(e);
            }
        } catch (e){
            console.error(`Error extracting context for agent ${this.agentName}: ${e.message}`);
        }
    }
    this.trimContext = async function(inputValues) {
        let prompt = inputValues[0];
        let chat = await workspace.getVarValue(this.docId, "chat");
        let context = await chat.getContext();
        let chatConfig = agentConfig.llms["chat"];
        let completePrompt = `${prompt} Give a new relevance score from 1 to 10 for each piece of context. 
        If the context is not relevant, set relevance to 0. Your response should be an array of numbers, each corresponding to the relevance of the context in the same order.`;
        let response = await llmPlugin.getTextResponse(chatConfig.providerName, chatConfig.modelName, completePrompt);
        try {
            let parsedResponse = JSON.parse(response);
            if(!Array.isArray(parsedResponse)) {
                console.error("Invalid response format from LLM. Expected an array of context objects.");
                return;
            }
            for(let i = 0; i < context.length; i++) {
                context[i].relevance = parsedResponse[i] || 0; // Default to 0 if no relevance score is provided
            }
        } catch (e){
            console.error(e);
        }
        context = context.filter(reply => reply.relevance > 3);

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
