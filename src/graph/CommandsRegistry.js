import {ifCommand} from "../predefined/ifCommand.js";
import {decodeSOPCode, getVarID} from "./varUtil.js";

const customTypeRegistry = await import("./customTypeRegistry.js");
let varUtil = await import("./varUtil.js");

function CommandsRegistry( workspace) {
    let commands = {
        assign: async function (inputValues, parsedCommand ) {
            let result;
            $$.debug("assign", "Assign command input values:", inputValues);
            if(inputValues.length === 0){
                return "";
            }
            let hasInputsObjects = false;
            for(let i = 0; i < inputValues.length; i++){
                if(typeof inputValues[i] === "object"){
                    hasInputsObjects = true;
                    break;
                }
            }
            if(hasInputsObjects){
                if(inputValues.length === 1){
                    result = inputValues[0];
                } else {
                    result =  inputValues.map( item => JSON.stringify(item)) .join(" ");
                }
            } else {
                result = inputValues.join(" ");
            }
            $$.debug("assign", "Assign command result:", result);
            return result;
        },
        macro: async function (inputValues) {
            return "MACRO: " + inputValues.join(" ");  //useful only when the macro definition gets updated to trigger re-execution of macro expansions
        },
        chainAlias: async function (inputValues) {
            // do nothing, it is treated as a special case during execution
        },
        currentDocId: async function (inputValues, parsedCommand, currentDocId) {
            //console.debug("Current doc id is", currentDocId);
            return currentDocId;
        },
        returnMacroValue: async function (inputValues, parsedCommand, currentDocId, graph, buildInstance) { //meta-programmed during macro expansion
            let targetVar = parsedCommand.inputVars[0];
            let aliasVarId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
            $$.debug("alias","The special 'returnMacroValue' command is making an Alias " + aliasVarId + " to point to " + targetVar + " in document " + currentDocId);
            await varUtil.markAsReferenceToVariable(aliasVarId, targetVar, currentDocId);
            return undefined;
        }
    };

    commands.def = commands.define = async function (inputValues, parsedCommand) {
        let code = "(function(args){" + inputValues[0] + "})";
        //console.debug(">>> Defining function", parsedCommand, inputValues, code);
        //console.debug("Define:", parsedCommand.outputVars[0], inputValues[0], code);
        commands[parsedCommand.outputVars[0]] = eval(code);
    };

    commands.form = async function (inputValues, parsedCommand, currentDocId, graph) {
        let declaredParams = inputValues[0].split(",");
        if(inputValues[0].length === 0){
            declaredParams = [];
        }
        let outputVarId = parsedCommand.outputVars[0];
        let args = [];
        let sopCode = varUtil.decodeSOPCode(parsedCommand.inputVars[1]);
        let lines = sopCode.split("\n");
        let formData = {};
        for(let line of lines){
            line = line.trim();
            if(line.length === 0){
                continue;
            }
            let parts = line.split(":");
            if(parts.length < 2){
                let message = `Invalid form definition line: '${line}'. Expected format 'fieldName: fieldType'`;
                await varUtil.updateErrorInfo(outputVarId, message);
                $$.throwErrorSync(message);
            }
            let objectName = parts[0].trim();
            formData[objectName] = parts[1].trim();
        }
        //in parsedCommand.inputVars[0] if a variable starts with a ~ it means that it is a variable that will be imported otherwise is a parameter
        for(let i = 0; i < declaredParams.length; i++){
            let varName = declaredParams[i];
            if(varName[0] === "~"){
                args.push(varName.slice(1));
            } else {
                args.push(varName);
            }
        }
        //first parameter is the form data
        args.unshift(formData);
        if(await varUtil.isDefined(outputVarId)){
            let instance = graph.getVarValue(outputVarId);
            let initialArgs = instance.__initialArgs;
            if(!varUtil.sameValue(initialArgs, args)){
                if(instance.reinit !== undefined){
                    await instance.reinit(...args);
                }
            }
            return instance;
        }

        return customTypeRegistry.newInstance(currentDocId, "Form", outputVarId, ...args);

    }
    commands.jsdef = async function (inputValues, parsedCommand, originalCurrentDocId, graph) {
        let declaredParams = inputValues[0].split(",");
        let parameters = [];
        let functionCode = varUtil.decodeSOPCode(parsedCommand.inputVars[1]);
        let importedVariables = [];
        //in parsedCommand.inputVars[0] if a variable starts with a ~ it means that it is a variable that will be imported otherwise is a parameter
        for(let i = 0; i < declaredParams.length; i++){
            let varName = declaredParams[i];
            if(varName[0] === "~"){
                importedVariables.push(varName.slice(1));
            } else {
                parameters.push(varName);
            }
        }

        let code = `(async function(${parameters.join(",")}){${functionCode}})`;
        $$.debug("jsdef", `>>> Defining function:${parsedCommand.outputVars[0]}`, code);
        let func = eval(code);
        commands[parsedCommand.outputVars[0]] = async function(inputValues, parsedCommand) {
            let context = {
                __parsedCommand: parsedCommand,
                __currentDocId: originalCurrentDocId,
                __graph: graph,
                __varUtil: varUtil,
            }
            for(let v in importedVariables){
                let varName = importedVariables[v];
                let fullVarName = varUtil.getVarID(originalCurrentDocId, varName);
                let varDef = await varUtil.getVariable(fullVarName);
                if(varDef === undefined){
                    await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Ignoring invalid command trying to import unknown variable '${fullVarName}`);
                    continue;
                }
                if(commands[varName]){
                    //console.debug(">>>>>> Importing variable", varName);
                    context[varName] = function(...args){
                        return commands[varName](args, parsedCommand, originalCurrentDocId, graph);
                    }.bind(context);
                } else {
                    context[varName] = await graph.getVarValue(fullVarName);
                }
            }
            let boundFunc = func.bind(context);
            return await boundFunc(...inputValues);
        };
    };

    this.runJSDefCommand = function (commandName, ...args) {
        let commandFunc = commands[commandName];
        if(!commandFunc){
            $$.recordBuildError(`Command ${commandName} not found`);
            return undefined;
        }
        let virtualParsedCommand = {
            command: commandName,
            inputVars: args,
            outputVars: [`Result of executing JSDef  command '${commandName}'`]
        }
        return commandFunc(args, virtualParsedCommand);
    }



    commands.new = async function (inputValues, parsedCommand, currentDocId, graph) {
        const typeName = inputValues[0];
        let outputVarName = parsedCommand.outputVars[0];
        const args = inputValues.slice(1);
        let outputVarId = getVarID(currentDocId, outputVarName);
        if(await varUtil.isDefined(outputVarId)){
            let instance = await graph.getVarValue(outputVarId);
            if(instance){
                let initialArgs = instance.__initialArgs;
                if(!varUtil.sameValue(initialArgs, args)){
                    if(instance.reinit !== undefined){
                        $$.debug("objectLifeCycle", `Reinitializing instance of type ${typeName} with output variable ${outputVarName}`);
                        await instance.reinit(...args);
                    }
                }
                return instance;
            }
        }

        return customTypeRegistry.newInstance(currentDocId, typeName, outputVarName, ...args);
    }


    commands.lookup = async function (inputValues, parsedCommand, currentDocId) {
        if(inputValues.length < 2){
            await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Invalid lookup command. Expected at least 2 arguments. The output variable ${parsedCommand.outputVars[0]} will remain undefined`);
            return undefined;
        }
        let outputVarId = parsedCommand.outputVars[0];
        const typeName = inputValues[0];
        const primaryKey = inputValues[1];
        const args = inputValues.slice(2);
        let instance =  await customTypeRegistry.lookupInstance(currentDocId, typeName, outputVarId, primaryKey, ...args);
        if(instance === undefined){
            await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Invalid lookup command. The instance of type ${typeName} with primary key ${primaryKey} was not found. The output variable ${parsedCommand.outputVars[0]} will remain undefined`);
            return undefined;
        }
        return instance;
    }

    commands.prompt = async function(inputValues, parsedCommand, currentDocId, graph){
        return decodeSOPCode(inputValues[1]);
    }
    commands.import = async function(inputValues, parsedCommand, currentDocId, graph, buildInstance){
        let appName = inputValues[0];
        if(!appName){
            $$.throwErrorSync(`Invalid import command missing first parameter "appName"`);
        }
        let chatScriptName = inputValues[1];
        if(!chatScriptName){
            $$.throwErrorSync(`Invalid import command missing second parameter "scriptName"`);
        }

        let codeManager = $$.loadPlugin("CodeManager");

        let script = await codeManager.getChatScript(appName, chatScriptName);
        let parsedCommands = await varUtil.parseCommands("_", "_", script);
        let restartBuild = false;
        //TODO how to detect deleted vars?
        for(let parsedCommand of parsedCommands){
            let varName = parsedCommand.outputVars[0];
            let changed = await graph.defineVariable(varName, currentDocId, "_", "_" , parsedCommand);
            if(changed){
                restartBuild = true;
            }
        }

        if(restartBuild){
            await buildInstance.restartBuild();
        }
    }



    this.runCommand =  async function (commandName, inputValues, parsedCommand, currentDocId , buildInstance) {
        let splitCommand = commandName.split(".");
        let outputVarId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
        if(splitCommand.length > 2){
            await varUtil.updateErrorInfo(outputVarId, `Invalid command name. Expected at most one dot in command name`);
            return;
        }
        //decode the input values in cased that got SOPStringified
        let decodedInputValues = [];
        for(let i = 0; i < inputValues.length; i++){
            let value = inputValues[i];
            if(typeof value === "string"){
                value = await $$.SOPParse(value);
            }
            decodedInputValues.push(value);
        }
        inputValues = decodedInputValues;

        if(splitCommand.length === 2){
            let methodCommand = splitCommand[1].trim();
            //remove ? in from of th method name if it exists
            let isConditionalMemberCommand = false;
            if(methodCommand[0] === "?"){
                isConditionalMemberCommand = true;
                methodCommand = methodCommand.slice(1);
            }
            let varName = splitCommand[0].trim();
            let value = await workspace.getVarValue(currentDocId, varName);
            if(value === undefined){
                let fullVarName = varUtil.getVarID(currentDocId, varName);
                let varDef = await varUtil.getVariable(fullVarName);
                $$.debug("commandExecution",`>>>>>> Debug info for variable '${varName}: ${JSON.stringify(varDef)}`);
                if(!isConditionalMemberCommand) {
                    await varUtil.updateErrorInfo(outputVarId, `Command  '${methodCommand}'  not executed because object variable "${fullVarName} " is undefined. Defaulting to undefined`);
                }
                return;
            }


            const commandFunction = value[methodCommand];
            if(!commandFunction){
                $$.debug("special",`Method command not found: '${methodCommand}' in Object of type ${typeof value} and Value "${JSON.stringify(value)}"`);
                await varUtil.updateErrorInfo(outputVarId, `Method command not found: '${methodCommand}' in Object "${JSON.stringify(value)}" Defaulting to undefined`);
                return;
            }
            if(isConditionalMemberCommand){
                //check if any of the input values is undefined and return undefined as it is the semantic of "?" operator  in SOP Lang
                for(let i = 0; i < inputValues.length; i++){
                    if(inputValues[i] === undefined){
                        return;
                    }
                }
            }

            let result = await commandFunction.call(value, decodedInputValues, parsedCommand, currentDocId, workspace.getGraph(), buildInstance);
            //save the status of the variable just in case that the function had a side effect on its state
            //console.debug(">>>>>>> Saving value of variable", splitCommand[0]);
            if(result === "[object Object]"){
                throw new Error(`Evil object value from command ${commandName}`);
            }
            await workspace.setVarValue(currentDocId, splitCommand[0], value);
            return result; // the result of the command will be immediately  assigned to the output variable
        }
        if(commandName === "if"){ //I have no reason why putting directly "if" in commands it fails, there should be something special with "if" as member in objects
            commandName = "ifCommand";
        }
        let commandFunction = commands[commandName];
        if(!commandFunction){
            console.debug(`Command not found: '${commandName}' in commands registry containing the following commands: ${Object.keys(commands)}`);
            await varUtil.updateErrorInfo(varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]), `Unknown command '${commandName}'`);
            return;
        }
       // console.debug(">>>>>>> Running command", commandName);
        let res = await commandFunction(inputValues, parsedCommand, currentDocId, workspace.getGraph(), buildInstance);
        if(res === "[object Object]"){
            $$.recordBuildError(`Evil value [object Object] obtained from command ${commandName}. Most probably it is a bug in the code`);
        }
        return res;
    }

    this.registerCommand = function (commandName, commandFunction) {
        commands[commandName] = commandFunction;
    }

    this.commandExists = function (commandName) {
        return commands[commandName] !== undefined;
    }

    this.getCommands = function () {
        return Object.keys(commands);
    }

}

const createRegistry = async function (workspace) {
    let registry = null;
    registry = new CommandsRegistry(workspace);

    await import("../predefined/Table.js");
    await import("../predefined/DocumentCommands.js");
    await import("../predefined/Set.js");
    await import("../predefined/ChatAIAgent.js");
    await import("../predefined/ChatUserAgent.js");
    await import("../predefined/Workflow.js");
    await import("../predefined/Form.js");
    await import("../predefined/Chat.js");

    let {ifCommand} = await import("../predefined/ifCommand.js");
    registry.registerCommand("ifCommand", ifCommand);

    let {bestCommand} = await import("../predefined/bestCommand.js");
    registry.registerCommand("best", bestCommand);
    console.debug("Registering 'best' command:", bestCommand);

    let {overwrite} = await import("../predefined/overwrite.js");
    registry.registerCommand("overwrite", overwrite);

    let {math, assert} = await import("../predefined/evalCommands.js");
    registry.registerCommand("math", math);
    registry.registerCommand("assert", assert);

    return registry;
}
export {
    createRegistry
}