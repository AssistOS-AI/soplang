import {} from "../../../deps/clean.mjs";

let workspace = await $$.loadPlugin("Workspace");

let myTestCode = `
    @callMacro macro a     
        @b := $a
    end
    callMacro "value"
`;

await workspace.runCode(myTestCode);
await $$.endTest();