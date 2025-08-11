import {getVarID, getVarValue} from "../graph/varUtil.js";

function Chat(docId, varName) {
    this.__type = "Chat"
    this.docId = docId;
    this.varName = varName;
    let workspace = $$.loadPlugin("Workspace");
    let chatRoom = $$.loadPlugin("ChatRoom");

    this.init = async function (...args) {
        let history = args[0];
        if(typeof history === "string"){
            this.historyVarId = getVarID(this.docId, history);
        } else {
            this.historyVarId = getVarID(this.docId, history.varName);
        }
        let context = args[1];
        if(typeof context === "string"){
            this.contextVarId = getVarID(this.docId, context);
        } else {
            this.contextVarId = getVarID(this.docId, context.varName);
        }
        let agents = args.slice(2);
        let agentVarIds = [];
        for(let agent of agents) {
            if(typeof(agent) === "string") {
                agentVarIds.push(getVarID(this.docId, agent));
            } else {
                agentVarIds.push(getVarID(this.docId, agent.varName));
            }
        }
        this.interrogatorVarId = agentVarIds[0];
        this.agentVarIds = agentVarIds;
    }

    this.notify = function (inputValues) {
        let reply = inputValues[0];
        chatRoom.notifySubscribers(this.docId, reply);
        let graph = workspace.getGraph();
        for(let respondent of this.agentVarIds) {
            graph.getVarValue(respondent).then(agent =>{
                this.getContext().then(history => {
                    agent.acknowledge(reply.from, reply.message, history.data);
                });
            });
        }
    }

    //called internally only by agent
    this.updateReply = async function (truid, from, message, role) {
        let timestamp = new Date().toISOString();
        let tableValue = await getVarValue(this.historyVarId);
        let contextTable = await getVarValue(this.contextVarId);
        let graph = workspace.getGraph();
        await tableValue.internalUpdateRow({from, message, timestamp, truid}, graph);
        try {
            await contextTable.internalUpdateRow({from, message, timestamp, truid}, graph);
        } catch (e){
            console.error(`Failed to update reply in context table: ${e.message}`);
        }
        chatRoom.notifySubscribers(this.docId, {from, message, timestamp, role, truid});
        return truid;
    }
    this.getHistory = async function () {
        return await getVarValue(this.historyVarId);
    }
    this.getContext = async function () {
        return await getVarValue(this.contextVarId);
    }
    this.getDynamicContext = async function () {
        const lastRepliesNr = 10; //number of last replies to consider in the context
        let contextTable = await getVarValue(this.contextVarId);
        let dynamicContext = contextTable.data;
        let chatHistory = await chatRoom.getChatHistory(this.docId);
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