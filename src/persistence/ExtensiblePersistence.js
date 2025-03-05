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
        console.debug("Adding function " + funcName);
        if (self[funcName] !== undefined) {
            throw new Error("Function " + funcName + " already exists! Refusing to overwrite, change your configurations!");
        }
        self[funcName] = func.bind(self);
    }

    function addIndexFunctionToSelf( selfTypeName, fieldName, func) {
        let funcName = "get" + upCaseFirstLetter(selfTypeName) + "By"+upCaseFirstLetter(fieldName);
        console.debug("Adding function " + funcName);
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

    async function getObjectFromIdOrKey(itemType, objectID) {
        //first try to treat the objectID as index value
        let res = await smartStorage.getObjectByField(itemType, undefined, objectID);
        if(!res){
            try {
                if(await smartStorage.objectExists(objectID)){
                    return await smartStorage.loadObject(objectID);
                }
                return undefined;
            } catch (e) {
                console.warn("Unknown errors loading object with id " + objectID, e);
                return undefined;
            }
        }
        return res;
    }

    function getCreationFunction(itemType) {
        return async function (initialValues) {
            if(await smartStorage.hasCreationConflicts(itemType, initialValues)){
                throw new Error("Creation conflicts detected! Refusing to create object of type " + itemType + " with values " + JSON.stringify(initialValues));
            }
            let id = nextObjectID(itemType);
            let obj = {};
            for (let property in initialValues) {
                obj[property] = initialValues[property];
            }
            //console.debug(">>>> Created object of type " + itemType + " with id " + id, JSON.stringify(obj));
            obj = await smartStorage.createObject(id, obj);
            auditLog(AUDIT_EVENTS.CREATE_OBJECT, undefined, itemType, id);
            await smartStorage.updateIndexesAndCollections(itemType, obj.id, true);
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
            await smartStorage.updateIndexesAndCollections(itemType, objectID);
            return obj;
        });



        addFunctionToSelf("get", itemType, "", async function (objectID) {
            return await getObjectFromIdOrKey(itemType, objectID);
        });
    }

    this.getUserLogs = async function (userID) {
        return await systemLogger.getUserLogs(userID);
    }


    this.shutDown = async function () {
        return await smartStorage.shutDown();
    }


    this.forceSave = async function () {
        return await smartStorage.forceSave();
    }


    this.createIndex = async function (typeName, fieldName) {
        addIndexFunctionToSelf(typeName, fieldName, async function (value) {
            return await smartStorage.getObjectByField(typeName, fieldName, value);
        });


        addFunctionToSelf("getEvery", typeName, "", async function () {
            return await smartStorage.getAllObjects(typeName);
        });

        addFunctionToSelf("set",
                        upCaseFirstLetter(fieldName),
                  "For"+ upCaseFirstLetter(typeName),
                    async function (objectId, value) {
                            if(await smartStorage.hasCreationConflicts(typeName, {fieldName, value})){
                            throw new Error("Index conflict detected! Refusing to update object of type " + typeName + " on key  " + fieldName + " and value " + value);
                            }
                        let obj = await getObjectFromIdOrKey(typeName, objectId);
                        return await smartStorage.updateIndexedField(obj.id, typeName, fieldName, value);
                    });
        return await smartStorage.createIndex(typeName, fieldName);
    }

    this.createCollection = async function (collectionName, typeName, fieldName) {
        addIndexFunctionToSelf(collectionName, fieldName, async function (value) {
            return await smartStorage.getCollectionByField(collectionName, value);
        });
        return await smartStorage.createCollection(collectionName, typeName, fieldName);
    }
}


module.exports = {
    getPersistentStorage: async function (elementStorageStrategy, config) {
        return new ExtensiblePersistence(elementStorageStrategy, config);
    }

}