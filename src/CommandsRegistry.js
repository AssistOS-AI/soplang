
function CommandsRegistry( workSpace) {
    let commands = {
        cat: async function (inputValues ) {
            return inputValues.join(" ");
        },
        list : async function (inputValues) {
            return inputValues;
        }
    };

    commands.set = commands.cat;
    commands.value = commands.cat;
    commands.concat = commands.cat;
    commands.def = commands.define = async function (inputValues, outputValues) {
        let code = "(function(args){" + inputValues[0] + "})";
        console.debug("Define:", outputValues[0], inputValues[0], code);
        commands[outputValues[0]] = eval(code);
    };

    commands.alias = async function () {
        $$.throwError("Alias command should not be executed as normal commands");
    }

    commands.special = async function () {
        $$.throwError("'special' variables should not be initialised as normal variables by running commands");
    }



    this.runCommand =  async function (commandName, inputValues, outputValues, varGraph, varContext  ) {
        let commandFunction = commands[commandName];
        if(!commandFunction){
            $$.throwError("Unknown command '" + commandName + "'");
        }
        console.debug(">>>>>>> Running command", commandName);
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