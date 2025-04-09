const customTypeRegistry = await import("./customTypeRegistry.js");

function CommandsRegistry( workspace) {
    let commands = {
        assign: async function (inputValues ) {
            return inputValues.join(" ");
        },
        list : async function (inputValues) {
            return inputValues;
        },
        equal : async function (inputValues) {
            return inputValues[0] === inputValues[1];
        },
        unequal : async function (inputValues) {
            return inputValues[0] !== inputValues[1];
        }
    };

    commands.as = commands.assign;

    commands.def = commands.define = async function (inputValues, outputValues) {
        let code = "(function(args){" + inputValues[0] + "})";
        console.debug("Define:", outputValues[0], inputValues[0], code);
        commands[outputValues[0]] = eval(code);
    };

    commands.overwrite = async function (inputValues, outputValues, currentDocId) {
        let varName = inputValues[0];
        if(varName[0] !== "~"){
            await $$.throwError("Invalid variable name. Variable names must start with ~");
        }
        await workspace.setVarValue(currentDocId, inputValues[0].slice(1), inputValues[1]);
    }

    commands.new = async function (inputValues, outputValues, currentDocId) {
        const typeName = inputValues[0];
        const args = inputValues.slice(1);
        return customTypeRegistry.newInstance(typeName, ...args);
    }

    commands.lookup = async function (inputValues, outputValues, currentDocId, workspace) {
        const typeName = inputValues[0];
        const primaryKey = inputValues[1];
        const persistence = $$.loadPlugin("DefaultPersistence");
        let typeNameForMethods = typeName.charAt(0).toUpperCase() + typeName.slice(1);
        let getMethod = "get" + typeNameForMethods;
        //let createMethod = "create" + typeNameForMethods;
        let existingPersistentObject= undefined;
        try{
            existingPersistentObject = await persistence[getMethod](primaryKey);
        } catch (err){
            // ignore !?
        }
        return customTypeRegistry.newInstance(typeName, primaryKey, existingPersistentObject);
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

    this.runCommand =  async function (commandName, inputValues, outputValues, currentDocId) {
        let splitCommand = commandName.split(".");
        if(splitCommand.length > 2){
            await $$.throwError("Invalid command name. Expected at most one dot in command name");
            return;
        }
        if(splitCommand.length === 2){
            let value = await workspace.getVarValue(currentDocId, splitCommand[0]);
            if(value === undefined){
                await $$.throwError("Variable not found:", splitCommand[0]);
                return;
            }

            const command = value[splitCommand[1]];
            if(!command){
                console.debug(">>>>>>>> Value of" + ` ${currentDocId}.${splitCommand[0]} is` + $$.dumpObject(value));
                await $$.throwError(`Command not found: ${splitCommand[1]} in Object "${$$.dumpObject(value)}"`);
                return;
            }
            let result = await command.call(value, inputValues, outputValues, currentDocId, workspace);
            //save the status of the variable just in case that the function had a side effect on its state
            console.debug(">>>>>>> Saving value of variable", splitCommand[0]);
            await workspace.setVarValue(currentDocId, splitCommand[0], value);
            return result; // the result of the command will be immediately  assigned to the output variable
        }
        let commandFunction = commands[commandName];
        if(!commandFunction){
            await $$.throwError("Unknown command '" + commandName + "'");
        }
       // console.debug(">>>>>>> Running command", commandName);
        return await commandFunction(inputValues, outputValues, currentDocId, workspace);
    }

    this.registerCommand = function (commandName, commandFunction) {
        commands[commandName] = commandFunction;
    }

}

const createRegistry = async function (workspace) {
    let registry = null;
    registry = new CommandsRegistry(workspace);

    const {tableCommands} = await import("../predefined/Table.js");
    for(let commandName in tableCommands){
        registry.registerCommand(commandName, tableCommands[commandName]);
    }
    const {init} = await import("../predefined/DocumentCommands.js");
    await init();
    return registry;
}
export {
    createRegistry
}