const responses = new Map();

export default class FakeProvider {
    constructor(name, models, id) {
        if (FakeProvider.instance) {
            return FakeProvider.instance;
        }
        FakeProvider.instance = this;
        this.name = name
        this.id = id;
        this.models = models || [];
    }

    setResponse(input, output) {
        responses.set(input, output)
    }

    async getTextResponse(model, prompt, options = {}) {
        if (!responses.has(prompt)) {
            throw new Error(`No response set for ${prompt}`)
        }
        return responses.get(prompt)
    }

    async getTextStreamingResponse(model, prompt, options = {}, onDataChunk) {
        if (!responses.has(prompt)) {
            throw new Error(`No response set for ${prompt}`)
        }
        const responseStream = responses.get(prompt)
        const chunks = responseStream.split(' ')
        for (const chunk of chunks) {
            await new Promise(r => setTimeout(r, 2))
            onDataChunk({data: chunk})
        }
        return {data: responseStream}
    }

    async getChatCompletionResponse(model, messages, options = {}) {
        if (!responses.has(messages)) {
            throw new Error(`No response set for ${messages}`)
        }
        return responses.get(messages)
    }

    async getChatCompletionStreamingResponse(model, messages, options = {}, onDataChunk) {
        if (!responses.has(messages)) {
            throw new Error(`No response set for ${messages}`)
        }
        const responseStream = responses.get(messages)
        for (const responseChunk of responseStream) {
            await new Promise(r => setTimeout(r, 10))
            onDataChunk({data: responseChunk})
        }
        return {data: responseStream}
    }

    async getTextResponseJson(m, p, o = {}) {
        return this.getTextResponse(m, p, {...o, json: true})
    }

    async getTextStreamingResponseJson(m, p, o = {}, cb) {
        return this.getTextStreamingResponse(m, p, {...o, json: true}, cb)
    }

    async getChatCompletionResponseJson(m, msg, o = {}) {
        return this.getChatCompletionResponse(m, msg, {...o, json: true})
    }

    async getChatCompletionStreamingResponseJson(m, msg, o = {}, cb) {
        return this.getChatCompletionStreamingResponse(m, msg, {...o, json: true}, cb)
    }

}
