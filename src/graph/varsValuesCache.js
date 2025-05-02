
function VarsValuesCache() {
    let cache = {};
    let changedKeys = {};

    this.get = function (key) {
        if (cache[key] === undefined) {
            return undefined;
        }
        return cache[key].deref();
    }
    this.set = function (key, value) {
        if(value === undefined){
            delete cache[key];
            return;
        }
        cache[key] = new WeakRef(value);
    }

    this.has = function (key) {
        //return false;
        return cache[key] !== undefined && cache[key].deref() !== undefined;
    }

    this.delete = function (key) {
        delete cache[key];
    }
}

let varsValuesCaches = {};

function getCache(cacheType) {
    if (varsValuesCaches[cacheType] === undefined) {
        varsValuesCaches[cacheType] = new VarsValuesCache();
    }
    return varsValuesCaches[cacheType];
}

export {
    getCache
}