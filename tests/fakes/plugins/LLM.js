import mockBinaries from '../utils/binaries.js';

const mockLlms = [
    {
        id: "openai-gpt4o",
        name: "gpt-4o",
        provider: "OpenAI",
        type: "chat",
        capabilities: ["chat-completion", "text-generation"],
        description: "Mocked GPT-4 Omni model",
        pricing: { per_input_token: 0.000005, per_output_token: 0.000015 },
        contextWindow: 128000,
        knowledgeCuttoff: "2024-04"
    },
    {
        id: "anthropic-claude3",
        name: "claude-3-opus",
        provider: "Anthropic",
        type: "chat",
        capabilities: ["chat-completion", "complex-reasoning"],
        description: "Mocked Claude 3 Opus model",
        pricing: { per_input_token: 0.000015, per_output_token: 0.000075 },
        contextWindow: 200000,
        knowledgeCuttoff: "2024-03"
    }
];

function buildArgs({ subcommand, apiKey, model, promptOrMessages, options = {}, streaming = false }) {
    const args = [subcommand, "-k", apiKey, "-m", model];

    const payload = typeof promptOrMessages === 'string' ? promptOrMessages : JSON.stringify(promptOrMessages);
    args.push("-p", payload);

    if (streaming) args.push("--stream");
    if (options.temperature !== undefined) args.push("--temperature", options.temperature);
    if (options.top_p !== undefined) args.push("--top_p", options.top_p);
    if (options.frequency_penalty !== undefined) args.push("--frequency_penalty", options.frequency_penalty);
    if (options.presence_penalty !== undefined) args.push("--presence_penalty", options.presence_penalty);
    if (options.stop !== undefined) args.push("--stop", options.stop);
    if (options.max_tokens !== undefined) args.push("--max_tokens", options.max_tokens);

    return args;
}

async function LLM() {
    const self = {};

    self.getModels = async () => mockLlms;
    self.getProviderModels = async (provider) => mockLlms.filter(m => m.provider === provider);
    self.getLlmById = async (id) => mockLlms.find(m => m.id === id);
    self.getLlmByName = async (name) => mockLlms.find(m => m.name === name);

    self.getTextResponse = async ({provider, apiKey, model, prompt, options = {}}) => {
        const args = buildArgs({subcommand: "generateText", apiKey, model, promptOrMessages: prompt, options});
        return await mockBinaries.executeBinary(provider, null, args);
    };

    self.getTextStreamingResponse = async ({provider, apiKey, model, prompt, options = {}, onDataChunk}) => {
        const args = buildArgs({subcommand: "generateTextStreaming", apiKey, model, promptOrMessages: prompt, options, streaming: true});
        return await mockBinaries.executeBinaryStreaming(provider, null, args, onDataChunk);
    };

    self.getChatCompletionResponse = async ({provider, apiKey, model, messages, options = {}}) => {
        const args = buildArgs({subcommand: "getChatCompletion", apiKey, model, promptOrMessages: messages, options});
        return JSON.parse(await mockBinaries.executeBinary(provider, null, args));
    };

    self.getChatCompletionStreamingResponse = async ({provider, apiKey, model, messages, options = {}, onDataChunk}) => {
        const args = buildArgs({subcommand: "getChatCompletionStreaming", apiKey, model, promptOrMessages: messages, options, streaming: true});
        return await mockBinaries.executeBinaryStreaming(provider, null, args, onDataChunk);
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
