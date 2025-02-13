require("./soplangUtil.js");

function VarContext(valueResolver, _varName, _docID, _chapterId, _paragraphId, _parsedCommand, _value, _timestamp) {
    this.varName = _varName;
    this.docID = _docID;
    this.chapterId = _chapterId;
    this.paragraphId = _paragraphId;
    this.parsedCommand = _parsedCommand;
    this.value = _value;
    this.timestamp = _timestamp;
}

/*
 Variables Syntax:
    A command can have any number of inputs and outputs
    Each variable is unique at the level of a document
    $var internal variable in document used as right value (input) in commands
    @var internal variable in document used as left value (output) in commands
    %internalVar is a variable in the text of a paragraph, it still has to be unique at the level of a document
    @internalVar is allowed to be used in commands as an output and will change the text of the paragraphs
    %text is a special variable that represents the text of the paragraph

  Special Commands
    #set the value of output by concatenating the values of inputs. Inputs could be also strings and numbers
        set @output $input1 $input2  ... $inputN

    #attaching a file or an external document to a variable called localName. If the attachmentURI is empty, a new file will be created
        # type could be adoc, image, video, text, json, csv, blob, pdf, ppt, xls, docx, pptx, xlsx
        # "adoc" is an internal document in the current workspace
        # attachmentURI is a KeySSI in the form: ssi:type:domain:control:validation:path
        #domain could be empty for local files, S3 storage URL, web URLs,  identifiers of DATA Processing Unit
        attach @localName type attachmentURI

    #link a variable in the current document with a variable in another document
        link localVariable $variableRepresentingOtherDocument variableInOtherDocument

    #defining a command as javascript code. Is executed as a function that takes context and args as arguments
        define @output string | attachmentURI

    #adds all the commands defined with define in that file as available commands in the current document
        import fileURI

    #use a personality configured in the environment to ask a question  or continue a text (the concatenated inputs are the LLM prompt)
        ask personalityName|$varWithPersonalityName @output $input1 $input2 ... $inputN

    # variables could be lists (tables) tha contains multiple lines of records (with columns)
        #declare a table and the names of the columns
        table @table  column1 column2 ... columnN
        #select a line from a table and assign it to a variable. Changes of the variable will change the table
        line @variableName @table
        #special syntax with . to select a column from a table or a specific field
        set @variableName.columnName input1 input2 ... inputN
        #sum all the values of a column of a table
        sum @results $table.columnName
        #define a table based on  other table and calling function to define the columns
        tableFrom @tableName $inputTable newTableCol1[sum column1 column2 column3]  newTableCol2[set column5 a b ]

    #mantain generated documents starting from a template given as title, chapters titles and execution of commands
        generate @documentIdentifier "Document Title" "Chapter 1"[command arguments]  "Chapter 2"[command arguments] ... "Chapter N" [command arguments]

    #use of a document as an execution log, each execution of the command will append a new chapter
        appendChapter @documentIdentifier "Chapter Title" [command arguments]

 */



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

    this.getValue = function(docID, name){
        return variables[docID][name];
    }
}

module.exports = {
    load: function (module) {
        return new ExecutionEngine();
    }
}