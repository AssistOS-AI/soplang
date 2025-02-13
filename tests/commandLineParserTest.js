let util =require("../src/soplangUtil.js")
let parseCommandLine = util.parseCommandLine;
let assert = require("assert");



function findFirstDifference(str1, str2) {
    let minLength = Math.min(str1.length, str2.length);

    for (let i = 0; i < minLength; i++) {
        if (str1[i] !== str2[i]) {
            return i;
        }
    }
    return str1.length !== str2.length ? minLength : -1;
}

let allOk = true;
 function compareObjects (obtained, expected) {
    for(let key in obtained){
        let obtainedStr = obtained[key].join("");
        let expectedStr = expected[key].join("");
        if(obtainedStr !== expectedStr){
            //let diff = findFirstDifference(obtainedStr, expectedStr);
            //let str1 = obtainedStr.substring(0, diff+1);
            //let str2 = expectedStr.substring(0, diff+1);
           // console.log("Difference at", diff, "obtained", str1, "expected", str2);
            console.error("Key", key, "is different for expected", expected[key], " but result was ", obtained[key]);
            return false;
        }
    }
    return true;
}

allOk |= compareObjects(parseCommandLine("generate @documentIdentifier 'Document Title' $Chapter1[cmd1 args1 space> ]  'Chapter 2'[cmd2 args2] 'Chapter N' [cmdn 1 2 3]"), {
    commandName: "generate",
    outputVars: ["documentIdentifier"],
    inputVars: ["Document Title", "Chapter1", "cmd1 args1 space> ", "Chapter 2", "cmd2 args2", "Chapter N", "cmdn 1 2 3"],
    varTypes: ['text',  "var", "embeddedCommand", 'text', "embeddedCommand", "text", "embeddedCommand"]
});

allOk |=compareObjects(parseCommandLine("appendChapter @documentIdentifier 'Chapter Title' [command arguments]"), {
    commandName: "appendChapter",
    outputVars: ["documentIdentifier"],
    inputVars: ["Chapter Title", "command arguments"],
    varTypes: ["text", "embeddedCommand"]
});

allOk |=compareObjects(parseCommandLine("define @output 'string Value'"), {
    commandName: "define",
    outputVars: ["output"],
    inputVars: ["string Value"],
    varTypes: ["text"]
});

allOk |=compareObjects(parseCommandLine("set @putHere $input1 $input2  test   value ...   $inputN   "), {
    commandName: "set",
    outputVars: ["putHere"],
    inputVars: ["input1", "input2", "test", "value", "...", "inputN"],
    varTypes: ["var", "var", "text", "text", "text", "var"]

});

allOk |=compareObjects(parseCommandLine("attach @attachName type attachmentURI"), {
    commandName: "attach",
    outputVars: ["attachName"],
    inputVars: ["type", "attachmentURI"],
    varTypes: ["text", "text"]
});

allOk |=compareObjects(parseCommandLine("link localVariable $variableRepresentingOtherDocument variableInOtherDocument"), {
       commandName: "link",
        outputVars: [],
       inputVars: ["localVariable", "variableRepresentingOtherDocument", "variableInOtherDocument"],
       varTypes: ["text", "var", "text"]
});

allOk |=compareObjects(parseCommandLine("define @output ssi:type:domain:value1:value2:value3"), {
    commandName: "define",
    outputVars: ["output"],
    inputVars: ["ssi:type:domain:value1:value2:value3"],
    varTypes: ["text"]
});


allOk |=compareObjects(parseCommandLine("import fileURI"), {
    commandName: "import",
    outputVars: [],
    inputVars: ["fileURI"],
    varTypes: ["text"]
});

allOk |=compareObjects(parseCommandLine("table @table  column1 column2  column3"), {
    commandName: "table",
    outputVars: ["table"],
    inputVars: ["column1", "column2", "column3"],
    varTypes: ["text", "text", "text"]
});

allOk |=compareObjects(parseCommandLine("line @variableName $tableName"), {
    commandName: "line",
    outputVars: ["variableName"],
    inputVars: ["tableName"],
    varTypes: ["var"]
});

allOk |=compareObjects(parseCommandLine("set @variableName.columnName input1 $input2 ... inputN"), {
    commandName: "set",
    outputVars: ["variableName.columnName"],
    inputVars: ["input1", "input2", "...", "inputN"],
    varTypes: ["text", "var", "text", "text"]
});

allOk |=compareObjects(parseCommandLine("sum @results $table.columnName"), {
    commandName: "sum",
    outputVars: ["results"],
    inputVars: ["table.columnName"],
    varTypes: ["var"]
});

allOk |=compareObjects(parseCommandLine('define @output "string Value"'), {
    commandName: "define",
    outputVars: ["output"],
    inputVars: ["string Value"],
    varTypes: ["text"]
});

allOk |=compareObjects(parseCommandLine("ask personalityName @output $input1 $input2 'some input' $inputN"), {
    commandName: "ask",
    outputVars: ["output"],
    inputVars: ["personalityName", "input1", "input2", 'some input', "inputN"],
    varTypes: ["text", "var", "var", "text", "var"]
});

allOk |=compareObjects(parseCommandLine("tableFrom @tableName $inputTable newTableCol1 [sum column1 column2 column3]  newTableCol2[set column5 a b ]"), {
    commandName: "tableFrom",
    outputVars: ["tableName"],
    inputVars: ["inputTable", "newTableCol1", "sum column1 column2 column3", "newTableCol2", "set column5 a b "],
    varTypes: ["var", "text", "embeddedCommand", "text", "embeddedCommand"]
});


console.log("All tests passed:", allOk? "true" : "false");