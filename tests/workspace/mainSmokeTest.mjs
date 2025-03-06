

import {} from "../deps/clean.mjs";

import {getCore} from "../../plugins/WorkspacePlugin.js";
let workSpaceCore = await getCore();

let ownerId = await workSpaceCore.createUser("user1@email.com", "User 1 1", "owner").id;
await workSpaceCore.createWorkspace("Test Workspace", ownerId);


let testDoc ={
    "doc1": {
            docId: "doc1",
            "title": "Document Title",
            "text": "Document Example",
            "commands": "",
            chapters:[
                {
                    "chapter1": {
                        "title": "Chapter1",
                        "commands": "overwrite title with 'New Title for Chapter1'",
                        paragraphs:[
                            {
                                text: " comment %localText Hello % das",
                                commands: "@hello as $localText"
                            },
                            {
                                text: " comment %localText World % comment",
                                commands: "@helloWorld set $hello $localText"
                            }
                        ]
                    }
                }
            ]
        },
        "doc2": {
            title: "Chapter 2",
            docId: "doc2",
            infoText: "abstract",
            commands: "@aliasHelloWorld alias doc1 helloWorld" + "\n" +
                "@changedText if [unequal $text 'abstract']  then $text "+ "\n" +
                "overwrite aliasHelloWorld with $changedText"
          }
    };

for(let docId in testDoc){
    let doc = testDoc[docId];
    let docObj = await workSpaceCore.createDocument(docId, "category");
    await workSpaceCore.applyTemplate(docObj.id, doc);
}

await workSpaceCore.forceSave();

await workSpaceCore.buildAll();

console.assert(await workSpaceCore.getValue("doc1", "helloWorld") === "Hello", "Failed to get $helloWorld");

await workSpaceCore.shutDown();