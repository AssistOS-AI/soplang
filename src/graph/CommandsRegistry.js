const customTypeRegistry = require("./customTypeRegistry");

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
        const customTypeRegistry = require("./customTypeRegistry");
        const typeName = inputValues[0];
        const args = inputValues.slice(1);
        return customTypeRegistry.createInstance(typeName, ...args);
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
            const command = value.getCommands()[splitCommand[1]]
            return await command(inputValues, outputValues, currentDocId, workspace);
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

let tableCommands = require("./tableUtil.js").tableCommands;

module.exports = {
    createRegistry: function (workspace) {
        let registry = new CommandsRegistry(workspace);
        for(let commandName in tableCommands){
            registry.registerCommand(commandName, tableCommands[commandName]);
        }
        return registry;
    }
}