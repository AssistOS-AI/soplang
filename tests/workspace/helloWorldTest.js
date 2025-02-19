
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
                    text: "Hello ",
                    commands: "set @helloWorld %text"
                }
            }
        },
        "doc2": {
            "chapter1": {
                "title": "Chapter 2",
                "commands": "",
                "paragraph1": {
                    text: "World",
                    commands: "set @newHelloWorld $helloWorld %text"
                }
            }
          }
        }
    };

let executionEngineModule = require('../../src/executionEngine.js') ;

let space = executionEngineModule.load();
space.initialise(initialState);
console.log(space.getState());
console.log(space.getValue("doc1", "helloWorld") === "Hello World!");
space.change("doc1", "chapter1", "paragraph1", "New Hello ");
space.computeInvalidDependencies();
space.rebuildInvalidDependencies();
console.log(space.getState());

console.log(space.getValue("doc1", "helloWorld") === "New Hello World!");

