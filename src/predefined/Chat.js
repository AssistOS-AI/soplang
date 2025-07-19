import { getVarID, getVarValue } from "../graph/varUtil.js";

function Chat(docId, varId) {
    this.__type = "Chat"
    this.docId = docId;
    this.varId = varId;
    let workspace = $$.loadPlugin("Workspace");
    let chatPlugin = $$.loadPlugin("Chat");

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
    this.getContext = async function () {
        let contextTable = await getVarValue(this.contextVarId);
        return contextTable.data;
    }
    this.getDynamicContext = async function () {
        const lastRepliesNr = 10; //number of last replies to consider in the context
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