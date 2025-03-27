async function AgentPlugin(){
    let self = {};
    let persistence = await $$.loadPlugin("DefaultPersistence");

    self.createAgent = async function (name, description) {
        return await persistence.createAgent({
            name: name,
            description: description
        });
    }

    self.updateAgent = async function (agentId, name, description, values) {
        return await persistence.updateAgent(agentId, {
            name: name,
            description: description,
            ...values
        });
    }

    self.getAgent = async function (agentId) {
        return await persistence.getAgent(agentId);
    }

    self.getAllAgents = async function () {
        return await persistence.getEveryAgent();
    }

    self.forceSave = async function () {
        return await persistence.forceSave();
    }

    self.shutDown = async function () {
        return await persistence.shutDown();
    }
    return self;
}

let singletonInstance = undefined;

module.exports = {
    getInstance: async function () {
        if(!singletonInstance){
            singletonInstance = await AgentPlugin();
        }
        return singletonInstance;
    },
    getAllow: function(){
        return async function(globalUserId, email, command, ...args){
            return true;
        }
    },
    getDependencies: function(){
        return ["DefaultPersistence"];
    }
}