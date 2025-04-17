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
        console.debug(">>>>>Defining variables from code:", lines);
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            line = varUtil.renameSpecialVars(chapterId, paragraphId, line);
            let parsedCommand = null;
            try {
                parsedCommand = varUtil.parseCommandLine(line);
            } catch (e) {
                console.error("Error parsing command!" + `Line ${line}  will be ignored`);
                continue;
            }

            //console.debug("!!!!!!!! Parsed command", parsedCommand);
            if (parsedCommand.outputVars.length === 0) {
                parsedCommand.outputVars = [varUtil.makeNameForSpecialVars(chapterId, paragraphId, "tmp" + i)];
            }

            await self.defineVariable(varUtil.makeNameForSpecialVars(chapterId, paragraphId, parsedCommand.outputVars[0]), docId, chapterId, paragraphId, parsedCommand);
            //console.debug("<><><><>>>>>Defining variable", parsedCommand.outputVars[0], "with command", parsedCommand);
        }
    }

    this.analiseCommandSection = async function (docId, chapterId, paragraphId, commandTextSeparatedByNewLine) {
        await defineVarsFromCode(docId, chapterId, paragraphId, commandTextSeparatedByNewLine);
    }


    this.insertCode = async function (inDocId, code) {
        await defineVarsFromCode(inDocId, "_", "_", code);
    }

    this.runScript = async function (docId, scriptName, ...args) {
        let scriptVar = await varUtil.getVariable(varUtil.getVarID(docId,scriptName));
        if(!scriptVar){
            await $$.throwError(`Script '${scriptName}' not found`);
        }
        let script = scriptVar.parsedCommand;
        if (script.command !== "script") {
            await $$.throwError(`Script '${scriptName}' is not a script`);
        }

        const SCRIPT_EXECUTION = "SRNO";
        let inDocId = SCRIPT_EXECUTION + "_" + await defaultPersistence.getNextNumber(SCRIPT_EXECUTION);
        script = sopLangUtil.expandScript(inDocId, scriptVar.parsedCommand, ...args);

        await defaultPersistence.createDocument({
            docId: inDocId,
            title: inDocId,
            category: SCRIPT_EXECUTION,
            commands: script
        });


        await defineVarsFromCode(inDocId, "_", "_", script);
        self.topologicalSort();
        await self.buildOnlyForDocument(inDocId);
        let scriptResult = await self.getVarValue(inDocId, inDocId);
        return scriptResult;
    }

    this.analiseTextSection = async function (docId, chapterId, paragraphId, text) {
        let specialTextVarName = varUtil.makeNameForSpecialVars(chapterId, paragraphId, "text");
        self.defineVariable(specialTextVarName, docId, chapterId, paragraphId,
            {command: "assign", inputVars: [text], outputVars: [specialTextVarName], varTypes: ["text"]}, text);

        let embeddedVars = varUtil.parseTextVars(text);
        if (embeddedVars) {
            for (let i = 0; i < embeddedVars.length; i++) {
                let varName = embeddedVars[i].variable;
                let varValue = embeddedVars[i].value;
                self.defineVariable(varName, docId, chapterId, paragraphId,
                    {command: "assign", inputVars: [varValue], outputVars: [varName], varTypes: ["text"]}, varValue);
            }
        }
    }


    this.getVarValue = async function (docId, varName) {
        let varId;
        if (varName === undefined || varName === null || varName === "") {
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

        if (await varUtil.updateVarDefinition(varName, docId, chapterId, paragraphId, parsedCommand)) {
            let varId = varUtil.getVarID(docId, varName);
            graph[varId] = {
                layer: 0,
                deps: await varUtil.getDependencies(varId)
            };
            await defaultPersistence.updateGraph("GRAPH", {state: graph});
        }
    }

    this.topologicalSort = function () {
        let visited = {};

        function determineLayer(varName, node) {
            // console.debug("Determining layer of", node);
            if (visited[varName]) {
                return;
            }
            visited[varName] = true;
            if (node.layer !== 0) {
                return;
            }
            for (let i = 0; i < node.deps.length; i++) {
                let depName = node.deps[i];
                let dep = graph[depName];
                if (depName === varName) {
                    $$.recordBuildError(`Circular dependency detected for variable ${depName}. Build stopped!`);
                    $$.throwErrorSync( `Circular dependency detected for variable ${depName}. Build stopped!`);
                }
                if (!dep) {
                    $$.recordBuildError(` Dependency ${depName} not found for variable ${varName}. Build stopped!`);
                    $$.throwErrorSync( `Dependency ${depName} not found for variable ${varName}. Build stopped!`);
                }
                else if (dep.layer === 0) {
                    determineLayer(depName, dep);
                }
            }
            node.layer = 1;
            for (let i = 0; i < node.deps.length; i++) {
                let dep = graph[node.deps[i]];
                node.layer = Math.max(node.layer, dep.layer + 1);
            }
            // console.debug("Layer of", varName, "is", node.layer);
        }

        for (let varName in graph) {
            let node = graph[varName];
            if (node.deps.length === 0) {
                node.layer = 1;
                visited[node.id] = true;
            }
        }

        for (let varName in graph) {
            // console.debug("Determining layer of", varName, "in node", graph[varName]);
            determineLayer(varName, graph[varName]);
        }
        // console.debug("Graph after topological sort", graph);
    }

    this.getLayers = function () {
        let layersDict = {};
        for (let varName in graph) {
            let node = graph[varName];
            if (!layersDict[node.layer]) {
                layersDict[node.layer] = [];
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

    async function resolveValue(varId) {
        let varContext = await varUtil.getVariable(varId);
        if (varContext.parsedCommand.command === 'alias') {
            return await self.getVarValue(varContext.parsedCommand.inputVars[0], varContext.parsedCommand.inputVars[1]);
        }

        if(varContext.parsedCommand.command === "chainAlias"){
            //console.debug("Chain alias", varContext.parsedCommand.inputVars);
            let obj = await self.getVarValue(varContext.parsedCommand.inputVars[2]);
            return obj[varContext.parsedCommand.inputVars[1]];
        }

        const value = await varUtil.getVarValue(varId);
        if(value && typeof value.getRuntimeValue === "function"){
            return await value.getRuntimeValue();
        }

        return value;
    }

    async function runCommand(targetVar) {
        let parsedCommand = targetVar.parsedCommand;
        let inputValues = []
        let debugActivatedForCommand = false;

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
        if (parsedCommand.command === "alias" || parsedCommand.command === "chainAlias") {
            return await resolveValue(targetVar.varId);
        }

        let intendedCommand = parsedCommand.command;
        if (intendedCommand[0] === "?") {
            intendedCommand = intendedCommand.substring(1);
            //all input values must be defined, cant pe null, empty string or undefined
            for (let i = 0; i < inputValues.length; i++) {
                if (inputValues[i] === null || inputValues[i] === "" || inputValues[i] === undefined) {
                    return undefined;
                }
            }
        }
        let result = await commandsRegistry.runCommand(
            intendedCommand,
            inputValues,
            parsedCommand.outputVars,
            targetVar.docId
        );

        if(debugActivatedForCommand){
            $$.recordBuildInfo(`#DEBUG '${targetVar.varId}' is '${result}' #### Command ${parsedCommand.command}[${inputValues}]`);

        }
        return result;
    }

    async function computeValue(varId) {
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

        // let value = await varUtil.getVarValue(varId);
        if (mustRecompute) {
            let variable = await varUtil.getVariable(varId);
            let value = await runCommand(variable);
            await varUtil.setVarValue(varId, value, true);
        }
    }

    self.buildAll = async function () {
        let layers = self.getLayers();
        console.debug("Building all layers", layers);
        for (let i = 0; i < layers.length; i++) {
            let layer = layers[i];
            //console.debug("Building layer", i, ":", layer);
            for (let j = 0; j < layer.length; j++) {
                let varId = layer[j];
                //console.debug("Computing value for", varId);
                await computeValue(varId);
            }
        }
    }

    self.buildOnlyForDocument = async function (docID) {
        let layers = self.getLayers();
        console.debug("Building all layers", layers);
        for (let i = 0; i < layers.length; i++) {
            let layer = layers[i];
            //console.debug("Building layer", i, ":", layer);
            for (let j = 0; j < layer.length; j++) {
                let varId = layer[j];
                //console.debug("Computing value for", varId);
                let varContext = await varUtil.getVariable(varId);
                if (varContext.docId !== docID) {
                    continue;
                }
                await computeValue(varId);
            }
        }
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
            let varInfo = await varUtil.getVariable(varId);
            if (!varInfo) {
                console.warn("Failed to retrieve variable '" + varId + "'during dump");
                continue;
            }
            if (varInfo.parsedCommand.command === "def") {
                continue;
            }

            let deps = await varUtil.getDependencies(varId);
            deps = !deps ? "" : deps.join(",");

            let valueAsString = varInfo.value && varInfo.value.tableHeader ? generateCSV(varInfo.value.tableHeader, varInfo.value.tableData) : varInfo.value;

            const obj = {};

            let info = `Clock: ${varInfo.clock}, Command: '${varInfo.parsedCommand.command}', Definition: '${varInfo.parsedCommand.inputVars.join(" ")}', Dependencies: [${deps}]`;

            async function dumpObjOrValue(value) {
                function dumpObjectSingleLine(obj) {
                    let res = "{";
                    for (let key in obj) {
                        if (typeof obj[key] === "function") {
                        continue;
                        }
                        res += `'${key}' : '${obj[key]}', `;
                    }
                    return res + "}";
                }


                if (typeof value === "object") {
                    let typeName = value.constructor.name;
                    let valueString = typeof value === "object" ? dumpObjectSingleLine(value) : value.toString();
                    return `Object Type: '${typeName}', Serialisation: '${valueString}'`;
                }
                if(value === undefined || value === null){
                    return "NULL";
                }
                return value.toString();
            }
            allVars.push({
                varId : varInfo.varId,
                value: await dumpObjOrValue(valueAsString),
                info: info
            });
        }

        let dump = "\n";
        for(let v in allVars){
            dump += `\tVariable '${allVars[v].varId}':\n \t\t${allVars[v].value}\n \t\tInfo: ${allVars[v].info}\n`;
        }
        return dump;
        // return dump.replace(/},/g, '},\n\t');
    }

    self.printGraph = async function () {
        let layers = self.getLayers();
        console.log("--------------------- --- GRAPH PRINT ---------------------");
        for (let i = 0; i < layers.length; i++) {
            console.log("\tLevel '" + i + "':", layers[i].join(", "));
        }
        console.log("\t---------------- VARIABLES ---------------------");
        console.log("\t", await self.varsDump());
        console.log("--------------------- END GRAPH PRINT ---------------------");
    }

}

const createVarsGraph = async function (commandsRegistry) {
    return new VarsGraph(commandsRegistry);
}
export {
    createVarsGraph
}