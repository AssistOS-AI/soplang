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
        const regex = /^[a-zA-Z0-9]+$/;
        if (!regex.test(input)) {
            throw new Error("For security reasons only letters and numbers are allowed in object IDs!");
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
    async function loadWithCache(id){
        if(!cache[id]){
            cache[id] = await storageStrategy.loadObject(id, false);
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