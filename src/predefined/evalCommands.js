let varUtil = await import("../graph/varUtil.js");

export  async function math (inputValues, parsedCommand) {
    let code = inputValues.join(" ");
    //console.debug(">>> Defining math code", code);
    try {
        return eval(code);
    } catch (e) {
        await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Error executing math code: ${code}. Error: ${e.message}`);
        return undefined;
    }
}

let operators = ["+", "-", "*", "/", "%", "==", "!=", "===", "!==", "<", "<=", ">", ">=", "&&", "||", "&", "|", "^" , "(" , ")"];
function isOperator(st){
    return operators.includes(st);
}

function normalize(value) {
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
        return value;
    } else {
        return `"${value}"`;
    }
}


export async function assert(inputValues, parsedCommand, currentDocId, graph) {
    //console.debug(">>> Defining assert code", parsedCommand, inputValues);
    let code = "";
    let inputVars = parsedCommand.inputVars;
    for(let i = 0; i < inputVars.length; i++){
        let element;
        if(parsedCommand.varTypes[i] === "text"){
            element = inputVars[i];
            if(!isOperator(element)){
                element = normalize(element);
            }
        }
        else {
            element = normalize(inputValues[i]);
        }
        code += ` ${element} `;
    }
    try {
        let res = eval(code);
        $$.debug("assert", "Evaluating Code", code, "result", res);
        return eval(code);
    } catch (e) {
        await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Error executing assert code: ${code}. Error: ${e.message}`);
        return undefined;
    }
}
