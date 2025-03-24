
import {} from "../deps/clean.mjs";
import assert from "assert";
await $$.clean();
let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();
let allOk = true;

let ownerId = await workspace.createUser("user1@email.com", "User 1 1", "owner").id;
await workspace.createWorkspace("Test Workspace", ownerId);


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
                            text: " comment1 %localText Hello % comment2",
                            commands: "@hello := $localText"
                        },
                        {
                            text: " comment1 %localText World % comment2 %anotherLocalText New World %  comment 3 ",
                            commands: "@helloWorld := $hello $localText"
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
            commands: "@aliasHelloWorld alias doc1 helloWorld" + "\n" +
                "@changedText if [unequal $text 'abstract']  then $text "+ "\n" +
                "overwrite aliasHelloWorld with $changedText"
          }
    };

for(let docId in testDoc){
    let doc = testDoc[docId];
    let docObj = await workspace.createDocument(docId, "category");
    await workspace.applyTemplate(docObj.id, doc);
}

await workspace.forceSave();

await workspace.buildAll();

await graph.printGraph();

assert(await workspace.getVarValue("doc1", "helloWorld") === "Hello", "Failed to get $helloWorld");

await workspace.shutDown();