const process = require("process");
let fs = require("fs").promises;
let path = require("path");
let coreUtils = require("../util/sopUtil.js");
function SimpleFSStorageStrategy() {
    if(process.env.PERSISTENCE_FOLDER === undefined) {
        console.error("PERSISTENCE_FOLDER environment variable is not set. Please set it to the path where the logs should be stored. Defaults to './work_space_data/'");
        process.env.PERSISTENCE_FOLDER = "./work_space_data/"
    }

    this.init = async function(){
        try{
            await fs.mkdir(process.env.PERSISTENCE_FOLDER, {recursive: true});
        } catch (error) {
            console.error("Error creating folder", process.env.PERSISTENCE_FOLDER, error);
        }
    }

    function getFilePath(input){
        const regex = /^[a-zA-Z0-9_]+$/;
        if (!regex.test(input)) {
            throw new Error("For security reasons only letters and numbers are allowed in object IDs!" + " Provided id is: " + input);
        }
        return path.join(process.env.PERSISTENCE_FOLDER, input);
    }

    this.loadObject = async function (id, allowMissing) {
        try{
            if(!id){
                $$.throwError("An object identifier is required for loading!" + " Provided id is: " + id);
                return undefined;
            }
            const filePath = getFilePath(id);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if(!allowMissing){
                $$.throwError(error,`Error loading object with id [${id}]` , "Allow missing is:", typeof allowMissing, allowMissing, "Error is:");
            }
            return undefined;
        }
    }

    this.storeObject = async function (id, obj) {
        //console.debug(">>> Storing object with ID", id, "and value", obj);
        try {
            const filePath = getFilePath(id);
            await fs.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
        } catch (error) {
            $$.throwError(error, `Error storing object [${id}] Error is:` + error.message);
        }
    };
}
function AutoSaverPersistence(storageStrategy, periodicInterval) {
    this.storageStrategy = storageStrategy;
    let self = this;

    let cache = {};
    let modified = {};

    this.init = async function(){
        let systemObject = await storageStrategy.loadObject("system", true);
        if(!systemObject || !systemObject.currentNumber === undefined){
            systemObject = await self.createObject("system", { currentNumber: 1});
        }
        cache["system"] = systemObject;
        //console.debug(">>> Initialised cache", cache);
    }

    this.getNextObjectId = function(){
        let systemObject = cache["system"];
        systemObject.currentNumber++;
        setForSave("system");
        return systemObject.currentNumber;
    }

    this.createObject = async function(id, obj) {
        if(!id){
            throw new Error("ID is required for creating an object!" + " provided ID: " + id);
        }
        cache[id] = await storageStrategy.loadObject(id, true);
        if(cache[id]){
            $$.throwError(new Error("Object with ID " + id + " already exists!"));
        }
        cache[id] = obj;
        obj.id = id;
        setForSave(id);
        return obj;
    }
    async function loadWithCache(id, allowMissing= false){
        if(!cache[id]){
            cache[id] = await storageStrategy.loadObject(id, allowMissing);
        }
        return new Promise((resolve) => setImmediate(() => resolve(cache[id])));
    }

    function setForSave(id){
        //console.debug(">>> Set for save", id, "cache is", cache);
        modified[id] = true;
    }

    this.loadObject = async function (id) {
        return await loadWithCache(id);
    }

    this.getProperty = async function (id, key) {
        let obj = await loadWithCache(id);
        //console.debug(">>> Get property", key, "from", obj, "Current cache is", cache, "Value returned is ", obj[key]);
        return obj[key];
    }

    this.setProperty = this.updateProperty = async function (id, key, value) {
        let obj = await loadWithCache(id);
        obj[key] = value;
        //console.debug(">>> Update property", key, "from", obj, "Current cache is", cache);
        setForSave(id);
    }

    this.updateObject = async function (id, values) {
        let obj = await loadWithCache(id);
        for(let key in values){
            obj[key] = values[key];
        }
        //console.debug(">>> Update object", id, "with", values, "Current cache is", cache);
        setForSave(id);
    }

    let _indexes = {};
    let _collections = {};

     this.updateIndexesAndCollections = async function (typeName, objId){
         let obj = await loadWithCache(objId);
         let indexFieldName = _indexes[typeName];
         if(indexFieldName){
             console.debug(">>> Found index" + indexFieldName + " for type " + typeName);
             let indexId = typeName + "_" + indexFieldName;
             let index = await loadWithCache(indexId);
             if(index.ids[obj[indexFieldName]] === undefined){
                 index.ids[obj[indexFieldName]] = objId;
                 setForSave(indexId);
             }
             if(index.ids[obj[indexFieldName]] !== objId){
                    $$.throwError(new Error("Duplicate value for field " + indexFieldName + " in type " + typeName));
                }
            }

         if(_collections[typeName]){
             let collectionName = _collections[typeName].collectionName;
             console.debug(">>> Found collection" + collectionName + " grouped by field " + _collections[typeName].fieldName + " for type " + typeName);
             let fieldName = _collections[typeName].fieldName;
             let collection = await loadWithCache(collectionName);
             if(!collection.items[obj[fieldName]]){
                 collection.items[obj[fieldName]] = [];
             }
             if(collection.items[obj[fieldName]].indexOf(objId) === -1){
                 collection.items[obj[fieldName]].push(objId);
                 setForSave(collectionName);
             }
         }
     }

     this.hasCreationConflicts = async function(typeName, values){
         let indexFieldName = _indexes[typeName];
         if(indexFieldName){
             console.debug(">>> Found index" + indexFieldName + " for type " + typeName);
             let indexId = typeName + "_" + indexFieldName;
             let index = await loadWithCache(indexId);
             if(index.ids[values[indexFieldName]] !== undefined){
                 return true;
             }
         }
         return false;
     }

    this.createIndex = async function (typeName, fieldName) {
        if(_indexes[typeName]){
            $$.throwError(new Error("Index for type " + typeName + " already exists!"));
        }
        _indexes[typeName] = fieldName;

        let objId = typeName + "_" + fieldName;
        let obj = await loadWithCache(objId, true);
        if(!obj){
            await self.createObject(objId, { ids: {}});
            setForSave(objId);
        }
    }

    this.getAllObjects = async function (typeName) {
        let fieldName = indexes[typeName];
        let objId = typeName + "_" + fieldName;
        let obj = await loadWithCache(objId);
        return obj.values();
    }

    this.getObjectByField = async function (typeName, fieldName, fieldValue) {
        let objId = typeName + "_" + fieldName;
        let index = await loadWithCache(objId);
        let indexValueAsId = index.ids[fieldValue];
        if(indexValueAsId === undefined){
            console.debug(">>> Object of type '" + typeName + "' not found for field '"+ fieldName+"' with value '"+ fieldValue + "'");
            return undefined;
        }
        return await self.loadObject(indexValueAsId);
    }

    this.createCollection = async function (collectionName, typeName, fieldName) {
        if(_collections[typeName]){
            $$.throwError(new Error("Collection for type " + typeName + " already exists!"));
        }
        _collections[typeName] = {collectionName,fieldName};

        let obj = await loadWithCache(collectionName, true);
        if(!obj){
            await self.createObject(collectionName, { items: {}});
            setForSave(collectionName);
        }

    }

    this.getCollectionByField = async function (collectionName, fieldValue) {
        let collection = await loadWithCache(collectionName);
        return collection.items[fieldValue];
    }

    async function saveAll (){
        for(let id in modified){
            delete modified[id];
            await storageStrategy.storeObject(id, cache[id]);
        }
    }

    let intervalId = setInterval(async function(){
        await saveAll();
    }, periodicInterval);

    this.shutDown = async function(){
        clearInterval(intervalId);
        await saveAll();
    }

    this.forceSave = async function(){
        await saveAll();
    }
}

module.exports = {
    getAutoSaverPersistence: async function (storageStrategy) {
        if(!storageStrategy) {
            console.debug("No storage strategy provided, using SimpleFSStorageStrategy");
            storageStrategy = new SimpleFSStorageStrategy();
        }
        let autoSaver = new AutoSaverPersistence(storageStrategy);
        await autoSaver.init()
        return autoSaver;
    },
    getSimpleFSStorageStrategy: function () {
        return new SimpleFSStorageStrategy();
    }
};