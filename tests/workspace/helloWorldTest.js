
let initialState ={
     variables: {
        "helloWorld": "Hello World"
     },
    documents:{
        "doc1": {
            "info": {
            "title": "Document Title",
            "text": "Document Example",
            "commands": ""
            },
            "chapter1": {
                "title": "Chapter1",
                "commands": "",
                "paragraph1": {
                    text: " dasd  da d %text Hello % das",
                    commands: "@helloWorld set $text"
                }
            }
        },
        "doc2": {
            "chapter1": {
                "title": "Chapter 2",
                "commands": "",
                "paragraph1": {
                    text: "World",
                    commands: "@newHelloWorld set $helloWorld %text"
                }
            }
          }
        }
    };

let executionEngineModule = require('../../src/SpaceGraph/executionEngine.js') ;

let space = executionEngineModule.load();
space.initialise(initialState);
console.log(space.getState());
console.log(space.getVarValue("doc1", "helloWorld") === "Hello World!");
space.change("doc1", "chapter1", "paragraph1", "New Hello ");
space.computeInvalidDependencies();
space.rebuildInvalidDependencies();
console.log(space.getState());

console.log(space.getVarValue("doc1", "helloWorld") === "New Hello World!");

