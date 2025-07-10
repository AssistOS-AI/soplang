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
    let tablePlugin = $$.loadPlugin("Table");

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
    async function saveReply(from, message, timestamp) {
        let computedRow = await tablePlugin.insert(docId, "chatHistory", {from, message, timestamp});
        return computedRow.truid;
    }
    async function editReply(id, from, message, timestamp) {
        await tablePlugin.updateRow(docId, "chatHistory", {truid: id, from, message, timestamp});
    }
    this.input = async function (from, message) {
        let timestamp = new Date().toISOString();
        let id = await saveReply(from, message, timestamp);
        chatPlugin.notify(this.docId, {id, from, message, timestamp});
        let graph = workspace.getGraph();
        for(let respondent of this.agents) {
            let agent = await graph.getVarValue(respondent);
            if(agent.agentName === from){
                continue;
            }
            //called without await
            agent.acknowledge(from, message);
        }
        return id;
    }
    this.editReply = async function (id, from, message) {
        let timestamp = new Date().toISOString();
        await editReply(id, from, message, timestamp);
        chatPlugin.notify(this.docId, {id, from, message, timestamp});
        let graph = workspace.getGraph();
        for(let respondent of this.agents) {
            let agent = await graph.getVarValue(respondent);
            if(agent.agentName === from){
                continue;
            }
            //called without await
            agent.acknowledge(from, message);
        }
        return id;
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