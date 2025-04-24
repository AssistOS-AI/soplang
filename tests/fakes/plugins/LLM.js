async function LLM() {
    const providers = {};
    const self = {};


    self.getModels = async () => mockLlms;
    self.getProviderModels = async (provider) => mockLlms.filter(m => m.provider === provider);
    self.getLlmById = async (id) => mockLlms.find(m => m.id === id);
    self.getLlmByName = async (name) => mockLlms.find(m => m.name === name);

    self.registerProvider = async (providerObject) => {


    }

    self.getTextResponse = async (provider,  modelName, prompt, options = {}) => {

    };

    self.getTextStreamingResponse = async (provider,  modelName, prompt, options = {}, onDataChunk) => {

    };

    self.getChatCompletionResponse = async (provider,  modelName, messages, options = {}) => {

    };

    self.getChatCompletionStreamingResponse = async (provider,  modelName, messages, options = {}, onDataChunk) => {

    };

    return self;
}

let singletonInstance;

export async function getInstance() {
    return singletonInstance || (singletonInstance = await LLM());
}

export function getAllow() {
    return async () => true;
}

export function getDependencies() {
    return ["defaultPersistence"];
}
