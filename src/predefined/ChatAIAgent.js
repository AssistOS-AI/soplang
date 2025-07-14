import constants from "../util/constants.js"
function ChatAIAgent(docId, varId) {
    let agentConfig;
    this.__type = "ChatAIAgent";
    this.varId = varId;
    this.docId = docId;
    let persistence = $$.loadPlugin("DefaultPersistence");
    let llmPlugin = $$.loadPlugin("LLM");
    let chatPlugin = $$.loadPlugin("Chat");
    const lastRepliesNr = 10; //number of last replies to consider in the context
    this.context = [];
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
    this.getSystemPromptReply = function() {
        let message = `You are an assistant within a web application. Your name is ${this.agentName}. You must respect these general instructions: ${agentConfig.description}`;
        return {
            role: "system",
            message: message
        }
    }
    this.trimCurrentContext = async function() {
        let chatHistory = await chatPlugin.getChatHistory(this.docId);
        let currentHistory = chatHistory.slice(-lastRepliesNr);
        let chatConfig = agentConfig.llms["chat"];
        let prompt = `Given the current discussion, determine if the information in the current context is still relevant. Give a new relevance score from 1 to 10 for each piece of context. 
        If the context is not relevant, set relevance to 0. Current context: ${JSON.stringify(this.context)}. Current discussion: ${JSON.stringify(currentHistory)}. Your response should be the current context object with modified relevance scores.`;
        let response = await llmPlugin.getTextResponse(chatConfig.providerName, chatConfig.modelName, prompt);
        try {
            let parsedResponse = JSON.parse(response);
            this.context = parsedResponse.context;
        } catch (e){
            console.error(e);
        }
        this.context = this.context.filter(reply => reply.relevance > 3);
    }
    this.extractAndSaveContext = async function(from, message) {
        let chatConfig = agentConfig.llms["chat"];
        let chatHistory = await chatPlugin.getChatHistory(this.docId);
        let currentHistory = chatHistory.slice(-lastRepliesNr);
        try {
            let prompt = `Given the current discussion and a new user message, determine if the message contains any information relevant to the ongoing topic. 
            Your response should be a JSON object with the following structure: { "relevant": true/false, "context": "extracted context", "relevance": number from 1 to 10 }. 
            If the message is relevant, extract the context from it and how relevant it is. If not, set relevant to false and context to an empty string. User message: "${message}". Current discussion: ${JSON.stringify(currentHistory)}`;
            let response = await llmPlugin.getTextResponse(chatConfig.providerName, chatConfig.modelName, prompt);
            try{
                let parsedResponse = JSON.parse(response);
                if(!parsedResponse.hasOwnProperty("relevant") || !parsedResponse.hasOwnProperty("context")) {
                    console.error("Invalid response format from LLM. Expected JSON with 'relevant' and 'context' properties.");
                }
                if(parsedResponse.relevant) {
                    this.context.push({role: constants.ROLES.SYSTEM, message: parsedResponse.context, relevance: parsedResponse.relevance});
                }
            } catch (e){
                console.error(e);
            }
        } catch (e){
            console.error(`Error extracting context for agent ${this.agentName}: ${e.message}`);
        }
    }
    this.buildDynamicContext = async function(from, message) {
        let dynamicContext = [];
        let chatHistory = await chatPlugin.getChatHistory(this.docId);
        dynamicContext.push(this.getSystemPromptReply());
        await this.extractAndSaveContext(from, message);
        await this.trimCurrentContext();
        dynamicContext = dynamicContext.concat(this.context);
        dynamicContext = dynamicContext.concat(chatHistory.slice(-lastRepliesNr));
        return dynamicContext;
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
