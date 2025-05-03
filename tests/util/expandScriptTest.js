
let util = await import("../../src/util/soplangUtil.js")
let parseCommandLine = util.parseCommandLine;
let compareObjects = util.compareObjects;
let expandCode = util.expandMacro;
let assert = import("assert");


let allOk = true;

let parsedCommand = parseCommandLine( '@runTest macro "hello,world" "@res := $hello $world %0Areturn $res "');
console.log(parsedCommand);

allOk |= compareObjects(parsedCommand, {
    command: "macro",
    outputVars: ["runTest"],
    inputVars: ["hello,world", "@res := $hello $world %0A return $res "],
    varTypes: ['text',  'text']
});

let expandedCode = expandCode('exec1001', parsedCommand , "$a", "b" , "c");
console.log(expandedCode);

console.log("All tests passed:", allOk? "true" : "false");
console.assert(allOk !== true, "Some tests failed");