import "../deps/clean.mjs";
import assert from "assert";

import FakeProvider from "../fakes/fakeProvider.js";
import { getInstance } from "../../../globalServerlessAPI/workspacePlugins/LLM.js";

const persistence = await $$.loadPlugin("DefaultPersistence");
const llm = await getInstance(FakeProvider);


const TEST_PROMPT = "What is the answer to life?";
const TEST_STREAM = "This is a streamed response";
const TEST_CHAT = [{ role: "user", content: "Hello" }];
const TEST_CHAT_STREAM = ["Thinking...", "Here's", " the answer"];

async function setupProvider() {
    await persistence.createProvider({
        name: "FakeProvider",
        models: [
            { name: "text-model", provider: "FakeProvider" },
            { name: "chat-model", provider: "FakeProvider" }
        ]
    });

    const provider = await llm.getProvider("FakeProvider");
    provider.setResponse(TEST_PROMPT, "42");
    provider.setResponse(TEST_CHAT, "Hello! How can I help?");
}

async function runTests() {
    try {
        await setupProvider();

        const models = await llm.getProviderModels("FakeProvider");
        assert.deepStrictEqual(models.map(m => m.name), ["text-model", "chat-model"],
            "Should return configured models");

        const textResponse = await llm.getTextResponse("FakeProvider", "text-model", TEST_PROMPT);
        assert.strictEqual(textResponse, "42", "Should return preset text response");

        const streamChunks = [];
        const streamResponse = await llm.getTextStreamingResponse(
            "FakeProvider",
            "text-model",
            TEST_PROMPT,
            {},
            chunk => streamChunks.push(chunk.data)
        );
        assert.strictEqual(streamResponse.data, TEST_STREAM, "Should return full stream response");
        assert.deepStrictEqual(streamChunks, TEST_STREAM.split(' '), "Should receive all chunks");

        const chatResponse = await llm.getChatCompletionResponse(
            "FakeProvider",
            "chat-model",
            TEST_CHAT
        );
        assert.strictEqual(chatResponse, "Hello! How can I help?", "Should return preset chat response");

        const chatStreamChunks = [];
        const chatStreamResponse = await llm.getChatCompletionStreamingResponse(
            "FakeProvider",
            "chat-model",
            TEST_CHAT,
            {},
            chunk => chatStreamChunks.push(chunk.data)
        );
        assert.strictEqual(chatStreamResponse.data.join(''), TEST_CHAT_STREAM.join(''),
            "Should return full chat stream");
        assert.deepStrictEqual(chatStreamChunks, TEST_CHAT_STREAM,
            "Should receive all chat chunks in order");

        try {
            await llm.getTextResponse("InvalidProvider", "model", "test");
            assert.fail("Should throw provider not found error");
        } catch (e) {
            assert.match(e.message, /Provider InvalidProvider not found/);
        }

        try {
            await llm.getTextResponse("FakeProvider", "invalid-model", "test");
            assert.fail("Should throw model not found error");
        } catch (e) {
            assert.match(e.message, /Model invalid-model not found/);
        }
        console.log("✅ All LLM tests passed");
    } catch (error) {
        console.error("❌ Test failed:", error);
        throw error;
    } finally {
        await $$.endTest();
    }
}

await runTests();