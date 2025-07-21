function FakeProvider() {
    this.name = "FakeProvider"
    this.models = [{
        name: "fakeModel",
        type: "chat",
        description: "",
        capabilities: "",
        pricing: "",
        contextWindow: "",
        knowledgeCutoff: ""
    },
    {
        name: "fakeModel2",
        type: "chat",
        description: "",
        capabilities: "",
        pricing: "",
        contextWindow: "",
        knowledgeCutoff: ""
    }]
    const responses = new Map();

    this.getModels = function(){
        return this.models;
    }
    this.getTextResponse = async function(model, prompt, options = {}) {
        if(prompt.includes(`{ "relevant": true/false, "context": "extracted context", "relevance": number from 1 to 10 }`)){
            return `{"relevant": true, "context": "extracted context", "relevance": 10}`;
        } else if(prompt.includes("Give a new relevance score from 1 to 10")){
            return `[10, 7, 5, 0]`;
        }
        return "Hello, I am an AI agent";
    }

    this.getTextStreamingResponse = async function(model, prompt, options = {}, onDataChunk) {
        if (!responses.has(prompt)) {
            return "Hello, I am an AI agent";
        }
        const responseStream = responses.get(prompt)
        const chunks = responseStream.split(' ')
        for (const chunk of chunks) {
            await new Promise(r => setTimeout(r, 2))
            onDataChunk({data: chunk})
        }
        return {data: responseStream}
    }

    this.getChatCompletionResponse = async function (model, messages, options = {}) {
        return "Hello, I am an AI agent";
    }

    this.getChatCompletionStreamingResponse = async function(model, messages, options = {}, onDataChunk) {
        if (!responses.has(messages)) {
            return "Hello, I am an AI agent";
        }
        const responseStream = responses.get(messages)
        for (const responseChunk of responseStream) {
            await new Promise(r => setTimeout(r, 10))
            onDataChunk({data: responseChunk})
        }
        return {data: responseStream}
    }

}
module.exports = new FakeProvider();