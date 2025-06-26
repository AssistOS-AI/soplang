function ChatUserAgent(docId, varId) {
    let persistence, workspace;
    let agentConfig;
    this.__type = "ChatUserAgent";
    this.varId = varId;
    this.docId = docId;
    this.init = async function(agentName) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        this.agentName = agentName;
        //agentConfig = await persistence.getAgent(agentName);
    }

    this.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        workspace = $$.loadPlugin("Workspace");
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            //agentConfig = await persistence.getAgent(this.agentName);
        }
    }

    this.acknowledge = async function(from, message) {
        //recordResponse
        //send notification to browser
    }

}

$$.registerCustomType("ChatUserAgent", ChatUserAgent);
