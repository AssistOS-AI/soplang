let varUtil = await import("../graph/varUtil.js");

export async function ifCommand(inputValues, parsedCommand) {
    // if var then x else y
    let condition = inputValues[0];
    let hashThen = inputValues[1] === "then";
    if(!hashThen){
        await varUtil.updateErrorInfo(parsedCommand.outputVars[0], "Invalid syntax. Expected 'then' after condition  in if statement");
        return undefined;
    }
    let thenValue = undefined;
    let elseValue = undefined;
    if(inputValues.length >= 2){
        thenValue = inputValues[2];
    }

    let hasElse = inputValues[3] === "else";
    if(hasElse){
        if(inputValues.length >= 4){
            elseValue = inputValues[4];
        }
    }
    if(condition){
        return thenValue;
    } else {
        return elseValue;
    }
}