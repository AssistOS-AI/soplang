
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

    commands.alias = async function (inputValues, outputValues) {
        $$.throwError("Alias command should not be executed as normal commands");
    }

    this.runCommand =  async function (commandName, inputValues, outputValues ) {
        let commandFunction = commands[commandName];
        if(!commandFunction){
            $$.throwError("Unknown command '" + commandName + "'");
        }
        return await commandFunction(inputValues, outputValues);
    }

    this.registerCommand = function (commandName, commandFunction) {
        console.log("Registering command", commandName);
        commands[commandName] = commandFunction;
    }

}

module.exports = {
    createRegistry: function (workspace) {
        return new CommandsRegistry(workspace);
    }
}