let typesRegistry = {};

let parseType = function (typeDescription) {
    let words = typeDescription.split(" ");
    let type = words[0];
    if (type === "array") {
        return { type: "array", itemType: words[1] };
    }

    if(type === "singleton"){
        return {type: "singleton", id: words[1]};
    }
    if(type === "index" || type === "mindex" || type === "sindex"){
        return {type, typeName: words[2], fieldName: words[3]};
    }     
    return { type };
}

function expandSchemaWithTypeDetails(schema){
    for (let typeName in schema) {
        let typeDescription = schema[typeName];
        let clonedObject = {};
        for (let fieldName in typeDescription ) {
            clonedObject[fieldName] = parseType(typeDescription[fieldName]);
        }
        typesRegistry[typeName] = clonedObject;
    }
    return true;
}


if(typeof globalThis.$$ === "undefined"){
    globalThis.$$ = {
    }
}
if(typeof globalThis.await $$.throwError === "undefined"){
    async function throwError(error, ...args) {
        if(typeof error === "string"){
            error = new Error(error);
        }
        let errStr = args.join(" ");
        console.debug("Throwing err:", error, errStr);
        throw error;
    }
    await $$.throwError = throwError;
}
/**
 * Converts a decimal integer to its base-36 representation,
 * using the characters 0-9 and A-Z.
 * @param prefix string - The prefix to be added to the base-36 representation.
 * @param {number} numericValue - The decimal integer to convert.
 * @returns {string} - The base-36 representation of the number.
 */
function convertToBase36Id(prefix, numericValue) {
    const alphanumericChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (numericValue === 0) return '0';

    let base36Result = '';
    let currentValue = numericValue;

    while (currentValue > 0) {
        const modulus = currentValue % 36;
        base36Result = alphanumericChars[modulus] + base36Result;
        currentValue = Math.floor(currentValue / 36);
    }
    prefix = prefix.toUpperCase().substring(0,4);
    return "ID"+ prefix+base36Result;
}

function parseObjectAndConvert(typeName, JSONSerialisationAsString){
    let obj;
    if(typeof JSONSerialisationAsString === "string") {
        obj = JSON.parse(JSONSerialisationAsString);
    } else {
        obj = JSONSerialisationAsString;
    }
    JSON.parse(JSONSerialisationAsString);
    let typeSchema = typesRegistry[typeName];
    let res = {};
    for(let fieldName in typeSchema){
        let type = typeSchema[fieldName];
        if(fieldName === "id"){
            res.id = obj.id;
            continue;
        }
        if(type.type === "string"){
            res[fieldName] = obj[fieldName];
        }else if(type.type === "integer"){
            res[fieldName] = parseInt(obj[fieldName]);
        }else if(type.type === "array"){
            let arr = obj[fieldName];
            arr.forEach((item) => {
                res[fieldName].push(parseObjectAndConvert(type.itemType, item));
            });
        }else if(type.type === "object"){
            res[fieldName] = obj[fieldName];
        }else if(type.type === "any"){
            res[fieldName] = obj[fieldName];
        }else{
            await $$.throwError("Unknown type", type.type);
        }
    }
    return res;
}

module.exports = {
    registerSchema : function (schema) {
        /*
        A schema ia an object with each member represent the name of the type and the value is an object enumerating
        the properties of the type. The properties are strings with name of the fieldName and the type description of the fieldName
        The type description of a fieldName is a string  with words separated by space.
         The first word is string, integer, array, object, or any
            for array the second word is the name of type and means that the array contains IDs of objects of that type
         */
        return expandSchemaWithTypeDetails(schema);
    },
    convertToBase36Id,
    parseObjectAndConvert,
    newObject: function(typeName, optionalId){
       let typeSchema = typesRegistry[typeName];
       let res = {};
         for(let fieldName in typeSchema){
              let typeDesc = typeSchema[fieldName];
              if(fieldName === "id"){
                  if(optionalId) {
                      if(typeof optionalId !== "number"){
                          optionalId = parseInt(optionalId);
                          if(isNaN(optionalId)){
                                await $$.throwError("ID must be a number or a string that can be converted to a number", optionalId);
                          }
                      }
                      res.id = convertToBase36Id(typeName,optionalId);
                  } else {
                      if(typeDesc.type === "singleton") {
                          res.id = "singleton";
                      } else {
                          await $$.throwError("ID is required for creating an object of typeDesc", typeName);
                      }
                  }
                  continue;
              }
              switch(typeDesc.type){
                case "string":
                    res[fieldName] = "";
                    break;
                case "integer":
                    res[fieldName] = 0;
                    break;
                case "array":
                    res[fieldName] = [];
                    break;
                case "object":
                    res[fieldName] = {};
                    break;
                case "any":
                    res[fieldName] = null;
                    break;
                case "index":
                    res[fieldName] = {
                            typeName:typeDesc.typeName,
                            fieldName:typeDesc.fieldName,
                            values : {}
                            };
                    break;
                case "mindex":
                      res[fieldName] = {
                          typeName:typeDesc.typeName,
                          fieldName:typeDesc.fieldName,
                          values : {unknown: {}}
                        };
                      break;
                default:
                    await $$.throwError("Unknown typeDesc", typeDesc.type);
              }
         }
    }
}