/*
 The config object contains  definitions of objects that have a availableBalance and a lockedBalance, plus any other properties that are needed.
 For the creation of these objects and the management of their properties, dynamic functions are created based on configuration.

 */
const {convertToBase36Id} = require("../util/sopUtil");

const AUDIT_EVENTS = {
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
    CREATE_OBJECT: "CREATE_OBJECT"
}

function ExtensiblePersistence(smartStorage, config) {
    let systemLogger = require("../logging/WorkSpaceLogger.js").getSystemLogger();

    let self = this;
    self.systemLogger = systemLogger;

    let configMap = {};
    for (let itemType in config) {
        configMap[itemType] = {};
        for(let fieldName in config[itemType]){
            configMap[itemType][fieldName] = true;
        }
    }

    const upCaseFirstLetter = name => name.replace(/^./, name[0].toUpperCase());


    function auditLog(eventName, forUser, ...args) {
        let details = args.concat(" ");
        if (forUser === undefined) {
            forUser = "system";
        }
        console.debug("AUDIT", forUser, eventName, details);

        systemLogger.log(forUser, eventName, details);
    }

    function addFunctionToSelf(methodCategory, selfTypeName, name, func) {
        let funcName = methodCategory + upCaseFirstLetter(selfTypeName) + (name !== "" ? upCaseFirstLetter(name) : "");
        console.debug("Adding function " + funcName + " to object of type: " + selfTypeName);
        if (self[funcName] !== undefined) {
            throw new Error("Function " + funcName + " already exists! Refusing to overwrite, change your configurations!");
        }
        self[funcName] = func.bind(self);
    }

    function nextObjectID(itemType) {
        let firstLetter = itemType[0].toUpperCase();
        let currentNumber = smartStorage.getNextObjectId();
        return convertToBase36Id(itemType, currentNumber);
    }

    function getCreationFunction(itemType) {
        return async function (initialValues) {
            let id = nextObjectID(itemType);
            let obj = {};
            for (let property in initialValues) {
                obj[property] = initialValues[property];
            }
            //console.debug(">>>> Created object of type " + itemType + " with id " + id, JSON.stringify(obj));
            obj = await smartStorage.createObject(id, obj);
            auditLog(AUDIT_EVENTS.CREATE_OBJECT, undefined, itemType, id);
            return obj;
        }
    }

    for (let itemType in config) {
        addFunctionToSelf("create", itemType, "", getCreationFunction(itemType));
        addFunctionToSelf("update", itemType, "", async function (objectID, values) {
            let obj = await smartStorage.loadObject(objectID);
            for(let key in values){
                obj[key] = values[key];
            }
            await smartStorage.updateObject(objectID, obj);
            return obj;
        });
        addFunctionToSelf("get", itemType, "", async function (objectID) {
            return await smartStorage.loadObject(objectID);
        });
    }

    this.getUserLogs = async function (userID) {
        return await systemLogger.getUserLogs(userID);
    }

    this.addController = async function (objectId, newController, role) {
        let controllers = smartStorage.getProperty(objectId, "controllers");
        if (controllers === undefined) {
            controllers = {};
        }
        //only one owner is allowed
        if (role === "owner") {
            for (let controller in controllers) {
                if (controllers[controller] === "owner") {
                    throw new Error("Only one owner is allowed! Delete the current owner before adding a new one!");
                }
            }
        }

        controllers[newController] = role;
        await smartStorage.setProperty(objectId, "controllers", controllers);
    }

    this.deleteController = async function (objectId, controller) {
        let controllers = smartStorage.getProperty(objectId, "controllers");
        if (controllers === undefined) {
            console.debug("No controllers for object " + objectId);
            return;
        }
        controllers[controller] = undefined;
        delete controllers[controller];
        await smartStorage.setProperty(objectId, "controllers", controllers);
    }

    this.getControllers = async function (objectId) {
        return await smartStorage.getProperty(objectId, "controllers");
    }

    this.hasRole = async function (objectId, controller, role) {
        let controllers = await smartStorage.getProperty(objectId, "controllers");
        if (controllers === undefined) {
            return false;
        }
        return controllers[controller] === role;
    }

    this.getOwner = async function (objectId) {
        let controllers = await smartStorage.getProperty(objectId, "controllers");
        if (controllers === undefined) {
            return undefined;
        }
        for (let controller in controllers) {
            if (controllers[controller] === "owner") {
                return controller;
            }
        }
        return undefined;
    }

    this.shutDown = async function () {
        return await smartStorage.shutDown();
    }


    this.forceSave = async function () {
        return await smartStorage.forceSave();
    }
}


module.exports = {
    getPersistentStorage: async function (elementStorageStrategy, config) {
        return new ExtensiblePersistence(elementStorageStrategy, config);
    }

}