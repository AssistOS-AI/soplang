import { getVarID, getVarValue } from "../graph/varUtil.js";
import constants from "../util/constants.js";

function Chat(docId, varId) {
    this.__type = "Chat"
    this.docId = docId;
    this.varId = varId;
    let workspace = $$.loadPlugin("Workspace");
    let chatPlugin = $$.loadPlugin("Chat");
    const lastRepliesNr = 10; //number of last replies to consider in the context

    this.init = async function (...args) {
        let history = args[0];
        if(typeof history === "string"){
            this.historyVarId = getVarID(this.docId, history);
        } else {
            this.historyVarId = history.varId;
        }
        let context = args[1];
        if(typeof context === "string"){
            this.contextVarId = getVarID(this.docId, context);
        } else {
            this.contextVarId = context.varId;
        }
        let agents = args.slice(2);
        let agentVarIds = [];
        for(let agent of agents) {
            if(typeof(agent) === "string") {
                agentVarIds.push(getVarID(this.docId, agent));
            } else {
                agentVarIds.push(agent.varId);
            }
        }
        this.interrogatorVarId = agentVarIds[0];
        this.agentVarIds = agentVarIds;
    }

    this.notify = function (inputValues) {
        let historyTable = inputValues[0];
        let lastRow = historyTable.data[historyTable.data.length - 1];
        chatPlugin.notifySubscribers(this.docId, lastRow);
        let graph = workspace.getGraph();
        for(let respondent of this.agentVarIds) {
            graph.getVarValue(respondent).then(agent =>{
                this.getDynamicContext().then(chatContext => {
                    agent.acknowledge(lastRow.from, lastRow.message, chatContext);
                });
            });
        }
    }

    //called internally only by agent
    this.updateReply = async function (truid, from, message, role) {
        let timestamp = new Date().toISOString();
        let tableValue = await getVarValue(this.historyVarId);
        let graph = workspace.getGraph();
        await tableValue.internalUpdateRow({from, message, timestamp, truid}, graph);
        chatPlugin.notifySubscribers(this.docId, {from, message, timestamp, role, truid});
        return truid;
    }
    this.getHistory = async function () {
        let historyTable = await getVarValue(this.historyVarId);
        return historyTable.data;
    }
    this.getDynamicContext = async function () {
        let contextTable = await getVarValue(this.contextVarId);
        let dynamicContext = contextTable.data;
        let chatHistory = await chatPlugin.getChatHistory(this.docId);
        dynamicContext = dynamicContext.concat(chatHistory.slice(-lastRepliesNr));
        return dynamicContext;
    };
    this.start = async function () {
        let graph = workspace.getGraph();
        let interrogator = await graph.getVarValue(this.interrogatorVarId);
        let from = "waitInput";
        let message = "Begin conversation";
        await interrogator.acknowledge(from, message);
    }

    this.trimCurrentContext = async function() {
        let chatHistory = await chatPlugin.getChatHistory(this.docId);
        let currentHistory = chatHistory.slice(-lastRepliesNr);
        let chatConfig = agentConfig.llms["chat"];
        let prompt = `Given the current discussion, determine if the information in the current context is still relevant. Give a new relevance score from 1 to 10 for each piece of context. 
        If the context is not relevant, set relevance to 0. Current context: ${JSON.stringify(this.context)}. Current discussion: ${JSON.stringify(currentHistory)}. Your response should be the current context array with modified relevance scores.`;
        let response = await llmPlugin.getTextResponse(chatConfig.providerName, chatConfig.modelName, prompt);
        try {
            let parsedResponse = JSON.parse(response);
            if(!Array.isArray(parsedResponse)) {
                console.error("Invalid response format from LLM. Expected an array of context objects.");
                return;
            }
            this.context = parsedResponse;
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

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.docId = JSONSerialisation.docId;
            this.chatId = JSONSerialisation.chatId;
            this.interrogatorVarId = JSONSerialisation.interrogatorVarId;
            this.agentVarIds = JSONSerialisation.agentVarIds;
            this.historyVarId = JSONSerialisation.historyVarId;
            this.contextVarId = JSONSerialisation.contextVarId;
        }
    }
}

$$.registerCustomType("Chat", Chat);