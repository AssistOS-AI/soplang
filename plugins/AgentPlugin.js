async function AgentPlugin(){
    let self = {};
    let persistence = await $$.loadPlugin("DefaultPersistence");

    self.createAgent = async function (name, description) {
        return await persistence.createAgent({
            name: name,
            description: description
        });
    }
    self.deleteAgent = async function(id){
        return await persistence.deleteAgent(id);
    }
    self.updateAgent = async function (id, values) {
        return await persistence.updateAgent(id, values);
    }

    self.getAgent = async function (id) {
        return await persistence.getAgent(id);
    }

    self.getAllAgents = async function () {
        return await persistence.getEveryAgent();
    }
    self.getAllAgentObjects = async function () {
        return await persistence.getEveryAgentObject();
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