
Variables Syntax:
    A command can have any number of inputs and outputs
    Each variable is unique at the level of a document
    $var internal variable in document used as right value (input) in commands
    @var internal variable in document used as left value (output) in commands
    %internalVar is a variable in the text of a paragraph, it still has to be unique at the level of a document
    @internalVar is allowed to be used in commands as an output and will change the text of the paragraphs
    %text is a special variable that represents the text of the paragraph
    

    $docId      : URI with current document
    $document   : object with chapterIDs, title and array of paragraphs, commands
    $docTitle   : title of the current document
    $docCommands : array with commands at the level of current chapter

    $chapterId  : URI with current chapter
    $chapter    : array of paragraphs
    $chapterTitle  : title of the current chapter
    $chapterCommands : array with commands at the level of document

    $parId      : URI with current paragraph
    $text       : text of the current paragraph
    $commands   : array with commands at the level of paragraph

Predefined Commands
    #set the value of output by concatenating the values of inputs. 
    #Inputs could be also strings and numbers. Spaces are added between inputs.
        set @output $input1 $input2  ... $inputN
        @output = concat $input1 $input2  ... $inputN
        @output : concat $input1 $input2  ... $inputN    
        @output  concat $input1 $input2  ... $inputN

    #attaching a file or an external document to a variable called localName. If the attachmentURI is empty, a new file will be created
        # type could be adoc, image, video, text, json, csv, blob, pdf, ppt, xls, docx, pptx, xlsx
        # "adoc" is an internal document in the current workspace
        # attachmentURI is a KeySSI in the form: ssi:type:domain:control:validation:path
        #domain could be empty for local files, S3 storage URL, web URLs,  identifiers of DATA Processing Unit
        attach @localName type attachmentURI

    #link a variable in the current document with a variable in another document
        alias localVariable otherdocId variableInOtherDocument

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


