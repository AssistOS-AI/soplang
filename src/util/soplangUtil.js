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
        return " \t\"'[]".includes(char);
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

function replaceDotVariables(inputString, detectedVars = {}) {
    // Function to transform variable names (replacing dots with underscores)
    const transformVarName = (varName) => {
        return varName.replace(/\./g, '_');
    };

    // Process variables with specific prefix (@ or $)
    const processVars = (str, prefix) => {
        // Match variables that start with the prefix followed by alphanumeric chars and dots
        const regex = new RegExp(`\\${prefix}([a-zA-Z0-9_]+(\\.[a-zA-Z0-9_]+)+)`, 'g');

        return str.replace(regex, (match, varName) => {
            // Only add the chain alias if we haven't seen this variable before
            if (!detectedVars[varName]) {
                let tempVarName = transformVarName(varName);
                const splitVarName = varName.split(".");
                detectedVars[varName] = `@` + tempVarName + ` chainAlias ` + varName.replaceAll(".", " ") + ` $${splitVarName[0]}`;
            }
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
}

function breakComplexLineInSimpleLines(input, makeVarName) {
    let transformedText = input;
    const result = {};
    const regex = /\[(.*?)]/g;
    let match;
    let matches = [];

    while ((match = regex.exec(input)) !== null) {
        //console.debug("Found match:", match);
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

/**
 * Encodes specific characters in a string using percent-encoding (%xx).
 * Characters encoded: \n, ', ", [, ], %
 * Other characters remain unchanged.
 *
 * @param {string} str The input string.
 * @returns {string} The percent-encoded string.
 */
function encodeSOPCode(str) {
    // Return empty string if input is not a string
    if (typeof str !== 'string') return '';

    // Replace characters that need encoding with their %xx equivalent.
    // We must include '%' itself in the list of characters to encode,
    // otherwise sequences like %20 (space) could be misinterpreted later.
    return str.replace(/[%'\n"\[\]$@~]/g, (char) => {
        // Get the Unicode character code for the character
        const charCode = char.charCodeAt(0);
        // Convert the character code to its hexadecimal representation (uppercase)
        const hexCode = charCode.toString(16).toUpperCase();
        // Pad with a leading zero if the hex code is only one digit (e.g., \n is 0A)
        const paddedHex = hexCode.length < 2 ? '0' + hexCode : hexCode;
        // Return the percent sign followed by the hex code
        return '%' + paddedHex;
    });
}

/**
 * Decodes a string that was percent-encoded using encodeSOPCode.
 * Replaces %xx sequences with their original characters.
 * It assumes any valid %xx sequence found should be decoded.
 *
 * @param {string} encodedStr The percent-encoded string.
 * @returns {string} The decoded string.
 */
function decodeSOPCode(encodedStr) {
    // Return empty string if input is not a string
    if (typeof encodedStr !== 'string') return '';

    // Regex matches '%' followed by exactly two hexadecimal digits (0-9, A-F, case-insensitive).
    // It captures the two hex digits into group 1.
    return encodedStr.replace(/%([0-9A-Fa-f]{2})/g, (match, hexDigits) => {
        // `hexDigits` contains the two hex characters (e.g., '0A', '27', '5B')
        // Convert the hex digits (string) back to an integer character code
        const charCode = parseInt(hexDigits, 16);
        // Convert the character code back to its corresponding character
        return String.fromCharCode(charCode);
    });
}

function extractMacroOrJSDefOnASingleLine(input) {
    // Input validation
    if (typeof input !== 'string') {
        console.error("Input must be a string.");
        return "";
    }

    const lines = input.split('\n');
    const outputLines = []; // Array to collect the processed lines
    let currentIndex = 0; // Index of the current line being processed

    /**
     * Inner (nested) function to parse a script block starting from startIndex.
     * Looks for the format "@scriptName script ..." and reads until "end".
     * Returns an object with the summarized line (using URL encoding) and the next index
     * if a complete block is found, otherwise returns null.
     * @param {number} startIndex - The line index to start parsing from.
     * @returns {{outputLine: string, nextIndex: number} | null} - The result or null if not a valid/complete script block.
     */
    function parseMacroBlock(startIndex) {
        // Check if the index is valid
        if (startIndex >= lines.length) {
            return null;
        }

        const startLine = lines[startIndex];
        const trimmedStartLine = startLine.trim();
        // Regex: looks for @scriptName (captured) followed by 'script' and optional arguments
        const match = trimmedStartLine.match(/^@(\S+)\s+(macro|jsdef|form|prompt)(?:\s+(.*))?$/);

        let blockName = false;
        if (!match) {
            // The line does not match the "@name script ..." format
            return null;
        } else{
            blockName = match[2];
        }

        // Extract script name and arguments
        const scriptName = match[1]; // Code name is captured from the regex
        const argsStringFromLine = match[3] || ""; // Argument part (or empty string)
        const args = argsStringFromLine.split(/\s+/).filter(arg => arg.length > 0); // Split arguments
        const scriptBodyLines = []; // Collect lines for the script body
        let currentCodeIndex = startIndex + 1; // Start searching for the body from the next line

        // Iterate through subsequent lines looking for 'end'
        while (currentCodeIndex < lines.length) {
            const currentLine = lines[currentCodeIndex];
            const trimmedCurrentLine = currentLine.trim();

            if (trimmedCurrentLine.toLowerCase() === 'end') {
                // Found the end of the script block

                // Prepare data for URL encoding
                // Join arguments and lines with newline. Note: This assumes individual args/lines
                // do not consist *only* of a newline if that distinction is critical.
                // Empty arrays will result in empty strings before encoding.
                const argsString = args.join(',');
                const linesString = scriptBodyLines.join('\n');

                // Encode the joined strings using URL encoding (percent-encoding)
                const encodedArgs = argsString;
                const encodedLines = encodeSOPCode(linesString);

                // Create the summarized output line: @scriptName script <args_urlencoded> <lines_urlencoded>
                // A space separates the two URL encoded parts.
                const outputLine = `@${scriptName} ${blockName} '${encodedArgs}' '${encodedLines}'`;

                // To Decode later:
                // 1. Find the part after "@scriptName script ".
                // 2. Split that part by the first space to get encodedArgs and encodedLines.
                // 3. Decode each part: decodeURIComponent(encodedPart)
                // 4. Split the decoded strings by '\n' to get the original arrays.
                //    (Note: Decoding an empty string and splitting by '\n' yields [''], not [])

                // Return the line and the index of the line *after* 'end'
                return {
                    outputLine: outputLine,
                    nextIndex: currentCodeIndex + 1
                };
            } else {
                //console.debug(`Adding line to script '${scriptName}':`, currentLine);
                scriptBodyLines.push(currentLine.trim());
                currentCodeIndex++; // Move to the next line
            }
        }

        // If the loop finishes without finding 'end', the script is unterminated
        console.warn(`Warning: macro variable '${scriptName}' starting on line ${startIndex + 1} was not closed with 'end'. Treating start line as regular text.`);
        // Return null to indicate a complete block was not processed
        return null;
    }

    // --- Main loop for processing lines ---
    while (currentIndex < lines.length) {
        // Attempt to parse a script block starting at the current line
        const scriptParseResult = parseMacroBlock(currentIndex);

        if (scriptParseResult) {
            // Successfully found and parsed a complete script block
            //console.debug("!!!!!!! Parsed script block:", scriptParseResult.outputLine);
            outputLines.push(scriptParseResult.outputLine); // Add the summary line
            currentIndex = scriptParseResult.nextIndex; // Set the index to continue after the script block
        } else {
            // The current line is NOT the start of a valid script OR the script was unterminated
            outputLines.push(lines[currentIndex].trim()); // Add the original line
            currentIndex++; // Move to the next line
        }
    }

    // Join the processed lines back into a single string
    return outputLines.join('\n');
}


function expandMacro(macroDocId, executionPrefix, parsedCommand, ...args) {
   let initialisation = "";
    let declaredArgs = parsedCommand.inputVars[0];
    let variables = {};
    let declaredArgsList = declaredArgs.split(",");
    for(let i = 0; i < declaredArgsList.length; i++){
        let argName = declaredArgsList[i].trim();
        //if starts with ~ is an alias from the parent document of the macro (an import), otherwise is  a local variable
        if(argName.startsWith("~")){
            argName = argName.substring(1);
            variables[argName] = executionPrefix + "_" + argName;
            initialisation += `@${variables[argName]} alias ${macroDocId} ${argName}\n`;
        } else {
            variables[argName] = executionPrefix + "_" + argName;
            if(typeof args[i] === "string" && args[i].startsWith("$")){
                if(args[i].includes("/")){
                    initialisation += `@${variables[argName]} alias ${args[i].slice(1)}\n`;
                } else {
                    initialisation += `@${variables[argName]} alias ${macroDocId} ${args[i].slice(1)}\n`;
                }
            } else {
                initialisation += `@${variables[argName]} := ${$$.SOPStringify(args[i])}\n`;
            }
        }
    }

    let macroCode = parsedCommand.inputVars[1];
    macroCode = decodeSOPCode(macroCode);
    //detect all occurrences of @varName or ~varName and add in variables with the executionPrefix
    let regex = /([@$~])([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = regex.exec(macroCode)) !== null) {
        let varName = match[2];
        if(!variables[varName]){
            variables[varName] = executionPrefix + "_" + varName;
        }
    }

    for(let varName in variables){
        //replace each occurrence of var name prefixed by $ @ or ~  or post fixed by "."  but keep the prefix or postfix
        let regex = new RegExp(`([@\$!~])?${varName}(\\.)?`, "g");

        macroCode = macroCode.replace(regex, (match, prefix, postfix) => {
            if (prefix || postfix) {
                return (prefix || "") + variables[varName] + (postfix || "");
            }
            return match;
        });
    }

    regex = /return/g;
    // Check if "return" exists in the string
    if (regex.test(macroCode)) {
        // If it exists, replace it (your original logic)
        macroCode = macroCode.replace(regex, `@${executionPrefix} returnMacroValue`);
    } else {
        // If it doesn't exist, append the string to the end
        macroCode += `\n@${executionPrefix} returnMacroValue ""`;
    }

    $$.debug("macro",">>>>>Macro code:", (initialisation + macroCode).split("\n").map(line => "\t" + line).join("\n"));
    return initialisation + macroCode;
}

function parseCommandBlock(chapterId, paragraphId, commandTextSeparatedByNewLine) {
    let varCounter = 0;
    commandTextSeparatedByNewLine = extractMacroOrJSDefOnASingleLine(commandTextSeparatedByNewLine);
    //console.debug("Command text:", commandTextSeparatedByNewLine);

    function makeVarNames() {
        varCounter++;
        return makeNameForSpecialVars(chapterId, paragraphId, "TMP" + varCounter, true);
    }

    let result = commandTextSeparatedByNewLine.split("\n");
    let validLines = [];
    let newLines = [];
    let detectedVars = {};

    for (let i = 0; i < result.length; i++) {
        let line = result[i].trim();
        if(line.length === 0){
            continue;
        }
        if (line.startsWith("#") || line.startsWith("//")) {
            continue;
        }
        let lineRes = replaceDotVariables(line, detectedVars);
        let res = breakComplexLineInSimpleLines(lineRes.transformedString, makeVarNames);
        validLines.push(res.transformedText);
        for (let key in res.variables) {
            newLines.push("@" + key + " " + res.variables[key]);
        }
    }

    for (let key in detectedVars) {
        newLines.push(detectedVars[key]);
    }

    return newLines.concat(validLines);
}

function sameValue(oldValue, newValue){
    if(oldValue === newValue){
        return true;
    }
    if(typeof oldValue !== typeof newValue){
        $$.debug("diff", "different types discovered", typeof oldValue, typeof newValue);
        return false;
    }
    if(typeof oldValue === "string" || typeof oldValue === "number" || typeof oldValue === "boolean"){
        if(oldValue.toString() !== newValue.toString()){
            $$.debug("diff", "different basic values discovered", oldValue, newValue);
            return false;
        }
    }

    if(typeof oldValue === "object"){
        if(Array.isArray(oldValue)){
            if(oldValue.length !== newValue.length){
                $$.debug("diff", "different lengths discovered", oldValue.length, newValue.length);
                return false;
            }
            for(let i = 0; i < oldValue.length; i++){
                if(!sameValue(oldValue[i], newValue[i])){
                    return false;
                }
            }
            return true;
        } else {
            //compare the number of keys
            let oldKeys = Object.keys(oldValue);
            let newKeys = Object.keys(newValue);
            if(oldKeys.length !== newKeys.length){
                $$.debug("diff", "different number of keys discovered", oldKeys.length, newKeys.length);
                return false;
            }

            for(let key in oldValue){
                if(!sameValue(oldValue[key], newValue[key])){
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
let compareObjects = sameValue;

function parseCommandsForUI(commandsBlock, chapterId, paragraphId) {
    let commandTextSeparatedByNewLine = extractMacroOrJSDefOnASingleLine(commandsBlock);
    let splitCommands = commandTextSeparatedByNewLine.split("\n");
    let commands = [];
    for (let i = 0; i < splitCommands.length; i++) {
        let parsedCommand = {};
        let line = splitCommands[i].trim();
        if(line.length === 0){
            continue;
        }
        if (line.startsWith("#") || line.startsWith("//")) {
            continue;
        }
        let splitCommand = line.split(" ");
        if(!splitCommand[0].startsWith("@")){
            continue;
        }
        let varName = splitCommand.splice(0, 1)[0];
        parsedCommand.varName = varName.slice(1);
        let command = splitCommand.splice(0, 1)[0];
        if (command.startsWith("?")){
            command = command.slice(1);
            parsedCommand.conditional = true;
        }
        parsedCommand.command = command;
        if(command === "new"){
            parsedCommand.customType = splitCommand.splice(0, 1)[0];
        }
        let expression;
        if (command === "macro" || command === "jsdef") {
            let paramsSeparatedByCommas = splitCommand.splice(0, 1)[0];
            paramsSeparatedByCommas = paramsSeparatedByCommas.slice(1, -1); // remove the quotes
            parsedCommand.params = paramsSeparatedByCommas.split(",");
            expression = splitCommand.join(" ");
            expression = expression.slice(1, -1); // remove the quotes
            expression = decodeSOPCode(expression);
        } else {
            expression = splitCommand.join(" ");
        }
        parsedCommand.expression = expression;
        if(chapterId){
            parsedCommand.chapterId = chapterId;
        }
        if(paragraphId){
            parsedCommand.paragraphId = paragraphId;
        }
        commands.push(parsedCommand);
    }
    return commands;
}
export {
    parseCommandLine,
    parseTextVars,
    parseCommandBlock,
    renameSpecialVars,
    makeNameForSpecialVars,
    breakComplexLineInSimpleLines,
    replaceDotVariables,
    extractMacroOrJSDefOnASingleLine,
    expandMacro,
    decodeSOPCode,
    sameValue,
    compareObjects,
    parseCommandsForUI
}