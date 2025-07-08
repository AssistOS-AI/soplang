function ChatHistory(docId, varId) {
    this.__type = "ChatHistory";
    this.varId = varId;
    this.docId = docId;
    this.init = async function() {
        this.history = [];
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.history = JSONSerialisation.history;
        }
    }

    this.addReply = function(replyId, from, message, timestamp) {
        this.history.push({ id: replyId, from, message, timestamp,});
    }
    this.editReply = function(replyId, message, timestamp) {
        let reply = this.history.find(r => r.id === replyId);
        if (!reply) {
            throw new Error(`Reply with id ${replyId} not found in history.`);
        }
        reply.message = message;
        reply.timestamp = timestamp;
    }
    this.getHistory = async function() {
        return this.history;
    }

}

$$.registerCustomType("ChatHistory", ChatHistory);
