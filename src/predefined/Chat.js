function Chat(docId, varId) {
    let self = this;
    let instance, persistence;
    this.docId = docId;
    this.varId = varId;
    this.activated = false;
    let workspace, chatPlugin;
    this.init = async function (chatId, ...agents) {
        this.chatId = chatId;
        this.interrogator = agents[0].varId;
        agents.shift();
        this.respondents = agents.map(agent => agent.varId);
    }

    this.activateChat = async function() {
        this.activated = true;
        let graph = workspace.getGraph();
        let respondent = await graph.getVarValue(this.respondents[0]);
        if (!respondent) {
            throw new Error("Respondent agent is not defined.");
        }
        let interrogatorAgent = await graph.getVarValue(this.interrogator);
        if (!interrogatorAgent) {
            throw new Error("Interrogator agent is not defined.");
        }
        while(this.activated) {
            let question = await interrogatorAgent.getQuestion();
            console.log(question);
            //await chatPlugin.displayMessage(question);
            let response = await respondent.getResponse(interrogatorAgent, question);
            console.log(response);
            await interrogatorAgent.acknowledgeResponse(respondent, response);
        }
    }
    this.deactivateChat = async function () {
        this.activated = false;
    }
    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.docId = JSONSerialisation.docId;
            this.chatId = JSONSerialisation.chatId;
            this.interrogator = JSONSerialisation.interrogator;
            this.respondents = JSONSerialisation.respondents;
            this.activated = JSONSerialisation.activated;
        }
        workspace = $$.loadPlugin("Workspace");
        chatPlugin = $$.loadPlugin("Chat");
    }
}

$$.registerCustomType("Chat", Chat);