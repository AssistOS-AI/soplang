let {parseCommandLine,compareObjects, LocalSafeTimestamp, parseTextVars} = require("../util/soplangUtil.js");

function getVarID(docID, varName){
    return docID + "|" + varName;
}
function VarContext(_varName, _docID, _chapterId, _paragraphId, _parsedCommand, _value, _safeTimestamp) {
    this.varName = _varName;
    this.docID = _docID;
    this.chapterId = _chapterId;
    this.paragraphId = _paragraphId;
    this.parsedCommand = _parsedCommand;

    this.safeTimestamp = _safeTimestamp;

    if(_parsedCommand.outputVars.length > 1){
        await $$.throwError("Command", _parsedCommand.command, "has more than one output variable. This is not supported!");
    }

    if(_parsedCommand.outputVars[0] !== _varName){
        await $$.throwError("Command", _parsedCommand.command, "has output variable '"+ _parsedCommand.outputVars[0]+ "' which is different from expected name '"+ _varName + "'");
    }


    if(_parsedCommand.command === "alias" ){
        console.debug(">>>Alias ",
                _parsedCommand.outputVars[0], " as ",  _parsedCommand.inputVars[0],
                "Input Types", _parsedCommand.varTypes[0],
            "Initial value ", _value);
    }

    this.id = getVarID(_docID , _varName);

    this.getVarValue = function(){
        if(_parsedCommand.command === "special"){
            let newValue = _parsedCommand.get(_varName, _docID, _chapterId, _paragraphId);
            if(newValue !== _value){
                this.safeTimestamp = new LocalSafeTimestamp();
                _value = newValue;
                console.debug("Special command", _parsedCommand.command, "changed value to", _value);
            }
        }
        if(_parsedCommand.command === "table"){
            //console.debug("Adding the header to the actual value", _value, "for table", _parsedCommand.inputVars, "in document", _docID, "chapter", _chapterId, "paragraph", _paragraphId);
            if(_value.tableHeader !== undefined){
                await $$.throwError("Table variable has already has a header. Why?");
            }
            return { tableHeader: _parsedCommand.inputVars, tableData: _value};
        }
        return _value;
    }

    this.setNewValue = function(newValue){
        if(_parsedCommand.command === "special"){
            return _parsedCommand.set(newValue, _varName, _docID, _chapterId, _paragraphId);
        }
        if(_parsedCommand.command === "table"){
            if(newValue.tableHeader !== undefined){
                newValue = newValue.tableData;
            }
        }
        this.safeTimestamp = new LocalSafeTimestamp();
        _value = newValue;
    }

    if(this.parsedCommand){
        this.parsedCommand.inputVars = this.parsedCommand.inputVars ? Array.from(this.parsedCommand.inputVars) : [];
        for(let i = 0; i < this.parsedCommand.inputVars.length; i++){
            let inputVar = this.parsedCommand.inputVars[i];
            if(this.parsedCommand.varTypes[i] === "var"){
                this.parsedCommand.inputVars[i] = getVarID(_docID, inputVar);
            }
        }
    }

    this.getDependencies = function(){
        let deps = [];
        if(this.parsedCommand && this.parsedCommand.inputVars.length > 0){
            for(let i = 0; i < this.parsedCommand.inputVars.length; i++){
                let inputVar = this.parsedCommand.inputVars[i];
                if(this.parsedCommand.varTypes[i] === "alias"){
                    deps.push(inputVar);
                }
                if(this.parsedCommand.varTypes[i] === "var"){
                    deps.push(inputVar);
                }
            }
        }
        /*if(this.parsedCommand === "alias"){
            console.debug(">>>>>>>>>>")
            deps.push(this.parsedCommand.value);
        } */
        //console.debug("Dependencies of ", _docID + "|"+ this.varName, ":", deps);
        return deps;
    }
}

function VarsGraph(commandsRegistry, varPersistence) {
      let variables = {};
      let variablesIndex = {};
      let graph = {};
      let self = this;


    function lookUpVariable(varName){
        varPersistence.loadVariable(varName);
        return variablesIndex[varName];
    }

      if(!commandsRegistry){
          await $$.throwError("Commands Registry is mandatory");
      }

      function makeNameForSpecialVars(chapterId, paragraphId, varName){
          switch(varName){
                case "docID":
                case "text":
                case "title":
                    return [chapterId, paragraphId,varName].join("_");
          }
          return varName;
      }

      this.updateCommandSection = function(docID, chapterId, paragraphId, commandTextSeparatedByNewLine){
          let lines = commandTextSeparatedByNewLine.split("\n");
            for(let i = 0; i < lines.length; i++){
                let line = lines[i];
                let parsedCommand = parseCommandLine(line);
                 self.defineVariable(makeNameForSpecialVars(parsedCommand.command), docID, chapterId, paragraphId, parsedCommand);
            }
      }

      this.updateTextSection = function(docID, chapterId, paragraphId, text){

            let specialTextVarName = makeNameForSpecialVars(chapterId, paragraphId, "text");
            self.defineVariable(specialTextVarName, docID, chapterId, paragraphId,
                    {command: "assign", inputVars: [text], outputVars: [specialTextVarName]}, text);

            let embeddedVars = parsetextVars(text);
            if(embeddedVars){
                for(let i = 0; i < embeddedVars.length; i++){
                    let varName = embeddedVars[i].variable;
                    let varValue = embeddedVars[i].value;
                    self.defineVariable(varName, docID, chapterId, paragraphId,
                        {command: "assign", inputVars: [varValue], outputVars: [varName] , varTypes:["text"]}, varValue);
                }
            }
      }


    this.getValue = async function(docID, varName){
          if(!variables[docID]){
                console.warn("Document", docID , " not found when trying to get a value for variable", varName);
                return undefined;
          }
        let varContext = variables[docID][varName];
        if(!varContext){
            console.warn("Variable not found", varName, "in document", docID)
            return undefined;
        }
        return await varContext.getVarValue();
    }

    this.setNewValue = function(docID, varName, value){
        let varContext = variables[docID][varName];
        if(!varContext){
            console.debug("All Variables", variables, "in document", docID, "are", Object.keys(variables[docID]));
            await $$.throwError("Variable '" + varName + "' not found in document " + docID);
        }
        if(varContext.parsedCommand.command === "alias"){
            await $$.throwError("Cannot set value of alias", varName);
        }

        varContext.setNewValue(value);
    }



    this.defineVariable = function(varName, docID, chapterId, paragraphId, parsedCommand, value, safeTimestamp){
        if(!paragraphId){
            paragraphId = "";
        }
        if(!chapterId){
            chapterId = "";
        }
        if(!docID){
            await $$.throwError("Document ID is mandatory");
        }

        if(!varName){
            await $$.throwError("Variable name is mandatory");
        }
        if(!variables[docID]){
             variables[docID] = {};
         }
        if(variables[docID][varName]){
            await $$.throwError("Variable already exists", name, "in document", docID);
        }

        if(parsedCommand.command === "alias"){
            let docId = parsedCommand.inputVars[0];
            let varId = parsedCommand.inputVars[1];
            let initialVariable = variables[docId][varId];
            if(!initialVariable){
                initialVariable = new VarContext(varId,
                            docId,
                            undefined,
                 undefined,
                    undefined,
                    undefined,
                    undefined);
                variables[docId][varId] = initialVariable;
                variablesIndex[initialVariable.id] = initialVariable;
            }
            parsedCommand.inputVars = [initialVariable.id];
            parsedCommand.varTypes = ["alias"];
         }

        let myVar = variables[docID][varName] = new VarContext(varName, docID, chapterId, paragraphId, parsedCommand, value, safeTimestamp);
        variablesIndex[myVar.id] = myVar;
        if(!graph[myVar.id]) {
            graph[myVar.id] = {
                layer : -1,
                deps:myVar.getDependencies()
                };
        } else {
            await $$.throwError("Variable already exists", myVar.name + " in document " + myVar.docID, " in SOP Lang, a variable name must be defined only once in each document");
        }
    }

    this.topologicalSort = function(){
        let visited = {};
        function determineLayer(varName, node){
           // console.debug("Determining layer of", node);
            if(visited[varName]){
                return;
            }
            visited[varName] = true;
            if(node.layer !== -1){
                return;
            }
            for(let i = 0; i < node.deps.length; i++){
                let depName = node.deps[i];
                let dep = graph[depName];
                if(depName === varName){
                    await $$.throwError("Circular dependency detected for variable", depName);
                }
                if(dep.layer === -1){
                    determineLayer(depName, dep);
                }
            }
            node.layer = 1;
            for(let i = 0; i < node.deps.length; i++){
                let dep = graph[node.deps[i]];
                node.layer = Math.max(node.layer, dep.layer + 1);
            }
           // console.debug("Layer of", varName, "is", node.layer);
        }
        
        for(let varName in graph){
            let node = graph[varName];
                if(node.deps.length === 0) {
                    node.layer = 0;
                    visited[node.id] = true;
                }
            }

        for(let varName in graph){
           // console.debug("Determining layer of", varName, "in node", graph[varName]);
            determineLayer(varName, graph[varName]);
        }
       // console.debug("Graph after topological sort", graph);
    }

    this.getLayers = function(){
        let layersDict = {};
        for(let varName in graph){
            let node = graph[varName];
            if(!layersDict[node.layer]){
                layersDict[node.layer] = [];
            }
            layersDict[node.layer].push(varName);
        }

        let layers = [];
        for(let key in layersDict){
            layers.push([]);
        }
        for(let key in layersDict){
            layers[key] = layersDict[key];
        }
      //  console.debug("Layers", layers);
        return layers;
    }
      function resolveValue(varName){
          let varContext = lookUpVariable(varName);
          if(varContext.parsedCommand.command === "alias"){
              return resolveValue(varContext.getVarValue());
          }
          return varContext.getVarValue();
      }

      async function runCommand(targetVar) {
          let parsedCommand = targetVar.parsedCommand;
          let inputValues = []
          for(let i = 0; i < parsedCommand.inputVars.length; i++){
              let value = parsedCommand.inputVars[i];
              switch(parsedCommand.varTypes[i]){
                  case "var":
                      inputValues.push(resolveValue(value));
                      break;
                  default:
                      inputValues.push(value);
              }
          }
          if(parsedCommand.command === "alias"){
              return inputValues[0];
          }
         return await commandsRegistry.runCommand(
                parsedCommand.command,
                inputValues,
                parsedCommand.outputVars,
                targetVar,
                self
                );
      }

    this.printGraph = function(){
        let layers = self.getLayers();
        console.log("------------- GRAPH PRINT -------------");
        for(let i = 0; i < layers.length; i++){
            console.log("Level '"+ i+ "':", layers[i].join(", "));
        }
        console.log("----------- END GRAPH PRINT ---------------------");
    }

    async function computeValue(varName){

         function  isOlder(ts1, ts2) {
            if(ts1 === undefined){
                return false;
            }
            if(ts2 === undefined){
                return true;
            }
            if(ts1.timestamp === ts1.timestamp){
                return ts1.clock < ts1.clock;
            }
            return ts1.timestamp < ts1.timestamp;
        }

        let varContext = lookUpVariable(varName);
        let deps = varContext.getDependencies();
        let myTimestamp = varContext.safeTimestamp;

        let mustRecompute = false;

        if(myTimestamp === undefined){
            mustRecompute = true;
        } else {
            for(let i = 0; i < deps.length; i++){
                let depName = deps[i];
                let depContext = variablesIndex[depName];
                if(depContext){
                    if(isOlder(myTimestamp, depContext.safeTimestamp)){
                        mustRecompute = true;
                        break;
                    }
                } else {
                    await $$.throwError("Dependency not found", depName);
                }
            }
        }

        let value = varContext.getVarValue();
        if(mustRecompute){
            if(varContext.parsedCommand.command === "special"){
                value = varContext.getVarValue();
            } else {
                value = await runCommand(varContext);
            }
        }
        return value;
    }
        
    this.buildAll = async function(){
        let layers = self.getLayers();
        //console.debug("Building all layers", layers);
        for(let i = 0; i < layers.length; i++){
            let layer = layers[i];
            //console.debug("Building layer", i, ":", layer);
            for(let j = 0; j < layer.length; j++){
                let varName = layer[j];
                let varContext = lookUpVariable(varName);
                //console.debug("Computing value for", varName);
                let value = await computeValue(varName);
                varContext.setNewValue(value);
            }
        }
    }

    this.dump = function(dontPrintGraph = false){
        let result = {};
        for(let doc in variables) {
            result[doc] = {};
            for (let varName in variables[doc]) {
                let varContext = variables[doc][varName];
                result[doc][varName] = {
                    command: varContext.parsedCommand.command,
                    inputVars: varContext.parsedCommand.inputVars.join(" "),
                    value: JSON.stringify(varContext.getVarValue()),
                    safeTimestamp: varContext.safeTimestamp? varContext.safeTimestamp.toString(): "Not Initialized",
                    deps: varContext.getDependencies().join(",")
                };
            }
        }
        if(!dontPrintGraph){
            console.debug("Graph dump:", result);
        }
        return result;
    }
}

module.exports = {
    VarContext,
    createVarsGraph: function (commandsRegistry, varPersistence) {
            return new VarsGraph(commandsRegistry,varPersistence);
    }
}