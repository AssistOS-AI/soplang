import { getVarID, getVariable } from "../graph/varUtil.js";
import crypto from "crypto";

function generateId() {
    return crypto.randomBytes(8).toString('hex');
}
function Chat(docId, varId) {
    this.__type = "Chat"
    this.docId = docId;
    this.varId = varId;
    let workspace = $$.loadPlugin("Workspace");
    let chatPlugin = $$.loadPlugin("Chat");

    this.init = async function (...agents) {
        let agentIds = [];
        for(let agent of agents) {
            if(typeof(agent) === "string") {
                agentIds.push(getVarID(this.docId, agent));
            } else {
                agentIds.push(agent.varId);
            }
        }
        this.interrogator = agentIds[0];
        this.agents = agentIds;
    }
    async function saveReply(replyId, from, message, timestamp) {
        let varId = getVarID(docId, "chatHistory");
        let history = await workspace.getVarValue(varId);
        await history.addReply(replyId, from, message, timestamp);
    }
    async function editReply(replyId, message, timestamp) {
        let varId = getVarID(docId, "chatHistory");
        let history = await workspace.getVarValue(varId);
        await history.editReply(replyId, message, timestamp);
    }
    this.input = async function (from, message) {
        let replyId = generateId();
        let timestamp = new Date().toISOString();
        chatPlugin.notify(this.docId, {from, message, timestamp, id: replyId});
        await saveReply(replyId, from, message, timestamp);
        let graph = workspace.getGraph();
        for(let respondent of this.agents) {
            let agent = await graph.getVarValue(respondent);
            if(agent.agentName === from){
                continue;
            }
            //called without await
            agent.acknowledge(from, message);
        }
        return replyId;
    }
    this.editReply = async function (replyId, from, message) {
        let timestamp = new Date().toISOString();
        chatPlugin.notify(this.docId, {from, message, timestamp, id: replyId});
        await editReply(replyId, message, timestamp);
        let graph = workspace.getGraph();
        for(let respondent of this.agents) {
            let agent = await graph.getVarValue(respondent);
            if(agent.agentName === from){
                continue;
            }
            //called without await
            agent.acknowledge(from, message);
        }
        return replyId;
    }
    this.start = async function () {
        let graph = workspace.getGraph();
        let interrogator = await graph.getVarValue(this.interrogator);
        let from = "waitInput";
        let message = "Begin conversation";
        await interrogator.acknowledge(from, message);
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.docId = JSONSerialisation.docId;
            this.chatId = JSONSerialisation.chatId;
            this.interrogator = JSONSerialisation.interrogator;
            this.agents = JSONSerialisation.agents;
        }
    }
}

$$.registerCustomType("Chat", Chat);