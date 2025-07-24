async function WorkspaceUser(){
    let self = {};
    let persistence = $$.loadPlugin("DefaultPersistence");

    self.createUser = async function (email, displayName, role) {
        return await persistence.createUser({
            email: email,
            displayName: displayName,
            role: role
        });
    }

    self.updateUser = async function (userId, email, displayName, role) {
        return await persistence.updateUser(userId,{
            email: email,
            displayName: displayName,
            role: role
        });
    }
    self.deleteUser = async function (userId) {
        return await persistence.deleteUser(userId);
    }

    self.getUser = async function (email) {
        return await persistence.getUser(email);
    }

    self.getAllUsers = async function () {
        return await persistence.getEveryUserObject();
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

export async function getInstance() {
    if (!singletonInstance) {
        singletonInstance = await WorkspaceUser();
    }
    return singletonInstance;
}

export function getAllow() {
    return async function(globalUserId, email, command, ...args) {
        return true;
    };
}

export function getDependencies() {
    return ["DefaultPersistence"];
}