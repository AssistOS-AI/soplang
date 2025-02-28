/*
 The config object contains  definitions of objects that have a availableBalance and a lockedBalance, plus any other properties that are needed.
 For the creation of these objects and the management of their properties, dynamic functions are created based on configuration.

 */
const {transformToUserID} = require("../util/CoreUtil");
const MathMoney = require("../util/CoreUtil").MathMoney;


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
        config[itemType].forEach(property => {
            configMap[itemType][property] = true;
        });
    }


    function hasField(itemType, field) {
        return configMap[itemType][field] === true;
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
        let niceId = transformToUserID(currentNumber, firstLetter);
        //console.debug(">>>> Next object ID for type " + itemType + " is " + niceId + " with account number " + currentNumber);
        return {accountNumber: currentNumber, id: niceId};
    }

    function getCreationFunction(itemType) {
        return async function (initialValues) {
            let {accountNumber, id} = nextObjectID(itemType);
            let obj = {accountNumber};
            for (let property in initialValues) {
                if (!hasField(itemType, property)) {
                    $$.throwError(new Error("Invalid property named " + property + " in initialisation values for item type " + itemType));
                    return undefined;
                }
                obj.availableBalance = 0;
                obj.lockedBalance = 0;
                obj[property] = initialValues[property];
            }
            //console.debug(">>>> Created object of type " + itemType + " with id " + id, JSON.stringify(obj));
            obj = await smartStorage.createObject(id, obj);
            auditLog(AUDIT_EVENTS.CREATE_OBJECT, undefined, itemType, id);
            return obj;
        }
    }

    function getGetterFunction(itemType, property) {
        return async function (objectID) {
            let obj = await smartStorage.loadObject(objectID);
            return obj[property];
        }
    }

    function getSetterFunction(itemType, property) {
        //console.log(config[itemType]);
        return async function (objectID, value) {
            if (!hasField(itemType, property)) {
                $$.throwError(new Error("Unknown property named " + property + " for item type " + itemType));
            }
            await smartStorage.updateProperty(objectID, property, value);
            return value;
        }
    }

    for (let itemType in config) {
        addFunctionToSelf("create", itemType, "", getCreationFunction(itemType));
        addFunctionToSelf("get", itemType, "", async function (objectID) {
            return await smartStorage.loadObject(objectID);
        });

        addFunctionToSelf("update", itemType, "", async function (objectID, values) {
            let obj = await smartStorage.loadObject(objectID);
            for (let key in values) {
                if (!hasField(itemType, key)) {
                    throw new Error("Invalid property named " + key + " for item type " + itemType);
                }
            }
            await smartStorage.updateObject(objectID, values);
            return obj;
        });

        config[itemType].forEach(property => {
            addFunctionToSelf("get", itemType, property, getGetterFunction(itemType, property));
            addFunctionToSelf("set", itemType, property, getSetterFunction(itemType, property));
        });
    }

    this.getBalance = async function (objectID) {
        let obj = await smartStorage.loadObject(objectID);
        if (!obj.availableBalance) {
            obj.availableBalance = 0;
        }
        return MathMoney.normalise(obj.availableBalance);
    }

    this.getLockedBalance = async function (objectID) {
        let obj = await smartStorage.loadObject(objectID);
        if (!obj.lockedBalance) {
            obj.lockedBalance = 0;
        }
        return MathMoney.normalise(obj.lockedBalance);
    }

    this.mintPoints = async function (amount) {
        let initialMintingDone = await smartStorage.getProperty("system", "initialMintingDone");
        if (initialMintingDone === true) {
            $$.throwError(new Error("Initial minting already done!"), "Failing to mint " + amount + " points", "Initial minting already done!");
        }

        let availableBalance = this.getBalance("system");
        if (availableBalance === undefined || isNaN(availableBalance)) {
            availableBalance = 0;
        }
        availableBalance += amount;
        await smartStorage.updateProperty("system", "availableBalance", availableBalance);
        await smartStorage.updateProperty("system", "initialMintingDone", true);
        auditLog(AUDIT_EVENTS.MINT, "system", amount, "Initial minting");
        return true;
    }

    this.rewardFounder = async function (userID, amount) {
        let foundersRewardDone = await smartStorage.getProperty("system", "foundersRewardDone");
        if (foundersRewardDone === true) {
            $$.throwError(new Error("Founders already rewarded!"), "Failing to reward " + amount + " points", "Founders already rewarded!");
        }
        await this.rewardUser(userID, amount, "Founders reward");
        await smartStorage.updateProperty("system", "foundersRewardDone", true);
        return true;
    }

    this.lockPoints = async function (objectID, amount, reason) {
        amount = MathMoney.normalise(amount);
        //console.debug(" >>>>> Locking " + amount + " points for " + objectID + " for " + reason);
        let obj = await smartStorage.loadObject(objectID);
        //await console.debug(" <<<<<< Dumping object before locking", obj);
        if (obj.availableBalance < amount) {
            $$.throwError(new Error("Insufficient points to lock"), "Failing to lock " + amount + " points", " having only " + obj.availableBalance);
        }
        obj.availableBalance -= amount;
        obj.lockedBalance += amount;
        //await console.debug(" <<<<<< Dumping object after locking", obj);
        await smartStorage.updateObject(objectID, {
            "lockedBalance": obj.lockedBalance,
            "availableBalance": obj.availableBalance
        });
        auditLog(AUDIT_EVENTS.LOCK, objectID, amount, reason);
        return true;
    }

    this.unlockPoints = async function (objectID, amount, reason) {
        amount = MathMoney.normalise(amount);
        //console.debug(" >>>>> Unlocking " + amount + " points for " + objectID + " for " + reason);
        let obj = await smartStorage.loadObject(objectID);
        if (obj.lockedBalance < amount) {
            $$.throwError(new Error("Insufficient points to unlock " + amount + " points" + " having only " + obj.lockedBalance));
        }
        obj.lockedBalance -= amount;
        obj.availableBalance += amount;
        await smartStorage.updateObject(objectID, {
            "lockedBalance": obj.lockedBalance,
            "availableBalance": obj.availableBalance
        });
        auditLog(AUDIT_EVENTS.UNLOCK, objectID, amount, reason);
        return true;
    }

    this.rewardUser = async function (userID, amount, reason) {
        amount = MathMoney.normalise(amount);
        //console.debug(">>>> Start rewarding user " + userID + " with " + amount + " points for " + reason);
        await self.transferPoints(amount, "system", userID);
        auditLog(AUDIT_EVENTS.REWARD, userID, amount, reason);
        //console.debug(">>>> Rewarded user " + userID + " with " + amount + " points for " + reason);
        return true;
    }

    this.confiscateLockedPoints = async function (userID, amount, reason) {
        amount = MathMoney.normalise(amount);
        //console.debug(">>>> Confiscating " + amount + " points from " + userID + " for " + reason);
        let obj = await smartStorage.loadObject(userID);
        await self.transferLockedPoints(amount, userID, "system", reason);
        await self.unlockPoints("system", amount, reason);
        auditLog(AUDIT_EVENTS.CONFISCATE_LOCKED, userID, amount, reason);
        return true;
    }


    this.transferPoints = async function (amount, fromId, toID, reason) {
        amount = MathMoney.normalise(amount);
        let fromObj = await smartStorage.loadObject(fromId);
        let toObj = await smartStorage.loadObject(toID);
        if (fromObj.availableBalance < amount) {
            $$.throwError(new Error("Transfer rejected"), "Failing to transfer " + amount + " points", " having only " + fromObj.availableBalance + " from " + fromId + " to " + toID);
        }
        fromObj.availableBalance -= amount;
        toObj.availableBalance += amount;
        await smartStorage.updateProperty(fromId, "availableBalance", fromObj.availableBalance);
        await smartStorage.updateProperty(toID, "availableBalance", toObj.availableBalance);
        auditLog(AUDIT_EVENTS.TRANSFER_AVAILABLE_FROM, fromId, amount, " to " + toID, reason);
        auditLog(AUDIT_EVENTS.TRANSFER_AVAILABLE_TO, toID, amount, "from " + fromId, reason);
        return true;
    }

    this.transferLockedPoints = async function (amount, fromId, toID, reason) {
        amount = MathMoney.normalise(amount);
        let fromObj = await smartStorage.loadObject(fromId);
        let toObj = await smartStorage.loadObject(toID);
        if (fromObj.lockedBalance < amount) {
            throw new Error("Insufficient locked points to transfer");
        }
        fromObj.lockedBalance -= amount;
        toObj.lockedBalance += amount;
        await smartStorage.updateProperty(fromId, "lockedBalance", fromObj.lockedBalance, reason);
        await smartStorage.updateProperty(toID, "lockedBalance", toObj.lockedBalance, reason);
        auditLog(AUDIT_EVENTS.TRANSFER_LOCKED_FROM, fromId, amount, " to " + toID, reason);
        auditLog(AUDIT_EVENTS.TRANSFER_LOCKED_TO, toID, amount, "from " + fromId, reason);
        return true;
    }

    this.getUserLogs = async function (userID) {
        return await systemLogger.getUserLogs(userID);
    }

    this.loginEvent = function (userID, state, reason) {
        auditLog(AUDIT_EVENTS.LOGIN, userID, state, reason);
    };

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

    this.shutDown = function () {
        smartStorage.shutDown();
    }
}


module.exports = {
    getPersistentStorage: function (elementStorageStrategy, config) {
        return new ExtensiblePersistence(elementStorageStrategy, config);
    }

}