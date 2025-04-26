import {markAsReferenceToVariable} from "./varUtil.js";

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
        console.debug(">>> Defining function", parsedCommand, inputValues, code);
        console.debug("Define:", parsedCommand.outputVars[0], inputValues[0], code);
        commands[parsedCommand.outputVars[0]] = eval(code);
    };

    commands.overwrite = async function (inputValues, parsedCommand, currentDocId, graph) {
        let varName = inputValues[0];
        if(varName[0] !== "~"){
            $$.recordBuildError("Ignoring invalid overwrite command! Invalid variable name. Variable names must start with ~");
            return undefined;
        }
        let fullVarName = varUtil.getVarID(currentDocId, varName.slice(1));
        let varDef = await varUtil.getVariable(fullVarName);
        if(varDef === undefined){
            $$.recordBuildError("Ignoring invalid overwrite command! Invalid variable name. Variable names must start with ~");
            return;
        }
        //console.debug(">>>>> Overwriting variable", varDef);
        let commandName = varDef.parsedCommand.command;
        switch(commandName){
            case "assign":
                if(varDef.parsedCommand.varTypes.includes("var")){
                    $$.recordBuildError("Ignoring invalid overwrite command! It is not allowed to overwrite a variable that has dependencies of another vars");
                    return;
                }
                break;
            case "alias":
                console.debug(">>>>Overwriting alias", varName, "with", inputValues[1]);
                break;
            case "chainAlias":
                $$.recordBuildError("Ignoring invalid overwrite command! It is not allowed to overwrite a variable that is a chain alias of a custom type. Use commands associated with the custom type instead!");
                return;
            default:
                $$.recordBuildError("Ignoring invalid overwrite command! It is not allowed to overwrite a variable that is not declared with the assign command");
                return;
        }
        let diffFound = await workspace.setVarValue(currentDocId, inputValues[0].slice(1), inputValues[1]);
        if(diffFound){
            graph.restartBuild();
        }
    }

    commands.new = async function (inputValues, parsedCommand, currentDocId, graph) {
        const typeName = inputValues[0];
        let outputVarId = parsedCommand.outputVars[0];
        if(await varUtil.isDefined(outputVarId)){
            return graph.getVarValue(outputVarId);
        }
        const args = inputValues.slice(1);
        return customTypeRegistry.newInstance(currentDocId, typeName, ...args);
    }


    commands.lookup = async function (inputValues, parsedCommand, currentDocId, graph) {
        if(inputValues.length < 2){
            await $$.recordBuildError(`Invalid lookup command. Expected at least 2 arguments. The output variable ${parsedCommand.outputVars[0]} will remain undefined`);
            return undefined;
        }
        const typeName = inputValues[0];
        const primaryKey = inputValues[1];
        const args = inputValues.slice(2);
        return customTypeRegistry.lookupInstance(currentDocId, typeName, primaryKey, ...args);
    }

    commands.if = async function (inputValues) {
        // if var then x else y
     let condition = inputValues[0];
     let hashThen = inputValues[1] === "then";
     if(!hashThen){
         await $$.throwError("Invalid syntax. Expected 'then' after condition  in if statement");
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

    this.runCommand =  async function (commandName, inputValues, parsedCommand, currentDocId) {
        let splitCommand = commandName.split(".");
        if(splitCommand.length > 2){
            await $$.throwError("Invalid command name. Expected at most one dot in command name");
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
                    $$.recordBuildError(`Command  '${methodCommand}'  not executed because object variable "${varName} " is undefined. Defaulting to undefined`);
                }
                return;
            }

            const commandFunction = value[methodCommand];
            if(!commandFunction){
                //console.debug(">>>>>>>> Value of" + ` ${currentDocId}.${splitCommand[0]} is` + $$.dumpObject(value));
                //await $$.throwError(`Command not found: ${splitCommand[1]} in Object "${$$.dumpObject(value)}"`);
                $$.recordBuildError(`Method command not found: '${methodCommand}' in Object "${$$.dumpObject(value)}" Defaulting to undefined`);
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

            let result = await commandFunction.call(value, inputValues, parsedCommand, currentDocId, workspace.getGraph());
            //save the status of the variable just in case that the function had a side effect on its state
            //console.debug(">>>>>>> Saving value of variable", splitCommand[0]);
            await workspace.setVarValue(currentDocId, splitCommand[0], value);
            return result; // the result of the command will be immediately  assigned to the output variable
        }
        let commandFunction = commands[commandName];
        if(!commandFunction){
            await $$.throwError("Unknown command '" + commandName + "'");
        }
       // console.debug(">>>>>>> Running command", commandName);
        return await commandFunction(inputValues, parsedCommand, currentDocId, workspace.getGraph());
    }

    this.registerCommand = function (commandName, commandFunction) {
        commands[commandName] = commandFunction;
    }

    this.commandExists = function (commandName) {
        return commands[commandName] !== undefined;
    }
}

const createRegistry = async function (workspace) {
    let registry = null;
    registry = new CommandsRegistry(workspace);

    await import("../predefined/Table.js");
    await import("../predefined/DocumentCommands.js");
    await import("../predefined/Set.js");
    await import("../predefined/Agent.js");

    return registry;
}
export {
    createRegistry
}