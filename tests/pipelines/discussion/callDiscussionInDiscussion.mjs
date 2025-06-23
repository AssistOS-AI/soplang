import {} from "../../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");

let script = `
    @sports discussion
        @preferences := Football
    end
    @weather discussion
        @sportsDiscussion sports
    end
    @res weather 
`;
let docId = await workspace.runCode(script);
let localDocId = await workspace.getVarValue(docId, "res");
let innerDocId = await workspace.getVarValue(localDocId, "sportsDiscussion");
await $$.checkDocVar(innerDocId, "preferences", "Football");

$$.endTest();