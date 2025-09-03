import {} from "./SOPEncoding.js"
let varUtil = await import("./varUtil.js");
let sopLangUtil = await import("../util/soplangUtil.js");
let defaultPersistence;

function VarsGraph(commandsRegistry) {
    defaultPersistence = $$.loadPlugin("DefaultPersistence");
    let graph = {};
    let self = this;

    if (!commandsRegistry) {
        $$.throwErrorSync("Commands Registry is mandatory");
    }
    this.init = async function(){
        let graphObj = await defaultPersistence.getGraph("GRAPH");
        graph = graphObj.state;
    }
    commandsRegistry.registerCommand("alias", async function (inputValues, parsedCommand, currentDocId, graph, buildInstance) {
            //can be called with "docId/varName" or "docId varName"
            let targetVarId;
            if(inputValues.length === 1){
                targetVarId = inputValues[0];
            } else {
                let targetDocumentId = inputValues[0];
                let targetVarName = inputValues[1];
                targetVarId = varUtil.getVarID(targetDocumentId, targetVarName);
            }
            let myVarId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
            await varUtil.markAsReferenceToVariable(myVarId, targetVarId, currentDocId);
            await buildInstance.restartBuild(myVarId);
    });

    this.analiseChapterTile = async function (docId, chapterId, title) {
        //define special variable for chapter title
    }

    this.analiseDocumentTile = async function (docId, title) {
        //define special variable for document title
    }


    async function defineVarsFromCode(docId, chapterId, paragraphId, commandTextSeparatedByNewLine) {
        if (commandTextSeparatedByNewLine === "" || commandTextSeparatedByNewLine === null || commandTextSeparatedByNewLine === undefined) {
            return;
        }
        let lines = varUtil.parseCommandBlock(chapterId, paragraphId, commandTextSeparatedByNewLine);
        $$.debug("variables", "============> Parsed code", ...lines);
        //console.debug(">>>>>Defining variables from code:", lines);
        for (let i = 0; i < lines.length; i++) {
            let parsedCommand = await varUtil.parseCommand(chapterId, paragraphId, lines[i], i);
            if(!parsedCommand){
                $$.debug("variables", `============> Skipping line ${i} in code block, because it is not a valid command`);
                continue;
            }
            await self.defineVariable(varUtil.makeNameForSpecialVars(chapterId, paragraphId, parsedCommand.outputVars[0]), docId, chapterId, paragraphId, parsedCommand);
            $$.debug("variables",  `============> Defining variable" ${parsedCommand.outputVars[0]} with command ${JSON.stringify(parsedCommand)}`);
        }
    }

    this.getDocCommandsParsed = async function (docId) {
        let commands = [];
        let document = await defaultPersistence.getDocument(docId);
        let docCommands = sopLangUtil.parseCommandsForUI(document.commands);
        commands = commands.concat(docCommands);

        for(let i = 0; i < document.chapters.length; i++){
            let chapter = await defaultPersistence.getChapter(document.chapters[i]);
            if(chapter.commands.trim() !== ""){
                let chapterCommands = sopLangUtil.parseCommandsForUI(chapter.commands, chapter.id);
                commands = commands.concat(chapterCommands);
            }

            for(let i = 0; i < chapter.paragraphs.length; i++){
                let paragraph = await defaultPersistence.getParagraph(chapter.paragraphs[i]);
                if(paragraph.text.trim() !== ""){
                    let paragraphCommands = sopLangUtil.parseCommandsForUI(paragraph.commands, chapter.id, paragraph.id);
                    commands = commands.concat(paragraphCommands);
                }
            }
        }
        let variables = await defaultPersistence.getVariablesObjectsByDocId(docId);
        for(let variable of variables){
            variable.value = await self.getVarValue(docId, variable.varName);
        }
        for(let command of commands){
            let variable = variables.find(v => v.varName === command.varName);
            if(variable){
                command.value = variable.value;
                if(variable.errorInfo){
                    command.errorInfo = variable.errorInfo;
                }
            }
        }
        return commands;
    }
    this.analiseCommandSection = async function (docId, chapterId, paragraphId, commandTextSeparatedByNewLine, oldCommands = "") {
        //TODO this doesnt work for vars that are created dynamically as a result of build/parse
        let newCommandsParsed = await varUtil.parseCommands(chapterId, paragraphId, commandTextSeparatedByNewLine);
        const newNames = new Set(newCommandsParsed.map(cmd => cmd.outputVars[0]));
        let oldCommandsParsed = await varUtil.parseCommands(chapterId, paragraphId, oldCommands);
        const removedVars = oldCommandsParsed.filter(cmd => !newNames.has(cmd.outputVars[0]));
        for( let removedVar of removedVars){
            await this.deleteVariable(docId, removedVar.outputVars[0]);
            $$.debug("variables", `============> Removed variable ${removedVar.outputVars[0]} from document ${docId}`);
        }
        await defineVarsFromCode(docId, chapterId, paragraphId, commandTextSeparatedByNewLine);
    }


    this.insertCode = async function (inDocId, code) {
        await defineVarsFromCode(inDocId, "_", "_", code);
    }

    this.runCode = async function (code, ...args) {
        if (code === "" || code === null || code === undefined) {
            return;
        }
        const CODE_EXECUTION = "CODEX";
        let inDocId = CODE_EXECUTION + "_" + await defaultPersistence.getNextNumber(CODE_EXECUTION);
        await defaultPersistence.createDocument({
            docId: inDocId,
            title: inDocId,
            chapters: [],
            category: CODE_EXECUTION,
            commands: code
        });
        let initialisation = "@arg0 := " + inDocId + "\n";
        if (Array.isArray(args)) {
            for (let i = 0; i < args.length; i++) {
                initialisation += ("@arg" + (i + 1) + " := " + args[i] + "\n");
            }
        } else {
            initialisation += ("@arg1 := " + args + "\n");
        }
        code = initialisation + code;
        await defineVarsFromCode(inDocId, "_", "_", code);
        let buildResult = await self.buildOnlyForDocument(inDocId);
        if(!buildResult){
            await $$.throwError(`Failed to build document ${inDocId} with code ${code} and errors: ${JSON.stringify($$.getBuildErrors())}`);
        }
        return inDocId;
    }

    this.runMacro = async function (docId, macroName, ...args) {
        let scriptVar = await varUtil.getVariable(varUtil.getVarID(docId,macroName));
        while(scriptVar && scriptVar.referencedVariable){
            scriptVar = await varUtil.getVariable(scriptVar.referencedVariable);
        }
        if(!scriptVar){
            await $$.throwError(`Variable '${macroName}' not found`);
        }
        let macroCode = scriptVar.parsedCommand;
        if (macroCode.command !== "macro") {
            await $$.throwError(`Variable '${macroName}' is not a macro`);
        }

        const MACRO_RUN = "MRUN";
        let inDocId = MACRO_RUN + "_" + await defaultPersistence.getNextNumber(MACRO_RUN);
        macroCode = sopLangUtil.expandMacro(docId, inDocId, scriptVar.parsedCommand, ...args);

        await defaultPersistence.createDocument({
            docId: inDocId,
            title: inDocId,
            category: MACRO_RUN,
            commands: macroCode,
            chapters: []
        });

        await defineVarsFromCode(inDocId, "_", "_", macroCode);
        await self.buildOnlyForDocument(inDocId);
        let value = await self.getVarValue(inDocId, inDocId);
        let documentsPlugin = $$.loadPlugin("Documents");
        await documentsPlugin.deleteDocument(inDocId);
        return value;
    }

    this.analiseTextSection = async function (docId, chapterId, paragraphId, text) {
        let specialTextVarName = varUtil.makeNameForSpecialVars(chapterId, paragraphId, "text");
        await self.defineVariable(specialTextVarName, docId, chapterId, paragraphId,
            {command: "assign", inputVars: [text], outputVars: [specialTextVarName], varTypes: ["text"]}, text);

        let embeddedVars = varUtil.parseTextVars(text);
        if (embeddedVars) {
            for (let i = 0; i < embeddedVars.length; i++) {
                let varName = embeddedVars[i].variable;
                let varValue = embeddedVars[i].value;
                await self.defineVariable(varName, docId, chapterId, paragraphId,
                    {command: "assign", inputVars: [varValue], outputVars: [varName], varTypes: ["text"]}, varValue);
            }
        }
    }


    this.getVarValue = async function (docId, varName) {
        let varId;
        if (varName === undefined || varName === null || varName === "" || docId.includes("/")) {
            varId = docId;
        } else {
            varId = varUtil.getVarID(docId, varName);
        }
        return await varUtil.getVarValue(varId);
    }


    this.setVarValue = async function (docId, varName, value) {
        let varId = varUtil.getVarID(docId, varName);
        return await varUtil.setVarValue(varId, value);
    }

    this.setValue = async function (varId, value) {
        return await varUtil.setVarValue(varId, value);
    }


    this.defineVariable = async function (varName, docId, chapterId, paragraphId, parsedCommand) {
        if (typeof parsedCommand === "string") {
            parsedCommand = varUtil.parseCommandLine(parsedCommand);
        }

        if (!paragraphId) {
            paragraphId = "_";
        }
        if (!chapterId) {
            chapterId = "_";
        }

        if (!docId) {
            await $$.throwError("Document ID is mandatory");
        }

        if (!varName) {
            await $$.throwError("Variable name is mandatory");
        }

        //console.debug(">>>>>Defining variable", varName, "in", docId, "with output", parsedCommand.outputVars[0], "and input vars", parsedCommand.inputVars , "and var types", parsedCommand.varTypes);
        let changed = await varUtil.updateVarDefinition(varName, docId, chapterId, paragraphId, parsedCommand);
        if(changed) {
            let varId = varUtil.getVarID(docId, varName);
            graph[varId] = {
                layer: 0,
                deps: await varUtil.getDependencies(varId)
            };
            await defaultPersistence.updateGraph("GRAPH", {state: graph});
        }
        return changed;
    }
    this.deleteVariable = async function(docId, varName) {
        if (!docId) {
            await $$.throwError("Document ID is mandatory");
        }
        if (!varName) {
            await $$.throwError("Variable name is mandatory");
        }

        let varId = varUtil.getVarID(docId, varName);
        if (graph[varId]) {
            delete graph[varId];
            await defaultPersistence.updateGraph("GRAPH", {state: graph});
        }
        await varUtil.deleteVariableWrapper(varId);
    }

    this.topologicalSort = function () {
        let visited = {};

        function determineLayer(varId, node) {
            // console.debug("Determining layer of", node);
            if (visited[varId]) {
                return;
            }
            visited[varId] = true;
            if (node.layer !== 0) {
                return;
            }
            for (let i = 0; i < node.deps.length; i++) {
                let depId = node.deps[i];
                let dep = graph[depId];
                if (depId === varId) {
                    varUtil.updateErrorInfo(varId, `Circular dependency detected for variable ${depId}. Build stopped!`);
                    $$.throwErrorSync( `Circular dependency detected for variable ${depId}. Build stopped!`);
                }
                if (!dep) {
                    //call without await on purpose
                    varUtil.updateErrorInfo(varId, ` Dependency '${depId}' not found for variable '${varId}'. Stopping build...`);
                    throw new Error(`Dependency '${depId}' not found for variable '${varId}'. Stopping build...`);
                }
                else if (dep.layer === 0) {
                    determineLayer(depId, dep);
                }
            }
            node.layer = 1;
            for (let i = 0; i < node.deps.length; i++) {
                let dep = graph[node.deps[i]];
                if(!dep){
                    continue;
                }
                node.layer = Math.max(node.layer, dep.layer + 1);
            }
            // console.debug("Layer of", varName, "is", node.layer);
        }

        $$.debug("topologicalSort","Graph before topological sort", JSON.stringify(graph));
        for (let varId in graph) {
            let node = graph[varId];
            if (node.deps.length === 0) {
                node.layer = 1;
                visited[node.id] = true;
            }
        }

        for (let varId in graph) {
            $$.debug("topologicalSort",`Determining layer of ${varId} in node:`, JSON.stringify(graph[varId]));
            determineLayer(varId, graph[varId]);
        }
        $$.debug("topologicalSort","Graph after topological sort", JSON.stringify(graph));
    }


    async function resolveValue(varId) {
        let varContext = await varUtil.getVariable(varId);
        if(!varContext){
            $$.debug("commandExecution", "Variable not found", varId);
            return undefined;
        }

        if(varContext.referencedVariable){
            return  await resolveValue(varContext.referencedVariable);
        }

        if(varContext.parsedCommand.command === "chainAlias"){
            $$.debug("chainAlias", `Chain Alias evaluation command ${varContext.parsedCommand.inputVars}`);
            try{
                let obj = await self.getVarValue(varContext.parsedCommand.inputVars[2]);
                if(!obj || typeof obj !== "object"){
                    $$.debug("chainAlias", `Chain Alias evaluation failed for ${varContext.parsedCommand.inputVars[2]} as it is not an object or is undefined`);
                    return undefined;
                }
                return obj[varContext.parsedCommand.inputVars[1]];
            } catch(e){
                await varUtil.updateErrorInfo(varContext.varId, `Failed to resolve chain alias ${varContext.parsedCommand.inputVars[1]} in ${varContext.parsedCommand.inputVars[2]}`);
                console.log("Error resolving chain alias", varContext.parsedCommand.inputVars);
                return undefined;
            }
        }

        const value = await varUtil.getVarValue(varId);
        if(value && typeof value.getRuntimeValue === "function"){
            return await value.getRuntimeValue();
        }

        return value;
    }


    self.expandInlineMacro = async function (docId, targetVarId,  intendedCommand, parsedCommand, buildInstance) {
        let scriptVar = await varUtil.getVariable(varUtil.getVarID(docId, intendedCommand));
        const RETURN_VALUE_PREFIX = "EXEC";
        let returnVarName = RETURN_VALUE_PREFIX + "_" + await defaultPersistence.getNextNumber(RETURN_VALUE_PREFIX);

        if(!scriptVar){
            await varUtil.updateErrorInfo(returnVarName, `Failed to find macro  '${intendedCommand}'`);
            return undefined;
        }

        let scriptArguments = [];
        for (let i = 0; i < parsedCommand.inputVars.length; i++) {
            if(parsedCommand.varTypes[i] === "var"){
                //remove thd docId from the varName
                let varName = "$"+varUtil.getLocalVarName(docId,parsedCommand.inputVars[i]);
                scriptArguments.push(varName);
            }
            else{
                scriptArguments.push(parsedCommand.inputVars[i]);
            }
        }

        let script = sopLangUtil.expandMacro(docId, returnVarName, scriptVar.parsedCommand, ...scriptArguments);
        //console.debug(">>> Expanded macro is:", script, " For parsedCommand:", parsedCommand);
        await self.insertCode(docId, script);

        if(targetVarId){
            let macroVarID = varUtil.getVarID(docId, intendedCommand);
            await varUtil.markAsReferenceToVariable(targetVarId, varUtil.getVarID(docId,returnVarName),docId, macroVarID);
            await buildInstance.restartBuild(targetVarId);
        }

        $$.debug("macro",`Expanding inline macro '${intendedCommand}' for return variable '${returnVarName}' with input vars [${parsedCommand.inputVars}]`);
        return returnVarName;
    }
    async function isFunctionCommand(command) {
        let hasVariable = await defaultPersistence.hasVariable(command);
        if(!hasVariable){
            return false;
        }
        let macroVar = await varUtil.getVariable(command);
        let functionCommands = ["macro", "jsdef", "discussion"];
        if(functionCommands.includes(macroVar.parsedCommand.command)){
            return macroVar.parsedCommand.command;
        }
        return false;
    }
    async function runCommand(targetVar, buildInstance) {
        function isChain(command) {
            return command.includes(".");
        }


        async function macroExists(command) {
            if(isChain(command) || commandsRegistry.commandExists(command)){
                //even if it exists, will be ignored
                return false;
            }

            let marcoVarId = varUtil.getVarID(targetVar.docId, command);
            let hasVariable = await defaultPersistence.hasVariable(marcoVarId);
            if(!hasVariable){
                return false;
            }
            //check if the command is a macro
            let macroVar = await varUtil.getVariable(varUtil.getVarID(targetVar.docId, command));
            return macroVar.parsedCommand.command === "macro";
        }

        let parsedCommand = targetVar.parsedCommand;
        let inputValues = []
        let debugActivatedForCommand = false;

        let intendedCommand = parsedCommand.command;

        if(targetVar.referencedVariable){
            let isSafeToReturnTheValueOfTheAlias = true;
            //prevent reinsertion of the code for the script, the code will be anyway checked by the dependency graph
            if(targetVar.macroId){
                let macroClock = await varUtil.getVarClock(targetVar.macroId);
                $$.debug("alias", "Variable", targetVar.varId, "is the result of an macro expansion, checked macro definition and decided to be expanded again", targetVar.macroId, "with clock", macroClock, "and variable clock", targetVar.clock);
                if(macroClock && macroClock > targetVar.clock) {
                    isSafeToReturnTheValueOfTheAlias = false;
                }
            }
            if(isSafeToReturnTheValueOfTheAlias) {
                return await resolveValue(targetVar.referencedVariable);
            }
        }

        //console.debug(">>>>Running command", intendedCommand, "for variable", targetVar.varId, "with input values", parsedCommand.inputVars, isChain(intendedCommand), commandsRegistry.commandExists(intendedCommand));
        if(await macroExists(intendedCommand)){
            await self.expandInlineMacro(targetVar.docId, targetVar.varId,  intendedCommand, parsedCommand,buildInstance);
            return undefined;
        }

        for (let i = 0; i < parsedCommand.inputVars.length; i++) {
            let value = parsedCommand.inputVars[i];
            if(value === "await"){
                while(i < parsedCommand.inputVars.length){
                    if(parsedCommand.inputVars[i] === "#debug"){
                        debugActivatedForCommand = true;
                    }
                    i++;
                }
                break; // anything after wait will not be executed but still could participate in determination of dependencies
            }
            if(value === "#debug"){
                debugActivatedForCommand = true;
                continue;
            }
            if(value === "#"){
                continue;
            }
            switch (parsedCommand.varTypes[i]) {
                case "var":
                    inputValues.push(await resolveValue(value));
                    break;
                default:
                    inputValues.push(value);
            }
        }
        if (parsedCommand.command === "chainAlias") {
            return await resolveValue(targetVar.varId);
        }

        if (intendedCommand.startsWith("?") || intendedCommand.endsWith("?")) {
            if (intendedCommand.startsWith("?")) {
                intendedCommand = intendedCommand.substring(1);
            } else {
                intendedCommand = intendedCommand.slice(0, -1);
            }
            for (let i = 0; i < inputValues.length; i++) {
                if (inputValues[i] === null || inputValues[i] === "" || inputValues[i] === undefined) {
                    return undefined;
                }
            }
        }

        let result = await commandsRegistry.runCommand(
            intendedCommand,
            inputValues,
            parsedCommand,
            targetVar.docId,
            buildInstance
        );

        if(debugActivatedForCommand){
            $$.debug("varDebug", `Command ${intendedCommand} executed with input values "${JSON.stringify(inputValues)}" and result: "${result}"`);
            await varUtil.updateDebugInfo(targetVar.varId, `#DEBUG '${targetVar.varId}' is '${result}' #### Command ${parsedCommand.command}[${inputValues}]`);
        }
        return result;
    }

    async function computeValue(varId, buildInstance) {
        let deps = await varUtil.getDependencies(varId);
        let varClock = await varUtil.getVarClock(varId);

        let mustRecompute = false;

        if (varClock === undefined) {
            mustRecompute = true;
        } else {
            for (let i = 0; i < deps.length; i++) {
                let depsClock = await varUtil.getVarClock(deps[i]);
                if (depsClock !== undefined) {
                    if (varClock < depsClock) {
                        mustRecompute = true;
                        break;
                    }
                }
            }
        }
        $$.debug("commandExecution", `Checking if variable ${varId} must be recomputed. Current clock is ${varClock} and dependencies are ${deps}. Must recompute: ${mustRecompute}`);

        let variable = await varUtil.getVariable(varId);
        if(variable.referencedVariable){
            if(variable.macroId){
                let macroVar = await varUtil.getVariable(variable.macroId);
                let variableClock = await varUtil.getVarClock(varId);
                $$.debug("macro", `Checking variable ${varId} alias as the macro clock is ${macroVar.clock} and variable clock is ${variableClock}`);
                if(macroVar.clock > variableClock){
                    mustRecompute = true;
                    $$.debug("alias", `Decided to remove the alias for ${varId} as the macro clock is ${macroVar.clock} and variable clock is ${variable.clock}`);
                    await varUtil.resetAlias(varId);
                    await buildInstance.restartBuild(varId);
                    return;
                    //variable.referencedVariable = undefined;
                }
            }
        }
        if(variable.parsedCommand.command === "import"){
            mustRecompute = true;
        }
        if (mustRecompute) {
            if(variable.referencedVariable){
                //prevent reinsertion of the code for the script, the code will be anyway checked by the dependency graph
                return await resolveValue(variable.referencedVariable);
            }
            const start = Date.now();
            let value = await runCommand(variable, buildInstance);
            const end = Date.now();
            let duration = end - start;
            if(duration === 0){
                duration = 1;
            }
            if(buildInstance.gotRestarted()){
                // nothing to save, the build will be restarted anyway
                return ;
            }
            variable = await varUtil.getVariable(varId);
            if(variable.referencedVariable){
                return value;
            }

            await varUtil.setVarValue(varId, value, {duration});
            return value;
        }
    }

    function BuildInstance(forDocId){
        let buildJustStartedOrRestartedDuringExecution = true;
        let restarts = 0;
        let currentLayer = 0;
        let currentPositionInLayer = 0;

        let messages = {};

        this.setErrorInfo = async function (varId, errorMessage) {
            messages[varId] =  errorMessage;
        }

        this.restartBuild = async function (varId) {
            if(varId !== undefined){
                graph[varId].layer = 0;
                graph[varId].deps = await varUtil.getDependencies(varId);
                //we also have to reset the layer to 0 for all the variables that depend on this variable
                for (let varName in graph) {
                    if (graph[varName].deps.includes(varId)) {
                        graph[varName].layer = 0;
                    }
                }
                await defaultPersistence.updateGraph("GRAPH", {state: graph});
            }
            buildJustStartedOrRestartedDuringExecution = true;
            restarts++;
        }

        function getLayers() {
            let layersDict = {};
            for (let varName in graph) {
                let node = graph[varName];
                if (!layersDict[node.layer]) {
                    layersDict[node.layer] = [];
                }
                let varDocId = varUtil.getDocIdFromVarId(varName);
                if(forDocId && varDocId !== forDocId){
                    continue;
                }
                layersDict[node.layer].push(varName);
            }

            let layers = [];
            for (let key in layersDict) {
                layers.push([]);
            }
            for (let key in layersDict) {
                layers[key] = layersDict[key];
            }
            //  console.debug("Layers", layers);
            return layers;
        }

        this.getLayersForExternalUse = getLayers;

         let layers;
         async function getNextVarIdToCompute() {

            if(buildJustStartedOrRestartedDuringExecution){
                buildJustStartedOrRestartedDuringExecution = false;
                self.topologicalSort();
                currentLayer = 0;
                currentPositionInLayer = 0;
                layers = getLayers();
                if(layers.length === 0){
                    return undefined;
                }
            }

            do {
                if(currentPositionInLayer >= layers[currentLayer].length){
                    currentLayer++;
                    currentPositionInLayer = 0;
                }
                if(currentLayer >= layers.length){
                    return undefined;
                }
                //console.debug("!!!!! Building variable in layer", currentLayer, "position", currentPositionInLayer, "with varId", layers[currentLayer][currentPositionInLayer]);
                let varId = layers[currentLayer][currentPositionInLayer];
                currentPositionInLayer++;
                if(varId !== undefined){   //maybe the layer
                    return varId;
                }
            } while(true)
        }

         this.gotRestarted = function () {
             return buildJustStartedOrRestartedDuringExecution;
         }

        this.run = async function () {
            let nextVarId = undefined;
            while(nextVarId = await getNextVarIdToCompute()){
                if(restarts > 100){
                    console.warn("Too many restarts of the build. Stopping the build");
                    $$.recordBuildError("Too many restarts of the build. Stopping the build");
                    return false;
                }
                let varDocId = varUtil.getDocIdFromVarId(nextVarId);
                if(forDocId && varDocId !== forDocId){
                    continue;
                }
                try{
                    let varValue = await computeValue(nextVarId, this);
                } catch(error){
                    console.error("Error during build", error);
                    $$.recordBuildError("Error during build", error);
                    return false;
                }
            }
            return true;
        }
    }

    self.runCustomCommand = async function (docId, command, ...args) {
        try{
            if(commandsRegistry.commandExists(command)){
                return await commandsRegistry.runJSDefCommand(command, ...args);
            }
            return await self.runMacro(docId, command, ...args);
        } catch(e){
            console.error(`Error running custom command ${command}`, e);
            $$.recordBuildError(`Error running custom command ${command}`, e);
        }
        return undefined;
    }

    self.buildAll = async function (onlyForDocId) {
        let buildInstance = new BuildInstance(onlyForDocId);
        let result = await buildInstance.run();
        if(!result){
            console.log("Build stopped with error");
        }
        // await self.printGraph();
        return result;
    }

    self.buildOnlyForDocument = async function (docID) {
        return await self.buildAll(docID);
    }

    function generateCSV(header, values) {
        let csv = header.join(',');
        values.forEach(row => {
            csv += '|';
            header.forEach((key, index) => {
                csv += row[key];
                if (index < header.length - 1) {
                    csv += ',';
                }
            });
        });
        return csv;
    }

    self.varsDump = async function () {
        let allVars = [];
        let variables = await defaultPersistence.getEveryVariable();
        for (let i = 0; i < variables.length; i++) {
            let varId = variables[i];
            let varInfo = await self.varDump(varId);
            if(varInfo){
                allVars.push({
                    varId : varId,
                    value:  varInfo.printValue,
                    info: varInfo.info
                });
            }
        }

        let dump = "\n";
        for(let v in allVars){
            dump += `\tVariable '${allVars[v].varId}':\n \t\tValue:${$$.SOPStringify(allVars[v].value)}\n \t\t${allVars[v].info}\n`;
        }
        return dump;
        // return dump.replace(/},/g, '},\n\t');
    }

    self.getCommands = async function () {
        let variables = await defaultPersistence.getEveryVariableObject();
        let commands = commandsRegistry.getCommands();
        for(let variable of variables){
            let command = variable.parsedCommand.command;
            if(command === "jsdef" || command === "macro"){
                let newCommand = variable.parsedCommand.outputVars[0];
                if(!commands.includes(newCommand)){
                    commands.push(newCommand);
                }
            }
        }
        return commands;
    }


    self.printGraph = async function () {
        let buildInstance = new BuildInstance();
        let layers = buildInstance.getLayersForExternalUse();
        console.log("--------------------- --- GRAPH PRINT ---------------------");
        for (let i = 0; i < layers.length; i++) {
            console.log("\tLevel '" + i + "':", layers[i].join(", "));
        }
        console.log("\t---------------- VARIABLES ---------------------");
        console.log("\t", await self.varsDump());
        console.log("--------------------- END GRAPH PRINT ---------------------");
    }
    self.varDump = async function(varId){
        let varInfo = await varUtil.getVariable(varId);
        if (!varInfo) {
            console.warn("Failed to retrieve variable '" + varId + "'during dump");
            return;
        }
        if (varInfo.parsedCommand.command === "def") {
            return;
        }

        let deps = await varUtil.getDependencies(varId);
        deps = !deps ? "" : deps.join(",");

        let info = `Clock: ${varInfo.clock}, Command: '${varInfo.parsedCommand.command}', Definition: '${varInfo.parsedCommand.inputVars.join(" ")}', Dependencies: [${deps}]`;

        if(varInfo.referencedVariable){
            info += `, Referenced variable: ${varInfo.referencedVariable}`;
        }
        let printValue = "undefined";
        if(varInfo.referencedVariable){
            printValue = "alias to " + varInfo.referencedVariable;
        } else {
            printValue = await varUtil.getVarValue(varId)
        }
        return {printValue, info};
    }

}

const createVarsGraph = async function (commandsRegistry) {
    let graph = new VarsGraph(commandsRegistry);
    await graph.init();
    return graph;
}
export {
    createVarsGraph
}