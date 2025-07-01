function FakeProvider() {
    this.name = "FakeProvider"
    this.models = [{
        name: "fakeModel",
        type: "chat",
        description: "GPT-3.5 Turbo model for chat completions",
        capabilities: "",
        pricing: "",
        contextWindow: "",
        knowledgeCutoff: ""
    },
    {
        name: "fakeModel2",
        type: "chat",
        description: "GPT-4 model for chat completions",
        capabilities: "",
        pricing: "",
        contextWindow: "",
        knowledgeCutoff: ""
    }]
    const responses = new Map();

    this.getModels = function(){
        return this.models;
    }
    this.setResponse = function(input, output) {
        responses.set(input, output)
    }

    this.getTextResponse = async function(model, prompt, options = {}) {
        if (!responses.has(prompt)) {
            return "Hello, I am an AI agent";
        }
        return responses.get(prompt)
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
        if (!responses.has(messages)) {
            return "Hello, I am an AI agent";
        }
        return responses.get(messages)
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