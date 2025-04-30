let varUtil = await import("../graph/varUtil.js");

export async function bestCommand(inputValues, parsedCommand, currentDocId, graph, buildInstance) {
    let retriesNo = parseInt(inputValues[0]);
    if(isNaN(retriesNo)){
        console.debug(">>>>>> Invalid number of retries", inputValues[0], " variable", parsedCommand.outputVars[0], "will be undefined");
        await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Invalid syntax. Expected a number as the first argument in best command`);
       return undefined;
    }

    let scoreEstimationCommand = inputValues[1];
    let workCommand = inputValues[2];
    let args = inputValues.slice(3);

    //console.debug(">>>>>> Best command retries:", retriesNo, "score command:", scoreEstimationCommand, "work command:", workCommand, "args:", args);
    let bestScore = -Infinity;
    let bestResult = undefined;
    for(let i = 0; i < retriesNo; i++){
        try{
            let result = await graph.runCustomCommand(currentDocId, workCommand, ...args);
            let score = await graph.runCustomCommand(currentDocId, scoreEstimationCommand, result);
            score = parseFloat(score);
            //console.debug(">>>>>> Best command score", score, "For result", result);
            if(score > bestScore){
                bestScore = score;
                bestResult = result;
            }
            if(score === 10){
                break;
            }
        } catch(e){
            //await varUtil.updateDebugInfo(parsedCommand.outputVars[0], `Error executing best command: ${e.message}`);
            //TODO:  in the future we should attach debug information on the variable
            console.debug(`Error during the execution of the 'best' looping command: ${e.message} for output variable ${parsedCommand.outputVars[0]}`);
        }
    }
    return bestResult;
}