function Chat() {
    let self = this;
    this.init = async function (...chatParams) {
        let chat = await $$.loadPlugin("Chat");
        // assume chatId is an optional parameter

        let [chatId] = chatParams;

        if(!chatId){
            chatId = await chat.createChat();
        }
        this.chat = await chat.getChat(chatId);
        return this.chat;
    }
    this.setQueryAgent = async function (agentName) {
    }
    this.setResponseAgent = async function (agentName) {
    }
    this.addAgent = async function (agentName) {
    }
    this.restore = async function(JSONSerialisation) {
        let chat = await $$.loadPlugin("Chat");

        if(JSONSerialisation){
          return await chat.getChat(JSONSerialisation.chat.id);
        }
    }
}

$$.registerCustomType("Chat", Chat);