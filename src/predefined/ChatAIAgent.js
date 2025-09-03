import constants from "../util/constants.js"
import {getVarValue} from "../graph/varUtil.js";

function ChatAIAgent(docId, varName) {
    this.__type = "ChatAIAgent";
    this.varName = varName;
    this.docId = docId;
    let persistence = $$.loadPlugin("DefaultPersistence");
    let llmPlugin = $$.loadPlugin("LLM");
    let chatRoom = $$.loadPlugin("ChatRoom");
    let workspace = $$.loadPlugin("Workspace");

    this.init = async function(agentName) {
        persistence = $$.loadPlugin("DefaultPersistence");
        this.agentName = agentName;
        let agentConfig = await persistence.getAgent(agentName);
        this.description = agentConfig.description || "";
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            let agentConfig = await persistence.getAgent(this.agentName);
            this.description = agentConfig.description || "";
        }
    }
    this.getSystemPrompt = function() {
        return `You are an assistant within a web application. Your name is ${this.agentName}. You must respect these general instructions: ${this.description}`;
    }
    this.analiseRelevance = async function(inputValues) {
        let reply = inputValues[0];
        let prompt = inputValues[1];
        let agentConfig = await persistence.getAgent(this.agentName);
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
        let contextTable = await getVarValue(chat.contextVarId);
        let agentConfig = await persistence.getAgent(this.agentName);
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
            let graph = workspace.getGraph();
            for(let i = 0; i < contextTable.data.length; i++) {
                if(!parsedResponse[i] || parsedResponse[i] <3){
                    await contextTable.internalDeleteRow(contextTable.data[i].truid);
                } else {
                    let reply = contextTable.data[i];
                    reply.relevance = parsedResponse[i];
                    await contextTable.internalUpdateRow(reply, graph);
                }
            }
        } catch (e){
            console.error(e);
        }
    }

    this.acknowledge = async function(from, message, chatContext) {
        if(from === this.agentName || from === constants.ROLES.SYSTEM) {
            return;
        }
        let chat = await workspace.getVarValue(this.docId, "chat");
        let processingReply = {from: this.agentName, message:constants.AGENT_PROCESSING_MESSAGE, timestamp: new Date().toISOString(), role: constants.ROLES.AI}
        let historyVar = await getVarValue(chat.historyVarId);
        //insert in history but not in context
        let reply = await historyVar.upsert([processingReply])
        await chat.notify([reply]);
        let agentConfig = await persistence.getAgent(this.agentName);
        let chatConfig = agentConfig.llms["chat"];

        let response;
        try {
            response = await llmPlugin.getChatCompletionResponse(chatConfig.providerName, chatConfig.modelName, chatContext);
        } catch (e){
            response = e.message;
        }
        await chatRoom.chatInput(this.docId, this.agentName, response, constants.ROLES.AI, reply.truid);
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
