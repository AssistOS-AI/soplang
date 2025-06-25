    async function Form() {
    const self = {};

    const persistence = await $$.loadPlugin("DefaultPersistence");

    await persistence.configureTypes({
        form: {
            formData: "object",
            varId: "string",
            args: "array any"
        }
    })
    await persistence.createIndex("form", "varId");
    return self;
}
let singletonInstance;

const getInstance = async function () {
    if (!singletonInstance) {
        singletonInstance = await Form();
    }
    return singletonInstance;
}
const getAllow = function () {
    return async function (globalUserId, email, command, ...args) {
        return false;
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