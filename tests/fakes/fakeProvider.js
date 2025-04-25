export default class FakeProvider {
    constructor(name, models) {
        if (FakeProvider.instance) {
            return FakeProvider.instance;
        }
        FakeProvider.instance = this;
        this.name = name
        this.models = models
        this.responses = new Map()
    }

    async getModels() {
        return this.models
    }

    setResponse(input, output) {
        this.responses.set(input, output)
    }

    async getTextResponse(model, prompt, options = {}) {
        if (!this.responses.has(prompt)) {
            throw new Error(`No response set for ${prompt}`)
        }
        return this.responses.get(prompt)
    }

    async getTextStreamingResponse(model, prompt, options = {}, onDataChunk) {
        if (!this.responses.has(prompt)) {
            throw new Error(`No response set for ${prompt}`)
        }
        const responseStream = this.responses.get(prompt)
        const chunks = responseStream.split(' ')
        for (const chunk of chunks) {
            await new Promise(r => setTimeout(r, 2))
            onDataChunk({data: chunk})
        }
        return {data: responseStream}
    }

    async getChatCompletionResponse(model, messages, options = {}) {
        if (!this.responses.has(messages)) {
            throw new Error(`No response set for ${messages}`)
        }
        return this.responses.get(messages)
    }

    async getChatCompletionStreamingResponse(model, messages, options = {}, onDataChunk) {
        if (!this.responses.has(messages)) {
            throw new Error(`No response set for ${messages}`)
        }
        const responseStream = this.responses.get(messages)
        for (const responseChunk of responseStream) {
            await new Promise(r => setTimeout(r, 10))
            onDataChunk({data: responseChunk})
        }
        return {data: responseStream}
    }
}
