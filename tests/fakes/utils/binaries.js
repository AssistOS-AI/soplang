export default {
    executeBinary: async (binary, path, args = []) => {
        const subcommand = args[0];

        switch (subcommand) {
            case 'generateText':
                return "This is a mock text generation response from our AI service.";
            case "getChatCompletion":
                return JSON.stringify({
                    id: "chatcmpl-fake123",
                    object: "chat.completion",
                    created: Math.floor(Date.now() / 1000),
                    model: "gpt-4o-mock",
                    choices: [
                        {
                            index: 0,
                            message: {
                                role: "assistant",
                                content: "This is a mock chat completion response."
                            },
                            finish_reason: "stop"
                        }
                    ],
                    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
                });
            default:
                throw new Error(`Unknown subcommand: ${subcommand}`);
        }
    },

    executeBinaryStreaming: async (binary, path, args = [], onDataChunk) => {
        const subcommand = args[0];

        const generateChunks = (baseWords) => {
            const words = baseWords.split(" ");
            return words.map(word => `data: {"choices":[{"delta":{"content":"${word}"}}]}\n\n`);
        };

        const mockStreamData = {
            generateTextStreaming: [
                'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
                ...generateChunks("Streaming response containing multiple chunks generated sequentially for testing the stream interface properly across different scenarios and platforms ensuring robustness under continuous load"),
                'data: [DONE]\n\n'
            ],
            getChatCompletionStreaming: [
                'data: {"choices":[{"delta":{"role":"assistant"}}]}\n\n',
                ...generateChunks("Streaming response containing multiple chunks generated sequentially for testing the stream interface properly across different scenarios and platforms ensuring robustness under continuous load"),
                'data: [DONE]\n\n'
            ]
        };

        const stream = mockStreamData[subcommand];
        if (!stream) throw new Error(`Unknown streaming subcommand: ${subcommand}`);

        stream.forEach((chunk, i) => {
            setTimeout(() => onDataChunk(chunk), i * 50);
        });

        return new Promise(resolve => setTimeout(resolve, stream.length * 50 + 50));
    }
};
