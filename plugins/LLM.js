async function LLM(Provider) {
    const self = {};

    const persistence = await $$.loadPlugin("DefaultPersistence");

    await persistence.configureTypes({
        llm: {
            id: "random",
            name: "string",
            provider: "provider",
            type: "string",
            capabilities: "array string",
            description: "string",
            pricing: "object",
            contextWindow: "integer",
            knowledgeCuttoff: "date"
        },
        provider: {
            id: "random",
            name: "string",
            models: "array llm"
        }
    })

    await persistence.createIndex("llm", "name");
    await persistence.createIndex("provider", "name");

    const getProvider = async function (providerName) {
        const provider = await persistence.getProviderByName(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} not found`);
        }
        return new Provider(provider.name, provider.models, provider.id);
    }
    self.registerProvider = async function (providerObject) {
        if (!providerObject.models) {
            providerObject.models = []
        }
        return await persistence.createProvider(providerObject);
    }

    self.registerModel = async function (llmObject) {
        const provider = await persistence.getProviderByName(llmObject.provider);
        if (!provider) {
            await self.registerProvider({name: llmObject.provider, models: []});
        }
        const providerObject = await persistence.getProviderByName(llmObject.provider);
        const llm = await persistence.createLlm(llmObject);
        providerObject.models.push(llm.id);
        await persistence.updateProvider(providerObject.id, providerObject);
        return llm
    }

    self.getProvider = async function (providerName) {
        return await getProvider(providerName);
    }
    self.getModels = async function () {
        return await persistence.getEveryLlmObject();
    }

    self.getProviderModels = async function (providerName) {
        const provider = await getProvider(providerName);
        return provider.models;
    }

    self.getLlmByName = async function (name) {
        return await persistence.getLlmByName(name);
    }
    self.getLlmById = async function (id) {
        const models = await persistence.getEveryLlmObject();
        for (const model of models) {
            if (model.id === id) {
                return model;
            }
        }
        throw new Error(`Model with id ${id} not found`);
    }

    self.getTextResponse = async (provider, model, prompt, options = {}) => {
        const Provider = await getProvider(provider)
        return await Provider.getTextResponse(model, prompt, options);
    }

    self.getTextStreamingResponse = async (provider, model, prompt, options = {}, onDataChunk) => {
        const Provider = await getProvider(provider)
        return await Provider.getTextStreamingResponse(model, prompt, options, onDataChunk);
    }

    self.getChatCompletionResponse = async (provider, model, messages, options = {}) => {
        const Provider = await getProvider(provider)
        return await Provider.getChatCompletionResponse(model, messages, options);
    }

    self.getChatCompletionStreamingResponse = async (provider, model, messages, options = {}, onDataChunk) => {
        const Provider = await getProvider(provider)
        return await Provider.getChatCompletionStreamingResponse(model, messages, options, onDataChunk);
    }
    self.getTextResponseJson = (provider, model, prompt, options = {}) =>
        self.getTextResponse(provider, model, prompt, {...options, json: true})

    self.getTextStreamingResponseJson = (provider, model, prompt, options = {}, onDataChunk) =>
        self.getTextStreamingResponse(provider, model, prompt, {...options, json: true}, onDataChunk)

    self.getChatCompletionResponseJson = (provider, model, messages, options = {}) =>
        self.getChatCompletionResponse(provider, model, messages, {...options, json: true})

    self.getChatCompletionStreamingResponseJson = (provider, model, messages, options = {}, onDataChunk) =>
        self.getChatCompletionStreamingResponse(provider, model, messages, {...options, json: true}, onDataChunk)

    return self;
}
let singletonInstance;

const getInstance = async function (ProviderArg) {
    //const Provider = ProviderArg || (await import('../../apihub-component-utils/provider.js')).default

    if (!singletonInstance) {
        singletonInstance = await LLM();
    }
    return singletonInstance;
}
const getAllow = function () {
    return async function (globalUserId, email, command, ...args) {
        return true;
    }
}
const getDependencies = function () {
    return ["DefaultPersistence"];
}
export {
    getInstance,
    getAllow,
    getDependencies
}