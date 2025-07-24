import {} from "../../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");
import assert from "assert";
let myTestCode = `
    @outsideTable new Table c0 c1 c2 
    @callTable macro table       
        @res table.upsert 1 2 3
        return $res
    end
`;

let doc = await documents.createDocument("doc1", "category", "title");
await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, myTestCode, doc.comments);
await workspace.buildOnlyForDocument(doc.docId);
//new feature
let macroCallValue = await workspace.runMacro(doc.docId, "callTable" , "$outsideTable", "string");
assert(macroCallValue, {"c0": 1, "c1": 2, "c2": 3, truid: "TRUID_1"}, `Test 1 macroCallValue expected to be {"c0": 1, "c1": 2, "c2": 3, truid: "TRUID_1"}, got ${JSON.stringify(macroCallValue)}`);

macroCallValue = await workspace.runMacro(doc.docId, "callTable" , "$doc1/outsideTable");
assert(macroCallValue, {"c0": 1, "c1": 2, "c2": 3, truid: "TRUID_1"}, `Test 1 macroCallValue expected to be {"c0": 1, "c1": 2, "c2": 3, truid: "TRUID_1"}, got ${JSON.stringify(macroCallValue)}`);

let outsideTable = await workspace.getVarValue(doc.docId, "outsideTable");
assert(outsideTable.data, {"c0": 1, "c1": 2, "c2": 3, truid: "TRUID_1"}, `outsideTable data expected to be {"c0": 1, "c1": 2, "c2": 3, truid: "TRUID_1"}, got ${JSON.stringify(outsideTable.data)}`);
await $$.endTest();