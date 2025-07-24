import {} from "../../../deps/clean.mjs";

let workspace = $$.loadPlugin("Workspace");

let myTestCode = `
    @callMacro macro a     
        @b := $a
    end
    callMacro "value"
`;

await workspace.runCode(myTestCode);
await $$.endTest();