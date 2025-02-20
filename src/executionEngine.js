require("./soplangUtil.js");
let  graphDeps = require("./VarsGraph.js");
let VarContext = graphDeps.VarContext;

function ExecutionEngine() {
    let workSpaceState = {};

    let variables = {

    };

    function detectVarsInText(text){

    }

    function detectVarsInCommands(text, docId, chapterID, paragraphID){
        let parseCommandLine = require("./soplangUtil.js").parseCommandLine;
        let lines = text.split("\n");
        lines.forEach(line => {
            let {
                command,
                inputVars,
                outputVars,
                varTypes
            } = parseCommandLine(line);

            for(let ov of outputVars){
                addVariable(ov, docId, chapterID, paragraphID, {
                    command,
                    inputVars,
                    outputVars,
                    varTypes
                }, "", Date.now());
            }
        });
    }

    function formalCheckOfVars(commands){
        // each var should appear only once in the output of any command in any document
    }


    function addVariable(varName, docID, chapterId, paragraphId, parsedCommand, value, timestamp){
        if(!timestamp){
            timestamp = Date.now();
        }
        if(!variables[docID]){
             variables[docID] = {};
         }
        if(variables[docID][varName]){
            $$.throwError("Variable already exists", name, "in document", docID);
        }
         variables[docID][varName] = new VarContext(varName, docID, chapterId, paragraphId, parsedCommand, value, timestamp);
    }

    this.initialise = function(initialState){
        for(let docID in initialState.documents){
            let doc = initialState.documents[docID];
            workSpaceState[docID] = {};
            addVariable("title"+docID, docID, "", "", "$docTitle", doc.info.title);
            detectVarsInCommands(initialState.commands);
            for(let chapterId in doc){
                addVariable("title"+docID+chapterId, docID, chapterId, "", "$chapterTitle", doc[chapterId].title);
                let chapter = doc[chapterId];
                workSpaceState[docID][chapterId] = {};
                detectVarsInCommands(chapter.commands);
                for(let paragraphId in chapter){
                    let paragraph = chapter[paragraphId];
                    addVariable("text"+docID+chapterId+paragraphId, docID, chapterId, paragraphId, "$text", paragraph.text);
                    workSpaceState[docID][chapterId][paragraphId] = {
                        text: paragraph.text,
                        commands: paragraph.commands
                    }
                    detectVarsInText(paragraph.text);
                    detectVarsInCommands(paragraph.commands);
                }
            }
        }
        console.log('Initialising');
    }


    this.changeText = function(docID, chapterId, paragraphId, newValue){
        workSpaceState[docID][chapterId][paragraphId]["text"] = newValue;
        detectVarsInText(newValue);
    }

    this.changeCommands = function(docID, chapterId, paragraphId, newValue){
        workSpaceState[docID][chapterId][paragraphId]["commands"] = newValue;
        detectVarsInCommands(newValue);
    }

    let currentInvalidDependencies = [];
    this.computeInvalidDependencies = function(){
        console.log('Computing invalid dependencies');
    }
    this.rebuildInvalidDependencies = function(){
        console.log('Building a new state');
    }

    this.getState = function(){
        return this.workSpaceState;
    }

    this.getVarValue = function(docID, name){
        return variables[docID][name];
    }
}

module.exports = {
    load: function () {
        return new ExecutionEngine();
    }
}