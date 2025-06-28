async function Process() {
    const self = {};

    const persistence = await $$.loadPlugin("DefaultPersistence");

    await persistence.configureTypes({
        process: {
            id: "random",
            name: "string",
            description: "string",
            code: "string"
        },
    })

    await persistence.createIndex("process", "name");

    self.getProcesses= async function () {
        return await persistence.getEveryProcessObject();
    }
    self.getProcess = async function (processId) {
        const processes = await  persistence.getEveryProcessObject();
        const process = processes.find(p => p.id === processId);
        if (!process) {
            throw new Error(`Process ${processId} not found`);
        }
        return process;
    }
    self.addProcess = async function (processObject) {
        return await persistence.createProcess(processObject);
    }
    self.updateProcess = async function (processId, processObject) {
        return await persistence.updateProcess(processId, processObject);
    }
    self.deleteProcess = async function (processId) {
        return await persistence.deleteProcess(processId);
    }

    return self;
}

let singletonInstance;

const getInstance = async function () {

    if (!singletonInstance) {
        singletonInstance = await Process();
    }
    return singletonInstance;
}
const getAllow = function () {
    return async function (globalUserId, email, command, ...args) {
        return true;
    }
}
const getDependencies = function () {
    return ["DefaultPersistence"];
}
export {
    getInstance,
    getAllow,
    getDependencies
}