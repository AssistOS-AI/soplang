return ;

import "../deps/clean.mjs";
import assert from "assert";
import { performance } from "perf_hooks";
import { getInstance } from "../fakes/plugins/LLM.js";

const llm = await getInstance();

await llm.registerLlmProvider({
    name: "demo",
    models: [
        { id: "demo-1", name: "demo-a", provider: "demo" },
        { id: "demo-2", name: "demo-b", provider: "demo" }
    ]
});

const all = await llm.getModels();
assert.strictEqual(all.length, 2);
assert.deepStrictEqual(await llm.getProviderModels("demo"), all);
assert.deepStrictEqual(await llm.getProviderModels("unknown"), []);

for (const m of all) {
    assert.deepStrictEqual(await llm.getLlmById(m.id), m);
    assert.deepStrictEqual(await llm.getLlmByName(m.name), m);
}

const promptA = "hello world";
const promptB = "another input";

const textA1 = await llm.getTextResponse("demo", "demo-a", promptA, {});
const textA2 = await llm.getTextResponse("demo", "demo-a", promptA, {});
const textB  = await llm.getTextResponse("demo", "demo-b", promptB, {});

assert.strictEqual(textA1, textA2);

const chunks = [];
const stamps = [];

await llm.getTextStreamingResponse(
    "demo",
    "demo-a",
    promptA,
    {},
    (c) => { chunks.push(c); stamps.push(performance.now()); }
);

assert.strictEqual(chunks.join(""), textA1);
assert.ok(chunks.length >= textA1.length);


for (let i = 1; i < Math.min(10, stamps.length); i++) {
    const dt = stamps[i] - stamps[i - 1];
    assert.ok(dt >= 95 && dt <= 510, `interval ${dt} ms out of bounds`);
}


const messages = [
    { role: "user", content: "alpha" },
    { role: "assistant", content: "beta" },
    { role: "user", content: "gamma" }
];
const joined = messages.map(m => m.content).join(" ");

const chat = await llm.getChatCompletionResponse("demo", "demo-b", messages, {});

const cChunks = [];
await llm.getChatCompletionStreamingResponse(
    "demo",
    "demo-b",
    messages,
    {},
    c => cChunks.push(c)
);
assert.strictEqual(cChunks.join(""), chat);

console.log("✅  All detailed LLM façade tests passed");
await $$.endTest();
