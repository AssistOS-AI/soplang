const {default: Provider} = await import('../utils/provider.js')

async function LLM() {
    const providers = {}
    const self = {}

    self.registerLlmProvider = async (providerData) => {
        const p = new Provider(providerData)
        providers[p.name] = p
    }

    self.getModels = async () => (await Promise.all(Object.values(providers).map(p => p.getModels()))).flat()
    self.getProviderModels = async (name) => providers[name]?.getModels() ?? []

    self.getLlmById = async (id) => {
        for (const p of Object.values(providers))
            for (const m of await p.getModels()) if (m.id === id) return m
    }

    self.getLlmByName = async (name) => {
        for (const p of Object.values(providers))
            for (const m of await p.getModels()) if (m.name === name) return m
    }

    self.getTextResponse = async (provider, model, prompt, options = {}) =>
        providers[provider].getTextResponse(model, prompt, options)

    self.getTextStreamingResponse = async (provider, model, prompt, options = {}, onDataChunk) => {
        return providers[provider].getTextStreamingResponse(model, prompt, options, onDataChunk)
    }

    self.getChatCompletionResponse = async (provider, model, messages, options = {}) => {
        return providers[provider].getChatCompletionResponse(model, messages, options)
    }

    self.getChatCompletionStreamingResponse = async (provider, model, messages, options = {}, onDataChunk) => {
        return providers[provider].getChatCompletionStreamingResponse(model, messages, options, onDataChunk)
    }

    return self
}

let singleton

export async function getInstance() {
    return singleton || (singleton = await LLM())
}

export function getAllow() {
    return async () => true
}

export function getDependencies() {
    return []
}
