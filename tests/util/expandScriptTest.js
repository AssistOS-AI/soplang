let util = await import("../../src/util/soplangUtil.js")
let parseCommandLine = util.parseCommandLine;
let compareObjects = util.compareObjects;
let expandScript = util.expandScript;
let assert = import("assert");


let allOk = true;

let parsedCommand = parseCommandLine( '@runTest script "hello,world" "@res := $hello $world %0Areturn $res "');
console.log(parsedCommand);

allOk |= compareObjects(parsedCommand, {
    command: "script",
    outputVars: ["runTest"],
    inputVars: ["hello,world", "@res := $hello $world %0A return $res "],
    varTypes: ['text',  'text']
});

let expandedScript = expandScript('exec1001', parsedCommand , "$a", "b" , "c");
console.log(expandedScript);

console.log("All tests passed:", allOk? "true" : "false");
console.assert(allOk !== true, "Some tests failed");