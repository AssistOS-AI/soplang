let LocalSafeTimestamp = require("./soplangUtil").LocalSafeTimestamp;

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


    if(_parsedCommand.command === "alias" ){
        console.debug(">>>Alias ",
                _parsedCommand.outputVars[0], " as ",  _parsedCommand.inputVars[0],
                "Input Types", _parsedCommand.varTypes[0],
            "Initial value ", _value);
    }

    this.id = getVarID(_docID , _varName);

    this.getValue = function(){
        if(_parsedCommand.command === "special"){
            let newValue = _parsedCommand.get();
            if(newValue !== _value){
                this.safeTimestamp = new LocalSafeTimestamp();
                _value = newValue;
                console.debug("Special command", _parsedCommand.command, "changed value to", _value);
            }
        }
        return _value;
    }

    this.setNewValue = function(newValue){
        if(_parsedCommand.command === "special"){
            return _parsedCommand.set(newValue);
        }
        _value = newValue;
        this.safeTimestamp = new LocalSafeTimestamp();
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
                if(this.parsedCommand.varTypes[i] == "alias"){
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

function VarsGraph(commandsRegistry) {
      let variables = {};
      let variablesIndex = {};
      let graph = {};
      let self = this;

      if(!commandsRegistry){
          $$.throwError("Commands Registry is mandatory");
      }

    this.addVariable = function(varName, docID, chapterId, paragraphId, parsedCommand, value, safeTimestamp){
        if(!paragraphId){
            paragraphId = "";
        }
        if(!chapterId){
            chapterId = "";
        }
        if(!docID){
            $$.throwError("Document ID is mandatory");
        }

        if(!varName){
            $$.throwError("Variable name is mandatory");
        }
        if(!variables[docID]){
             variables[docID] = {};
         }
        if(variables[docID][varName]){
            $$.throwError("Variable already exists", name, "in document", docID);
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
            $$.throwError("Variable already exists", myVar.name + " in document " + myVar.docID, " in SOP Lang, a variable name must be defined only once in each document");
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
                    $$.throwError("Circular dependency detected for variable", depName);
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
              return resolveValue(varContext.getValue());
          }
          return varContext.getValue();
      }

      async function runCommand(parsedCommand) {
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
         return await commandsRegistry.runCommand(parsedCommand.command, inputValues, parsedCommand.outputVars);
      }

    this.printGraph = function(){
        let layers = self.getLayers();
        console.log("Graph --------------------------");
        for(let i = 0; i < layers.length; i++){
            console.log("\tLayer", i, ":", layers[i]);
        }
        console.log("--------------------------------");
    }
    function lookUpVariable(varName){
        return variablesIndex[varName];
    }
    async function computeValue(varName){
        let varContext = lookUpVariable(varName);
        let deps = varContext.getDependencies();
        let myTimestamp = varContext.safeTimestamp;

        let mustRecompute = false;

        if(myTimestamp === undefined){
            mustRecompute = true;
        } else {
            for(let i = 0; i < deps.length; i++){
                let depName = deps[i];
                let depContext = variables[depName];
                if(depContext){
                    if(LocalSafeTimestamp.isOlder(myTimestamp, depContext.safeTimestamp)){
                        mustRecompute = true;
                        break;
                    }
                } else {
                    $$.throwError("Dependency not found", depName);
                }
            }
        }

        let value = varContext.getValue();
        if(mustRecompute){
            if(varContext.parsedCommand.command === "special"){
                value = varContext.getValue();
            } else {
                value = await runCommand(varContext.parsedCommand);
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

    this.dump = function(){
        let result = {};
        for(let doc in variables) {
            result[doc] = {};
            for (let varName in variables[doc]) {
                let varContext = variables[doc][varName];
                result[doc][varName] = {
                    command: varContext.parsedCommand.command,
                    value: varContext.getValue(),
                    safeTimestamp: varContext.safeTimestamp.toString(),
                    deps: varContext.getDependencies().join(",")
                };
            }
        }
        return result;
    }

    this.getVariable = function(docID, varName){
        let varContext = variables[docID][varName];
        return varContext.getValue();
    }

}

module.exports = {
    VarContext,
    createVarsGraph: function (commandsRegistry) {
            return new VarsGraph(commandsRegistry);
    }
}