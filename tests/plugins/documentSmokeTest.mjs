
import {} from "../deps/clean.mjs";
import assert from "assert";
await $$.clean();
let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");

let graph = workspace.getGraph();

let testDoc ={
    "doc1": {
            docId: "doc1",
            "title": "Document Title",
            "infoText": "Document abstract Example",
            "commands": "",
            chapters:[
                {
                    "title": "Chapter1",
                    "commands": "@title := 'New Title for Chapter1'",
                    paragraphs:[
                        {
                            text: " comment1 %localText1 Hello % comment2",
                            commands: "@hello := $localText1"
                        },
                        {
                            text: " comment1 %localText2 World % comment2 %anotherLocalText New World %  comment 3 ",
                            commands: "@helloWorld := $hello $localText2"
                        }
                    ]
                },
                {
                    "title": "Chapter2"
                }
            ]
        },
    "doc2": {
            title: "Chapter 2",
            docId: "doc2",
            infoText: "Text of the abstract ",
            commands: "@aliasHelloWorld alias doc1 helloWorld"
          }
    };

/*
    @proposal attachFile id:1234
    @mySummary  ask Assistant $proposal "do a summary"
    @rephrased rephrase $mySummary "do it for a 5 years old child"

 */

for(let docId in testDoc){
    let doc = testDoc[docId];
    let docObj = await documents.createDocument(docId, "category");
    await documents.applyTemplate(docObj.id, doc);
}

await workspace.forceSave();

await graph.printGraph();

await workspace.buildAll();

await graph.printGraph();

assert(await workspace.getVarValue("doc1", "helloWorld") === "Hello World", "Failed to validate the value $helloWorld, expected 'Hello' but got " + await workspace.getVarValue("doc1", "helloWorld"));
assert(await workspace.getVarValue("doc2", "aliasHelloWorld") === "Hello World", "Failed to validate the value $aliasHelloWorld, expected 'Hello' but got " + await workspace.getVarValue("doc1", "helloWorld"));

await workspace.shutDown();
$$.endTest();
