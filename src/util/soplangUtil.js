

let plugins = {};

if(typeof globalThis.$$ === "undefined"){
    globalThis.$$ = {};
}

if(typeof globalThis.$$.throwError === "undefined"){
    async function throwError(error, ...args) {
        if(typeof error === "string"){
            error = new Error(error + " " + args.join(" "));
        }
        let errStr = args.join(" ");
        console.debug("Throwing err:", error, errStr);
        throw error;
    }

    if(typeof globalThis.$$ === "undefined"){
        globalThis.$$ = {
        }
    }
    $$.throwError = throwError;
}
if (typeof globalThis.$$.registerPlugin === "undefined") {
    async function registerPlugin(pluginName, path){
        let pluginInstance = await require(path).getInstance();
        if(typeof pluginInstance === "undefined"){
            $$.throwError("Invalid plugin. getInstance() method returned undefined for plugin", pluginName);
        }
        plugins[pluginName] = pluginInstance;
    }
    $$.registerPlugin = registerPlugin;
}
if (typeof globalThis.$$.loadPlugin === "undefined") {
    function loadPlugin(pluginName){
        return plugins[pluginName];
    }
    $$.loadPlugin = loadPlugin;
}



function getNextToken(str, position){
    function makeResult(token, position, tokenType){
       //console.debug("Token:'"+ token, "'Position:", position, "Type:", tokenType);
        return {
            token: token,
            position: position,
            tokenType: tokenType
        }
    }

    function isWhiteSpace(char){
       return " \t:=".includes(char);
    }

    function isSeparator(char){
        return " \t:=\"'[]()".includes(char);
    }
    function eatWhitespaces(){
        if(position >= str.length){
            return "end";
        }
        let currentChar = str[position];
        while(isWhiteSpace(currentChar)){
            position++;
            currentChar = str[position]
            if(position >= str.length){
                return "end";
            }
        }
        return "whitespaces";
    }

    function eatUntil(endChar){
        let result = "";
        position++;
        while(str[position] !== endChar){
            if(position > str.length){
                return {result, unexpectedEnd: true};
            }
            result += str[position];
            position++;
        }
        position++;
        return {result, unexpectedEnd: false};
    }


    let token = "";
    let tokenType = "empty";
    let currentChar = str[position];

    if(isWhiteSpace(currentChar)){
        if(eatWhitespaces() === "end"){
            return makeResult(token, position, "end");
        }
        return makeResult(token, position, "whitespaces");
    }

    if(currentChar === "'" || currentChar === '"'){
        let {result, unexpectedEnd} = eatUntil(currentChar);
        if(unexpectedEnd) {
            return makeResult(result, position, "unexpectedEnd");
        }
        return makeResult(result, position, "text");
    }

    if(currentChar === "["){
        let {result, unexpectedEnd} = eatUntil("]");
        if(unexpectedEnd) {
            return makeResult("", position, "unexpectedEnd");
        }
        return makeResult(result, position, "embeddedCommand");
    }

    switch(currentChar){
        case "@":
            tokenType = "output";
            position++;
            currentChar = str[position];
            break;
        case "$":
        case "%":
            tokenType = "var";
            position++;
            currentChar = str[position];
            break;
        default:
            tokenType = "text";
            break;
    }

    while(!isSeparator(currentChar)){
        token += currentChar;
        position++;
        currentChar = str[position];
        if(position >= str.length){
            return makeResult(token, position, tokenType);
        }
    }
    return makeResult(token, position, tokenType);
}



function parseCommandLine(commandLine) {
        console.debug("Parsing command line:", commandLine);
        let outputVars = [];
        let inputVars  = [];
        let varTypes = [];
        let command = "";

        let pos = 0;
        let {token, position, tokenType} = getNextToken(commandLine, pos);
        pos = position;
        if(tokenType === "output"){
            outputVars.push(token);
            let nextToken = {};
            tokenType = "whitespaces";
            while(tokenType === "whitespaces" || token === "=" || token === ":"){
                nextToken = getNextToken(commandLine, pos);
                token = nextToken.token;
                pos = position = nextToken.position;
                tokenType = nextToken.tokenType;
            }
        }

        if (tokenType !== "text") {
            $$.throwError("Invalid command name: '" + token + "'Got token type'" + tokenType + "' instead. Expected text" );
        }
        command = token;

        while(pos < commandLine.length){
            let {token, position, tokenType} = getNextToken(commandLine, pos);
            pos = position;
            switch(tokenType){
                case "whitespaces":
                case "end":
                    break;
                case "input":
                    inputVars.push(token);
                    varTypes.push("input");
                    break;
                case "output":
                    outputVars.push(token);
                    break;
                case "var":
                    inputVars.push(token);
                    varTypes.push("var");
                    break;
                case "text":
                    inputVars.push(token);
                    varTypes.push("text");
                    break;
                case "embeddedCommand":
                    inputVars.push(token);
                    varTypes.push("embeddedCommand");
                    break;
                case "unexpectedEnd":
                    $$.throwError("Unexpected end of line. Invalid Syntax");
                    break;
            }
        }
        //console.debug("Command:", command, "InputVars:", inputVars, "OutputVars:", outputVars, "VarTypes:", varTypes);
        return {
            command,
            inputVars,
            outputVars,
            varTypes
        }
    }


function findFirstDifference(str1, str2) {
    let minLength = Math.min(str1.length, str2.length);
    for (let i = 0; i < minLength; i++) {
        if (str1[i] !== str2[i]) {
            return i;
        }
    }
    return str1.length !== str2.length ? minLength : -1;
}

function compareObjects (obtained, expected) {
    for(let key in obtained){
        let obtainedStr;
        let expectedStr;
        if(typeof expected[key] === "string"){
            obtainedStr = obtained[key];
            expectedStr = expected[key];
        } else {
            let obtainedStr = obtained[key].join("");
            let expectedStr = expected[key].join("");
        }

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

let internalClock = 0;

function LocalSafeTimestamp(){
    internalClock++;
    this.timestamp = Date.now();
    this.clock = this.timestamp + internalClock;
    this.internalClock = internalClock;
    this.toString = function(){
        return JSON.stringify(this);
    }
}


function parseTextVars (text){
    // in the text section we can have embedded variables with names prefixed with % and ends with %.
    // Example 'some ignored text  %commandName some value% more ignored text %anotherCommand some string as value %'
    // The function returns an array with the variables found in the text and their values.
    let result = [];
    let embeddedVars = text.match(/%[^%]+%/g);
    embeddedVars.forEach(fulltext => {
        //take the first position of a space and this is the variable name
        let firstSpacePos = fulltext.indexOf(" ");
        if(firstSpacePos === -1){
            console.warn("Invalid embedded variable:", fulltext);
            return ;
        }
        let variable = fulltext.substring(1, firstSpacePos);
        let value = fulltext.substring(embeddedVars+1, fulltext.length-1);
        result.push({variable, value});
    });
    return result;
}

module.exports = {
    parseCommandLine,
    compareObjects,
    LocalSafeTimestamp,
    parseTextVars
}