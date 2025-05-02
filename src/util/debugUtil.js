
let errorFromLastBuild = [];

$$.recordBuildError = function (text, err) {
    console.debug("BUILD ERROR:" , text, err);
    if (!err) {
        err = new Error(text);
    }
    errorFromLastBuild.push({
        text: text,
        err: err
    });
}

$$.dumpObject = function (obj) {
    if(typeof obj !== "object"){
        return obj;
    }
    let res = "{";
    for (let key in obj) {
        if (typeof obj[key] === "function") {
            continue;
        }
        res += key + ": " + obj[key] + ", ";
    }
    if(!obj.__type){
        res += `__type: ${obj?.constructor?.name || typeof obj}`;
    }
    res += "}";
    return res;
}

const QUOTE_REPLACEMENT = "__SQUOTE__";
$$.SOPStringify = function (obj) {
    if (obj === undefined) {
        return 'undefined';
    }
    if(typeof obj === "string") {
        return `'${obj.replace(/'/g, QUOTE_REPLACEMENT)}'`;
    }
    let str = JSON.stringify(obj);
    str = str.replace(/'/g, QUOTE_REPLACEMENT);
    return `'${str}'`;
}

$$.SOPParse = function (str) {
    if (str === 'undefined') {
        return undefined;
    }
    if (str[0] === "'") {
        str = str.slice(1, str.length - 1);
        str = str.replace(new RegExp(QUOTE_REPLACEMENT, "g"), "'");
        return JSON.parse(str);
    }
    str = str.replace(new RegExp(QUOTE_REPLACEMENT, "g"), "'");
    return JSON.parse(str);
}

$$.debugEnabled = false;

$$.debugFeatures = {
    table:false,
    math:false,
    assert:true,
    if:false,
    macro:false,
    overwrite:false,
    set:false,
    best:false,
    commandExecution:false,
    special:true,
}

$$.debug = function (scope, ...args) {
    if($$.debugFeatures[scope] || $$.debugEnabled){
        console.debug(`>>> DEBUG feature ${scope}: ${args.join(" ")}`);
    }
}