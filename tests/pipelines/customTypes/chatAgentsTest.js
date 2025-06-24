import {} from "../../deps/clean.mjs";

let workspace = await $$.loadPlugin("Workspace");
const llms =
    [
        {
            "provider": "OpenAI",
            "name": "gpt-4o",
            "type": "text",
            "description": "A cheap model specialized in text generation",
            "capabilities": [
                "chat",
                "completion",
                "embeddings"
            ],
            "pricing": {
                "input": "2.5",
                "output": "10"
            },
            "contextWindow": 128000,
            "knowledgeCuttoff": "2024-08-06"
        },
        {
            "provider": "OpenAI",
            "name": "gpt-3.5-turbo",
            "type": "text",
            "description": "OpenAI's low-cost, high-speed text model",
            "capabilities": ["chat", "completion"],
            "pricing": {
                "input": "1",
                "output": "2"
            },
            "contextWindow": 16385,
            "knowledgeCuttoff": "2023-09-01"
        },
        {
            "provider": "OpenAI",
            "name": "o1-preview",
            "type": "text",
            "description": "Experimental OpenAI model, optimized for preview tasks",
            "capabilities": ["completion"],
            "pricing": {
                "input": "2",
                "output": "6"
            },
            "contextWindow": 128000,
            "knowledgeCuttoff": "2024-08-06"
        },
        {
            "provider": "OpenAI",
            "name": "o1-mini",
            "type": "text",
            "description": "Smaller variant of o1-preview for high-output generation",
            "capabilities": ["completion"],
            "pricing": {
                "input": "1.5",
                "output": "5"
            },
            "contextWindow": 128000,
            "knowledgeCuttoff": "2024-08-06"
        },
        {
            "provider": "OpenAI",
            "name": "gpt-4",
            "type": "text",
            "description": "Previous flagship GPT-4 model",
            "capabilities": ["chat", "completion", "embeddings"],
            "pricing": {
                "input": "6",
                "output": "12"
            },
            "contextWindow": 8192,
            "knowledgeCuttoff": "2023-09-01"
        },
        {
            "provider": "Anthropic",
            "name": "claude-3-opus",
            "type": "text",
            "description": "Anthropic’s most powerful Claude 3 model",
            "capabilities": ["chat", "completion"],
            "pricing": {
                "input": "15",
                "output": "75"
            },
            "contextWindow": 200000,
            "knowledgeCuttoff": "2024-08-01"
        },
        {
            "provider": "Anthropic",
            "name": "claude-3-sonnet",
            "type": "text",
            "description": "Mid-range Claude 3 model with solid performance",
            "capabilities": ["chat", "completion"],
            "pricing": {
                "input": "3",
                "output": "15"
            },
            "contextWindow": 200000,
            "knowledgeCuttoff": "2024-08-01"
        },
        {
            "provider": "Anthropic",
            "name": "claude-3-haiku",
            "type": "text",
            "description": "Fast and cheap Claude model for high-throughput tasks",
            "capabilities": ["chat", "completion"],
            "pricing": {
                "input": "0.25",
                "output": "1.25"
            },
            "contextWindow": 200000,
            "knowledgeCuttoff": "2024-08-01"
        },
        {
            "provider": "Google",
            "name": "gemini-1.5-pro",
            "type": "text",
            "description": "Google’s most capable Gemini model with long context",
            "capabilities": ["chat", "completion", "embeddings"],
            "pricing": {
                "input": "7",
                "output": "21"
            },
            "contextWindow": 1000000,
            "knowledgeCuttoff": "2024-08-01"
        },
        {
            "provider": "Google",
            "name": "gemini-1.5-flash",
            "type": "text",
            "description": "Lightweight Gemini variant optimized for speed",
            "capabilities": ["chat", "completion"],
            "pricing": {
                "input": "1",
                "output": "3"
            },
            "contextWindow": 1000000,
            "knowledgeCuttoff": "2024-08-01"
        }
    ]

const llm = await $$.loadPlugin("LLM");

await llm.registerProvider({name: "OpenAI"});
await llm.registerProvider({name: "Anthropic"});
await llm.registerProvider({name: "Google"});

for (const model of llms) {
    await llm.registerModel(model);
}
let script = `
    @currentUser := "USER.1"
    @currentChatId := "CHAT.1"
    @agentName := "Assistant"
    @agentName2 := "FoodAgent"
    @chat new Chat
    chat.setQueryAgent $currentUser
    chat.setResponseAgent $agentName
    chat.addAgent $agentName2
`;


let docId = await workspace.runCode(script);
