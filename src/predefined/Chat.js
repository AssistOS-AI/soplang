import { getVarID } from "../graph/varUtil.js";

function Chat(docId, varId) {
    this.__type = "Chat"
    let instance, persistence;
    this.docId = docId;
    this.varId = varId;
    this.activated = false;
    let workspace, chatPlugin;

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
    this.input = async function (from, message) {
        chatPlugin.notify(this.docId, {from, message});
        let graph = workspace.getGraph();
        for(let respondent of this.agents) {
            let agent = await graph.getVarValue(respondent);
            if(agent.agentName === from){
                continue;
            }
            //called without await
            agent.acknowledge(from, message);
        }
        await workspace.buildOnlyForDocument(this.docId);
        return await graph.getVarValue(this.docId, "chat");
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
        workspace = $$.loadPlugin("Workspace");
        chatPlugin = $$.loadPlugin("Chat");
    }
}

$$.registerCustomType("Chat", Chat);