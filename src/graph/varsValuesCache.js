
function VarsValuesCache() {
    let cache = {};
    let changedKeys = {};

    this.get = function (key) {
        $$.debug("varsValuesCache", "get", `${key} got ${cache[key] && cache[key].deref() !== undefined}`);
        if (cache[key] === undefined) {
            return undefined;
        }
        return cache[key].deref();
    }
    this.set = function (key, value) {
        if(value === undefined){
            $$.debug("varsValuesCache", "delete", key);
        } else {
            $$.debug("varsValuesCache", "set", key);
        }
        if(value === undefined){
            delete cache[key];
            return;
        }
        cache[key] = new WeakRef(value);
    }

    this.has = function (key) {
        //return false;
        $$.debug("varsValuesCache", "has", `${key} got ${cache[key] && cache[key].deref() !== undefined}`);
        return cache[key] !== undefined && cache[key].deref() !== undefined;
    }

    this.delete = function (key) {
        $$.debug("varsValuesCache", "delete", key);
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