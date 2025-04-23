import {} from "../deps/clean.mjs";
import assert from "assert";
import { getInstance } from "../fakes/plugins/LLM.js";
import mockBinaries from "../fakes/utils/binaries.js";

const originalExec = mockBinaries.executeBinary;
const originalStream = mockBinaries.executeBinaryStreaming;
let execArgs, streamArgs;

mockBinaries.executeBinary = async (binary, path, args) => {
    execArgs = args;
    return await originalExec(binary, path, args);
};
mockBinaries.executeBinaryStreaming = async (binary, path, args, onDataChunk) => {
    streamArgs = args;
    return await originalStream(binary, path, args, onDataChunk);
};

const llm = await getInstance();

const models = await llm.getModels();
assert.strictEqual(models.length, 2);
assert.strictEqual((await llm.getProviderModels("OpenAI"))[0].name, "gpt-4o");
assert.strictEqual((await llm.getLlmById("anthropic-claude3")).provider, "Anthropic");
assert.strictEqual((await llm.getLlmByName("gpt-4o")).id, "openai-gpt4o");

const text = await llm.getTextResponse({
    provider: "OpenAI",
    apiKey: "k",
    model: "gpt-4o",
    prompt: "Hi",
    options: { temperature: 0.42, max_tokens: 50 }
});
assert.ok(text.includes("mock text generation"));
assert.ok(execArgs.includes("--temperature"));
assert.ok(execArgs.includes(0.42));
assert.ok(execArgs.includes("--max_tokens"));
assert.ok(execArgs.includes(50));

const chat = await llm.getChatCompletionResponse({
    provider: "OpenAI",
    apiKey: "k",
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hi" }]
});
assert.strictEqual(chat.object, "chat.completion");
assert.strictEqual(chat.choices[0].message.role, "assistant");

const tChunks = [];
await llm.getTextStreamingResponse({
    provider: "OpenAI",
    apiKey: "k",
    model: "gpt-4o",
    prompt: "Hi",
    options: {},
    onDataChunk: c => tChunks.push(c)
});
assert.ok(tChunks.length >= 20);
assert.ok(tChunks[0].includes('"role":"assistant"'));
assert.ok(tChunks.at(-1).includes("[DONE]"));
assert.ok(streamArgs.includes("--stream"));

const cChunks = [];
await llm.getChatCompletionStreamingResponse({
    provider: "OpenAI",
    apiKey: "k",
    model: "gpt-4o",
    messages: [{ role: "user", content: "Hi" }],
    options: {},
    onDataChunk: c => cChunks.push(c)
});
assert.ok(cChunks.length >= 20);
assert.ok(cChunks.at(-1).includes("[DONE]"));

mockBinaries.executeBinary = originalExec;
mockBinaries.executeBinaryStreaming = originalStream;

await $$.endTest();
