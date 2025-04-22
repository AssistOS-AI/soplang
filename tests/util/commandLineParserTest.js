let util = await import("../../src/util/soplangUtil.js")
let parseCommandLine = util.parseCommandLine;
let compareObjects = util.compareObjects;
let assert = import("assert");


let allOk = true;


allOk |= compareObjects(parseCommandLine("generate @documentIdentifier 'Document Title' $Chapter1[cmd1 args1 space> ]  'Chapter 2'[cmd2 args2] 'Chapter N' [cmdn 1 2 3]"), {
    command: "generate",
    outputVars: ["documentIdentifier"],
    inputVars: ["Document Title", "Chapter1", "cmd1 args1 space> ", "Chapter 2", "cmd2 args2", "Chapter N", "cmdn 1 2 3"],
    varTypes: ['text',  "var", "embeddedCommand", 'text', "embeddedCommand", "text", "embeddedCommand"]
});

allOk |=compareObjects(parseCommandLine("appendChapter @documentIdentifier 'Chapter Title' [command arguments]"), {
    command: "appendChapter",
    outputVars: ["documentIdentifier"],
    inputVars: ["Chapter Title", "command arguments"],
    varTypes: ["text", "embeddedCommand"]
});

allOk |=compareObjects(parseCommandLine("define @output 'string Value'"), {
    command: "define",
    outputVars: ["output"],
    inputVars: ["string Value"],
    varTypes: ["text"]
});

allOk |=compareObjects(parseCommandLine("set @putHere $input1 $input2  test   value ...   $inputN   "), {
    command: "set",
    outputVars: ["putHere"],
    inputVars: ["input1", "input2", "test", "value", "...", "inputN"],
    varTypes: ["var", "var", "text", "text", "text", "var"]

});

allOk |=compareObjects(parseCommandLine("attach @attachName type attachmentURI"), {
    command: "attach",
    outputVars: ["attachName"],
    inputVars: ["type", "attachmentURI"],
    varTypes: ["text", "text"]
});

allOk |=compareObjects(parseCommandLine("link localVariable $variableRepresentingOtherDocument variableInOtherDocument"), {
       command: "link",
        outputVars: [],
       inputVars: ["localVariable", "variableRepresentingOtherDocument", "variableInOtherDocument"],
       varTypes: ["text", "var", "text"]
});

allOk |=compareObjects(parseCommandLine("define @output ssi:type:domain:value1:value2:value3"), {
    command: "define",
    outputVars: ["output"],
    inputVars: ["ssi:type:domain:value1:value2:value3"],
    varTypes: ["text"]
});


allOk |=compareObjects(parseCommandLine("import fileURI"), {
    command: "import",
    outputVars: [],
    inputVars: ["fileURI"],
    varTypes: ["text"]
});

allOk |=compareObjects(parseCommandLine("table @table  column1 column2  column3"), {
    command: "table",
    outputVars: ["table"],
    inputVars: ["column1", "column2", "column3"],
    varTypes: ["text", "text", "text"]
});

allOk |=compareObjects(parseCommandLine("line @variableName $tableName"), {
    command: "line",
    outputVars: ["variableName"],
    inputVars: ["tableName"],
    varTypes: ["var"]
});

allOk |=compareObjects(parseCommandLine("set @variableName.columnName input1 $input2 ... inputN"), {
    command: "set",
    outputVars: ["variableName.columnName"],
    inputVars: ["input1", "input2", "...", "inputN"],
    varTypes: ["text", "var", "text", "text"]
});

allOk |=compareObjects(parseCommandLine("sum @results $table.columnName"), {
    command: "sum",
    outputVars: ["results"],
    inputVars: ["table.columnName"],
    varTypes: ["var"]
});

allOk |=compareObjects(parseCommandLine('define @output "string Value"'), {
    command: "define",
    outputVars: ["output"],
    inputVars: ["string Value"],
    varTypes: ["text"]
});

allOk |=compareObjects(parseCommandLine("ask agentName @output $input1 $input2 'some input' $inputN"), {
    command: "ask",
    outputVars: ["output"],
    inputVars: ["agentName", "input1", "input2", 'some input', "inputN"],
    varTypes: ["text", "var", "var", "text", "var"]
});

allOk |=compareObjects(parseCommandLine("tableFrom @tableName $inputTable newTableCol1 [sum column1 column2 column3]  newTableCol2[set column5 a b ]"), {
    command: "tableFrom",
    outputVars: ["tableName"],
    inputVars: ["inputTable", "newTableCol1", "sum column1 column2 column3", "newTableCol2", "set column5 a b "],
    varTypes: ["var", "text", "embeddedCommand", "text", "embeddedCommand"]
});


console.log("All tests passed:", allOk? "true" : "false");
console.assert(allOk !== true, "Some tests failed");