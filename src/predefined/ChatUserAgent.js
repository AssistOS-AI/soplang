function ChatUserAgent(docId, varId) {
    this.__type = "ChatUserAgent";
    this.varId = varId;
    this.docId = docId;
    this.init = async function(agentName) {
        this.agentName = agentName;
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
        }
    }

    this.acknowledge = async function(from, message) {
        //recordResponse
        //send notification to browser
    }

}

$$.registerCustomType("ChatUserAgent", ChatUserAgent);
