
let errorFromLastBuild = [];

$$.recordBuildError = function (text, err) {
    if(!err){
        err = "";
    }
    console.debug("BUILD ERROR:" , text, err);
    if (!err) {
        err = new Error(text);
    }
    errorFromLastBuild.push({
        text: text,
        err: err
    });
}

$$.getBuildErrors = function () {
    if (errorFromLastBuild.length === 0) {
        return undefined;
    }
    let errors = errorFromLastBuild.map(error => {
        return {
            text: error.text,
            err: error.err.message
        };
    });
    errorFromLastBuild = [];
    return errors;
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
    //frequent debug features
    special:true,
    commandExecution:false,
    objectLifeCycle:false,
    variables:false,
    varValues:false,
    varDebug:true,
    //less frequent debug features
    macro:false,
    alias:false,
    jsdef:false,
    parser:false,
    topologicalSort:false,
    assign:false,
    table:false,
    math:false,
    assert:false,
    if:false,
    overwrite:false,
    set:false,
    best:false,
    diff:false,
    sopEncoding:false,
    varsValuesCache:false,
    chainAlias:true
}

$$.debug = function (scope, ...args) {
    if($$.debugFeatures[scope] || $$.debugEnabled){
        let comment = args[0];
        args = args.slice(1);
        let detailsString = "";
        if(args.length === 0){
            console.debug(`>>> DEBUG '${scope}': ${comment}`);
            return;
        } else {
            if(args.length === 1){
                detailsString = args[0];
            } else {
                let argsAsStringArray = args.map(arg => {
                    if (typeof arg === "object") {
                        return JSON.stringify(arg);
                    }
                    return arg;
                });
                if (argsAsStringArray.length !== 0) {
                    detailsString = `:\n\t[\n\t${argsAsStringArray.join(",\n\t")}\n\t]`;

                }}
            }
        console.debug(`>>> DEBUG '${scope}': ${comment} ${detailsString}`);
    }
}