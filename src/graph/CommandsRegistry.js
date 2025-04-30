import {markAsReferenceToVariable, sameValue, decodePercentCustom, updateErrorInfo} from "./varUtil.js";
import {ifCommand} from "../predefined/ifCommand.js";

const customTypeRegistry = await import("./customTypeRegistry.js");
let varUtil = await import("./varUtil.js");

function CommandsRegistry( workspace) {
    let commands = {
        assign: async function (inputValues ) {
            if(inputValues.length === 0){
                return "";
            }
            return inputValues.join(" ");
        },
        macro: async function (inputValues) {
            // do nothing, all information already exists
        },
        chainAlias: async function (inputValues) {
            // do nothing, it is treated as a special case during execution
        },
        currentDocId: async function (inputValues, parsedCommand, currentDocId) {
            //console.debug("Current doc id is", currentDocId);
            return currentDocId;
        }
    };

    commands.as = commands.assign;

    commands.def = commands.define = async function (inputValues, parsedCommand) {
        let code = "(function(args){" + inputValues[0] + "})";
        //console.debug(">>> Defining function", parsedCommand, inputValues, code);
        //console.debug("Define:", parsedCommand.outputVars[0], inputValues[0], code);
        commands[parsedCommand.outputVars[0]] = eval(code);
    };


    commands.jsdef = async function (inputValues, parsedCommand, originalCurrentDocId, graph) {
        let declaredParams = inputValues[0].split(",");
        let parameters = [];
        let functionCode = varUtil.decodePercentCustom(parsedCommand.inputVars[1]);
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
        //console.debug(`>>> Defining function:${parsedCommand.outputVars[0]}`, code);
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
        let outputVarId = parsedCommand.outputVars[0];
        const args = inputValues.slice(1);

        if(await varUtil.isDefined(outputVarId)){
            let instance = graph.getVarValue(outputVarId);
            let initialArgs = instance.__initialArgs;
             if(!varUtil.sameValue(initialArgs, args)){
                if(instance.reinit !== undefined){
                    await instance.reinit(...args);
                }
                return instance;
             }
        }

        return customTypeRegistry.newInstance(currentDocId, typeName, ...args);
    }


    commands.lookup = async function (inputValues, parsedCommand, currentDocId, graph) {
        if(inputValues.length < 2){
            await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Invalid lookup command. Expected at least 2 arguments. The output variable ${parsedCommand.outputVars[0]} will remain undefined`);
            return undefined;
        }
        const typeName = inputValues[0];
        const primaryKey = inputValues[1];
        const args = inputValues.slice(2);
        let instance =  customTypeRegistry.lookupInstance(currentDocId, typeName, primaryKey, ...args);
        if(instance === undefined){
            await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Invalid lookup command. The instance of type ${typeName} with primary key ${primaryKey} was not found. The output variable ${parsedCommand.outputVars[0]} will remain undefined`);
            return undefined;
        }
        return instance;
    }



    this.runCommand =  async function (commandName, inputValues, parsedCommand, currentDocId , buildInstance) {
        let splitCommand = commandName.split(".");
        if(splitCommand.length > 2){
            await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Invalid command name. Expected at most one dot in command name`);
            return;
        }
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
                if(!isConditionalMemberCommand) {
                    await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Command  '${methodCommand}'  not executed because object variable "${varName} " is undefined. Defaulting to undefined`);
                }
                return;
            }

            const commandFunction = value[methodCommand];
            if(!commandFunction){
                await varUtil.updateErrorInfo(parsedCommand.outputVars[0], `Method command not found: '${methodCommand}' in Object "${$$.dumpObject(value)}" Defaulting to undefined`);
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

            let result = await commandFunction.call(value, inputValues, parsedCommand, currentDocId, workspace.getGraph(), buildInstance);
            //save the status of the variable just in case that the function had a side effect on its state
            //console.debug(">>>>>>> Saving value of variable", splitCommand[0]);
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
        return await commandFunction(inputValues, parsedCommand, currentDocId, workspace.getGraph(), buildInstance);
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
    await import("../predefined/Agent.js");

    let {ifCommand} = await import("../predefined/ifCommand.js");
    console.debug("Registering if command", ifCommand);
    registry.registerCommand("ifCommand", ifCommand);

    let {bestCommand} = await import("../predefined/ifCommand.js");
    registry.registerCommand("if", bestCommand);

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