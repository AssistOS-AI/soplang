
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


$$.debugEnabled = false;

$$.debugFeatures = {
    special:true,
    macro:true,
    parser:true,
    variable:true,
    topologicalSort:true,
    assign:true,
    table:false,
    math:false,
    assert:false,
    if:false,
    overwrite:false,
    set:false,
    best:false,
    commandExecution:false,
    diff:false,
    sopEncoding:false,
}

$$.debug = function (scope, ...args) {
    if($$.debugFeatures[scope] || $$.debugEnabled){
        let comment = args[0];
        args = args.slice(1);
        let argsAsStringArray = args.map(arg => {
            if (typeof arg === "object") {
                return JSON.stringify(arg);
            }
            return arg;
        });
        let detailsString = "";
        if (argsAsStringArray.length !== 0) {
            detailsString = `:\n\t[\n\t${argsAsStringArray.join(",\n\t")}\n\t]`;
        }
        console.debug(`>>> DEBUG '${scope}': ${comment} ${detailsString}`);
    }
}