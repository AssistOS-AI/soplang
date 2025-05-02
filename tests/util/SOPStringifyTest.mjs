import {} from "../deps/clean.mjs";
import {} from "../../src/graph/SOPEncoding.js"


const S1 = "Hello 'world`";
const S2 = 'Hello "world"';

const OBJ1 = {
    name: "Hello 'world`",
    age: 10.5,
    isTrue: true,
    nullValue:null,
    /*undefinedValue:undefined,*/
    emptyArray: [],
    emptyObject: {},
    emptyString: "",
    nonemptyString: "Hello",
    nonemptyArray: [1, "2", 3],
    nonemptyObject: { a: 1, b: "2" },
    arrayOfObjects: [{ a: 1 }, { b: "2" }],
}

await $$.checkValue(await $$.SOPParse($$.SOPStringify(S1)), S1 , "Check S1:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(S2)), S2 , "Check S2:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.name)), OBJ1.name, "Check OBJ1.name:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.age)), OBJ1.age, "Check OBJ1.age:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.isTrue)), OBJ1.isTrue, "Check OBJ1.isTrue:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.nullValue)), OBJ1.nullValue, "Check OBJ1.nullValue:");
//await $$.checkValue($$.SOPParse($$.SOPStringify(OBJ1.undefinedValue)), OBJ1.undefinedValue, "Check OBJ1.undefinedValue:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.emptyArray)), OBJ1.emptyArray,     "Check OBJ1.emptyArray:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.emptyObject)), OBJ1.emptyObject,   "Check OBJ1.emptyObject:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.emptyString)), OBJ1.emptyString,   "Check OBJ1.emptyString:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.nonemptyString)), OBJ1.nonemptyString, "Check OBJ1.nonemptyString:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.nonemptyArray)), OBJ1.nonemptyArray, "Check OBJ1.nonemptyArray:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.nonemptyObject)), OBJ1.nonemptyObject, "Check OBJ1.nonemptyObject:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.arrayOfObjects)), OBJ1.arrayOfObjects, "Check OBJ1.arrayOfObjects:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.arrayOfObjects[0])), OBJ1.arrayOfObjects[0], "Check OBJ1.arrayOfObjects[0]:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1.arrayOfObjects[1])), OBJ1.arrayOfObjects[1], "Check OBJ1.arrayOfObjects[1]:");
await $$.checkValue(await $$.SOPParse($$.SOPStringify(OBJ1)), OBJ1, "Check OBJ1:");
console.debug("Print OBJ1 SOP Stringification:", $$.SOPStringify(OBJ1));

await $$.exit();
