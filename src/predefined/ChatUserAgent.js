function ChatUserAgent(docId, varName) {
    this.__type = "ChatUserAgent";
    this.varName = varName;
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
