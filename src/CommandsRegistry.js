
function CommandsRegistry( workSpace) {
    let commands = {
        set: async function (inputValues ) {
            return inputValues.join(" ");
        },
        list : async function (inputValues) {
            return inputValues;
        }
    };

    this.runCommand =  async function (commandName, inputValues ) {
        let commandFunction = commands[commandName];
        if(!commandFunction){
            $$.throwError("Unknown command" + commandName);
        }
        return await commandFunction(inputValues);
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