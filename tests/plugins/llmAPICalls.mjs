import {} from "../deps/clean.mjs";
import path from "path";
import assert from "assert";
const llmPlugin = $$.loadPlugin("LLM");
await llmPlugin.registerProviders(path.join(process.cwd(),"../providers"));

let Provider = llmPlugin.getProvider("FakeProvider")
Provider.setResponse("Hello LLM, how are you?", "I'm fine thank you!");
let message = await llmPlugin.getTextResponse("FakeProvider", "fakeModel", "Hello LLM, how are you?")
assert(message === "I'm fine thank you!", "LLM should respond with 'I'm fine thank you!'");

let responseChunks = ["I'm", " fine", " thank", " you!"];
let i = 0;
llmPlugin.getTextStreamingResponse("FakeProvider", "fakeModel", "Hello LLM, how are you?", {}, (result) => {
    assert(result.data === responseChunks[i]);
    i++;
});
await $$.endTest();
