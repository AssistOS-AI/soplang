
function getType(obj) {
    if (obj === null) {
        return "null";
    } else if (obj === undefined) {
        return "undefined";
    } else if (typeof obj === "string") {
        return "string";
    } else if (typeof obj === "number") {
        return "number";
    } else if (typeof obj === "boolean") {
        return "boolean";
    } else if (Array.isArray(obj)) {
        return "array";
    } else if (typeof obj === "object") {
        if(obj.__type){
            return obj.__type;
        }
        return "object";
    }
}

/*
   then replace ' with ":_:"
*/
function encodeString(str) {
    if(str === undefined){
        return "undefined";
    }


    try{
        return str.replace(/'/g, "%27");
    } catch(e){
        console.debug("Error encoding string", str, e);
    }
}

function decodeString(str) {
    if(typeof str !== "string"){
        return str;
    }
    return str.replace(/%27/g, "'");
}
/*
    encode any string, object, array, number, boolean, null, undefined as a string
    in format "'sop:type:encoded string'"
 */
$$.SOPStringify = function (obj) {
    //TODO delete this if later

    // if(typeof obj === "string"){
    //     if(obj.startsWith('"$') || obj.startsWith('"~') || obj[0] === "$" || obj[0] === "~"){
    //         $$.debug("sopEncoding", "------------------->   Avoiding to encode strings that looks like variable names", obj, obj.startsWith('"$') );
    //         return obj;
    //     }
    // }
    let res = `'sop:${getType(obj)}:${encodeString(JSON.stringify(obj))}'`;
    $$.debug("sopEncoding",`Encoding object with type ${getType(obj)} to string:`, res);
    if(res === `'sop:string:"[object Object]"'`){
        console.debug("Error encoding object to string", obj);
        throw new Error("Error encoding object to string");
    }
    return res;
}

/*
    decode a string in format "'sop:type:encoded string'" or "sop:type:encoded string"
    to original object, array, number, boolean, null, undefined
    of it is not in the format, treat as a simple string

 */
$$.SOPParse = async function (str) {
    // test if  ' exists at the beginning and the end of the string, then remove them
    if (str.startsWith("'sop") && str.endsWith("'")) {
        str = str.substring(1, str.length - 1);
    }
    let parts = str.split(":");
    if(parts[0] !== "sop"){
        return str;
    }
    if(parts.length < 3){
        return str;
    }
    let encodedText = str.substring(parts[0].length + parts[1].length + 2);
    switch (parts[1]) {
        case "string":
        case "array":
        case "object":
            return JSON.parse(decodeString(encodedText));
        case "number":
            return parseFloat(encodedText);
        case "boolean":
            if(encodedText === "true"){
                return true;
            } else if(encodedText === "false"){
                return false;
            }
            break;
        case "null":
            return null;
        case "undefined":
            return undefined;
        default:
            return await $$.restoreCustomTypeInstance(parts[1], decodeString(encodedText));
    }
}
