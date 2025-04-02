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
       return " \t".includes(char);
    }

    function isSeparator(char){
        return " \t\"'[]()".includes(char);
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
        // replace the first occurrence of = or :  with ' set '
        commandLine = commandLine.replace(':=', 'assign ');

        //console.debug("Parsing command line:", commandLine);
        let outputVars = [];
        let inputVars  = [];
        let varTypes = [];
        let command = "";

        let pos = 0;
        let {token, position, tokenType} = getNextToken(commandLine, pos);
        pos = position;
        while(tokenType === "whitespaces"){
            let nextToken = getNextToken(commandLine, pos);
            token = nextToken.token;
            pos = position = nextToken.position;
            tokenType = nextToken.tokenType;
        }

        if(tokenType === "output"){
            outputVars.push(token);
            let nextToken = {};
            tokenType = "whitespaces";
            while(tokenType === "whitespaces" /*|| token === "=" || token === ":" */){
                nextToken = getNextToken(commandLine, pos);
                token = nextToken.token;
                pos = position = nextToken.position;
                tokenType = nextToken.tokenType;
            }
        }

        if (tokenType !== "text") {
             $$.throwErrorSync("Invalid command name: '" + token + "'Got token type'" + tokenType + "' instead. Expected text" );
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
                     $$.throwErrorSync("Unexpected end of line. Invalid Syntax");
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
function parseTextVars(text) {
    if (!text) return [];

    function extractVar(block) {
        // Remove % from start and end, then trim
        let content = block.slice(1, -1).trim();
        let firstSpaceIndex = content.indexOf(' ');

        if (firstSpaceIndex === -1) {
            firstSpaceIndex = content.length;
        }

        let variable = content.slice(0, firstSpaceIndex).trim();
        let value = content.slice(firstSpaceIndex + 1).trim();

        return { variable, value };
    }

    let blocks = text.match(/%[^%]+%/g) || [];
    return blocks.map(extractVar).filter(Boolean);
}

function renameSpecialVars(chapterId, paragraphId, line){
    return line.replace(/[$@]text/g, (match) => match[0] + makeNameForSpecialVars(chapterId, paragraphId, "text"))
        .replace(/[$@]title/g, (match) => match[0] + makeNameForSpecialVars(chapterId, paragraphId, "title"));
}

function makeNameForSpecialVars(chapterId, paragraphId, varName, forcePrefix = false){
    if(!chapterId){
        chapterId = "_";
    }
    if(!paragraphId){
        paragraphId = "_";
    }
    switch(varName){
        case "text":
        case "title":
            forcePrefix = true;
    }
    if(forcePrefix){
        return chapterId + "_" + paragraphId + "_" + varName;
    }
    return varName;
}

function replaceDotVariables(inputString) {
    // Array to store all detected chain variables
    const detectedVars = {};

    // Function to transform variable names (replacing dots with underscores)
    const transformVarName = (varName) => {
        return varName.replace(/\./g, '_');
    };

    // Process variables with specific prefix (@ or $)
    const processVars = (str, prefix) => {
        // Match variables that start with the prefix followed by alphanumeric chars and dots
        const regex = new RegExp(`\\${prefix}([a-zA-Z0-9_]+(\\.[a-zA-Z0-9_]+)+)`, 'g');

        return str.replace(regex, (match, varName) => {
            // Add the original variable to the detected list (without the prefix)
            let tempVarName = transformVarName(varName);
            let aliasTempVarName = '__alias_' + tempVarName;
            const splitVarName = varName.split(".");
            detectedVars[aliasTempVarName] = `@` + aliasTempVarName + ` new chainAlias $${splitVarName[0]}`;
            detectedVars[varName] = `@` + tempVarName + ` ${aliasTempVarName}.chainAlias ` + varName.replaceAll(".", " ") + ` $${splitVarName[0]}`;

            // Transform the variable name by replacing dots with underscores
            const newVarName = transformVarName(varName);

            // Return the transformed variable with its prefix
            return `${prefix}${newVarName}`;
        });
    };

    let result = processVars(inputString, '@');
    result = processVars(result, '$');
    result = processVars(result, '~');
    return {
        transformedString: result,
        detectedVariables: detectedVars
    };
}    const result = {};

function parseComplexLine(input, makeVarName) {
    let transformedText = input;

    const regex = /\[(.*?)\]/g;
    let match;
    let matches = [];

    while ((match = regex.exec(input)) !== null) {
        matches.push({
            fullMatch: match[0],
            innerContent: match[1].trim(),
            index: match.index
        });
    }

    for (let i = matches.length - 1; i >= 0; i--) {
        const { fullMatch, innerContent } = matches[i];
        const varName = makeVarName();
        result[varName] = innerContent;
        transformedText = transformedText.replace(fullMatch, `$${varName}`);
    }
    //console.debug("Parsed line:",  transformedText, "Variables:", result);
    return {
        variables: result,
        transformedText
    };
}


function parseCommandBlock(chapterId, paragraphId,  commandTextSeparatedByNewLine){
    let varCounter = 0;
    function makeVarNames(){
        varCounter++;
        return makeNameForSpecialVars(chapterId, paragraphId, "TMP" + varCounter, true);
    }

    let result = commandTextSeparatedByNewLine.split("\n");
    let newLines = [];
    for(let i = 0; i < result.length; i++){
        let lineRes = replaceDotVariables(result[i]);
        let res = parseComplexLine(lineRes.transformedString, makeVarNames);
        result[i] = res.transformedText;
        for(let key in res.variables){
            newLines.push("@" + key + " " + res.variables[key]);
        }
        for (let key in lineRes.detectedVariables) {
            newLines.push(lineRes.detectedVariables[key]);
        }
    }

    return newLines.concat(result);
}


module.exports = {
    parseCommandLine,
    compareObjects,
    parseTextVars,
    parseCommandBlock,
    renameSpecialVars,
    makeNameForSpecialVars,
    parseComplexLine,
    replaceDotVariables
}