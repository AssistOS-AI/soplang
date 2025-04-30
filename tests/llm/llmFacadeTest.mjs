import "../deps/clean.mjs";

import FakeProviderClass from "../fakes/fakeProvider.js";
import {getInstance} from "../../plugins/LLM.js";

const llm = await getInstance(FakeProviderClass);

let Provider
let Models = [];

async function testProviderRegistration (){
    const TestProvider = {
        name: "FakeProvider",
    }
    const provider1 = await llm.registerProvider(TestProvider);
    Provider = await llm.getProvider("FakeProvider");
    $$.deepEqual(Provider, provider1);
}
async function testProviderModelsRegistration (){
    Models = [];
    const models = [
        {name: "text_1", provider: "FakeProvider"},
        {name: "chat_1", provider: "FakeProvider"}
    ]

    for (const model of models) {
        Models.push(await llm.registerModel(model));
    }
    const provider1ModelsIds = await llm.getProviderModels("FakeProvider");

    const provider1Models = await Promise.all(provider1ModelsIds.map(id => llm.getLlmById(id)))

    $$.deepEqual(provider1Models, [Models[0], Models[1]]);

    const text1TextLlm = await llm.getLlmByName("text_1");
    const chat1ChatLlm = await llm.getLlmByName("chat_1");

    $$.deepEqual(text1TextLlm, Models[0]);
    $$.deepEqual(chat1ChatLlm, Models[1]);

    const llmModels = await llm.getModels();
    $$.deepEqual(llmModels, [...Models]);
}
async function testTextResponse(){
    const TEXT_INPUT_PROMPT = "What is the answer to life?"
    const TEXT_OUTPUT_PROMPT_RESPONSE = "42"

    Provider.setResponse(TEXT_INPUT_PROMPT, TEXT_OUTPUT_PROMPT_RESPONSE);

    const textResponse1 = await llm.getTextResponse("FakeProvider", "text_1",TEXT_INPUT_PROMPT);
    $$.checkValue(textResponse1, TEXT_OUTPUT_PROMPT_RESPONSE);
}
async function testTextResponseStreaming(){
    const TEXT_INPUT_STREAM_PROMPT = "Tell me a story"
    const TEXT_OUTPUT_PROMPT_STREAM_RESPONSE = "A car went to a library and never came back"

    Provider.setResponse(TEXT_INPUT_STREAM_PROMPT, TEXT_OUTPUT_PROMPT_STREAM_RESPONSE);

    const textResponse1StreamBuffer = [];
    const textResponse1Stream = await llm.getTextStreamingResponse(
        "FakeProvider",
        "text_1",
        TEXT_INPUT_STREAM_PROMPT,
        {},
        (chunk) => {
            textResponse1StreamBuffer.push(chunk.data);
        }
    );
    $$.checkValue(textResponse1Stream.data,TEXT_OUTPUT_PROMPT_STREAM_RESPONSE);
    $$.checkValue(textResponse1StreamBuffer.join(" "), TEXT_OUTPUT_PROMPT_STREAM_RESPONSE);
}
async function testChatResponse(){
    const CHAT_INPUT_PROMPT = [{role: "user", content: "Hello"}]
    const CHAT_OUTPUT_PROMPT_RESPONSE = "Hello! How can I help?"

    Provider.setResponse(CHAT_INPUT_PROMPT, CHAT_OUTPUT_PROMPT_RESPONSE);

    const chatResponse1 = await llm.getChatCompletionResponse(
        "FakeProvider",
        "chat_1",
        CHAT_INPUT_PROMPT
    );
    $$.checkValue(chatResponse1, CHAT_OUTPUT_PROMPT_RESPONSE);
}
async function testChatResponseStreaming(){
    const CHAT_INPUT_STREAM_PROMPT = [{role: "user", content: "How are you?"}]
    const CHAT_OUTPUT_PROMPT_STREAM_RESPONSE = "I am good, how are you?"

    Provider.setResponse(CHAT_INPUT_STREAM_PROMPT, CHAT_OUTPUT_PROMPT_STREAM_RESPONSE);

    const chatResponse1StreamBuffer = [];
    const chatResponse1Stream = await llm.getChatCompletionStreamingResponse(
        "FakeProvider",
        "chat_1",
        CHAT_INPUT_STREAM_PROMPT,
        {},
        (chunk) => {
            chatResponse1StreamBuffer.push(chunk.data);
        }
    );

    $$.checkValue(chatResponse1Stream.data, CHAT_OUTPUT_PROMPT_STREAM_RESPONSE);
    $$.checkValue(chatResponse1StreamBuffer.join(""), CHAT_OUTPUT_PROMPT_STREAM_RESPONSE);
}

await testProviderRegistration();
await testProviderModelsRegistration();
await testTextResponse();
await testTextResponseStreaming();
await testChatResponse();
await testChatResponseStreaming();

await $$.endTest();
