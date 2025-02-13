async function throwError(error, ...args) {
    if(typeof error === "string"){
        error = new Error(error);
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


function getNextToken(str, position){


    function makeResult(token, position, tokenType){
      // console.debug("Token:", token, "Position:", position, "Type:", tokenType);
        return {
            token: token,
            position: position,
            tokenType: tokenType
        }
    }

    function eatWhitespaces(){
        while(str[position] === " " || str[position] === "\t"){
            position++;
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

    if(currentChar === " " || currentChar === "\t"){
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

    while(currentChar !== " " && currentChar !== "\t" && currentChar !== "'" && currentChar !== '"' && currentChar !== '['){
        token += currentChar;
        position++;
        currentChar = str[position];
        if(position >= str.length){
            return makeResult(token, position, tokenType);
        }
    }
    return makeResult(token, position, tokenType);
}



module.exports = {
    parseCommandLine: function (commandLine) {
        console.debug("Parsing command line:", commandLine);
        let outputVars = [];
        let inputVars  = [];
        let varTypes = [];
        let commandName = "";

        let pos = 0;
        let {name, position, tokenType} = getNextToken(commandLine, pos);
        pos = position;
        if (tokenType !== "text") {
            $$.throwError("Invalid command name ", name);
        }
        commandName = name;

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
        return {
            inputVars,
            outputVars,
            varTypes
        }
    }
}