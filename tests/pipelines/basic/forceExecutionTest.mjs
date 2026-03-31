import {} from "../../deps/clean.mjs";
import { getVarClock, getVarID } from "../../../src/graph/varUtil.js";

let workspace = $$.loadPlugin("Workspace");

let script = `
    @counter jsdef
        if(globalThis.__forceExecutionCounter === undefined){
            globalThis.__forceExecutionCounter = 0;
        }
        globalThis.__forceExecutionCounter++;
        return globalThis.__forceExecutionCounter;
    end

    @normal counter
    @forced !counter $normal
    @forcedSuffix counter! $forced
`;

let docId = await workspace.runCode(script);

await $$.checkDocVar(docId, "normal", 1);
await $$.checkDocVar(docId, "forced", 2);
await $$.checkDocVar(docId, "forcedSuffix", 3);

let normalVarId = getVarID(docId, "normal");
let forcedVarId = getVarID(docId, "forced");
let forcedSuffixVarId = getVarID(docId, "forcedSuffix");

let normalClockBefore = await getVarClock(normalVarId);
let forcedClockBefore = await getVarClock(forcedVarId);
let forcedSuffixClockBefore = await getVarClock(forcedSuffixVarId);

await workspace.buildAll();

await $$.checkDocVar(docId, "normal", 1);
await $$.checkDocVar(docId, "forced", 4);
await $$.checkDocVar(docId, "forcedSuffix", 5);

let normalClockAfter = await getVarClock(normalVarId);
let forcedClockAfter = await getVarClock(forcedVarId);
let forcedSuffixClockAfter = await getVarClock(forcedSuffixVarId);

$$.checkValue(normalClockAfter, normalClockBefore, "Normal command clock should remain unchanged without !");
if (forcedClockAfter === forcedClockBefore) {
    console.error("Forced prefix command clock should change on each build");
    $$.failTest();
}
if (forcedSuffixClockAfter === forcedSuffixClockBefore) {
    console.error("Forced suffix command clock should change on each build");
    $$.failTest();
}

await $$.endTest();
