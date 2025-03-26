
function CommandsRegistry( workSpace) {
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
        },
    };

    commands.def = commands.define = async function (inputValues, outputValues) {
        let code = "(function(args){" + inputValues[0] + "})";
        console.debug("Define:", outputValues[0], inputValues[0], code);
        commands[outputValues[0]] = eval(code);
    };

    commands.alias = async function () {
        await $$.throwError("Alias command should not be executed as normal commands");
    }

    commands.special = async function () {
        await $$.throwError("'special' variables should not be initialised as normal variables by running commands");
    }

    commands.overwrite = async function (inputValues, outputValues, varContext, varGraph) {
        console.debug("Overwriting", outputValues[0], "with", inputValues[0] + "!!!! Not implemented yet");
    }
    commands.if = async function (inputValues, outputValues, varContext, varGraph) {
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


    this.runCommand =  async function (commandName, inputValues, outputValues, varGraph, varContext  ) {
        let commandFunction = commands[commandName];
        if(!commandFunction){
            await $$.throwError("Unknown command '" + commandName + "'");
        }
       // console.debug(">>>>>>> Running command", commandName);
        return await commandFunction(inputValues, outputValues, varContext, varGraph);
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