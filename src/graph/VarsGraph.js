let {parseCommandLine,compareObjects, LocalSafeTimestamp, parseTextVars} = require("../util/soplangUtil.js");

let varUtil = require("./varUtil.js");
let defaultPersistence = $$.loadPlugin("DefaultPersistence");

function VarsGraph(commandsRegistry) {

      let graph = {};
      let self = this;

      if(!commandsRegistry){
          $$.throwErrorSync("Commands Registry is mandatory");
      }

      function makeNameForSpecialVars(chapterId, paragraphId, varName){
          switch(varName){
                case "docId":
                case "text":
                case "title":
                    return [chapterId, paragraphId,varName].join("_");
          }
          return varName;
      }

      this.updateCommandSection = function(docId, chapterId, paragraphId, commandTextSeparatedByNewLine){
          let lines = commandTextSeparatedByNewLine.split("\n");
            for(let i = 0; i < lines.length; i++){
                let line = lines[i];
                let parsedCommand = parseCommandLine(line);
                 self.defineVariable(makeNameForSpecialVars(parsedCommand.command), docId, chapterId, paragraphId, parsedCommand);
            }
      }

      this.updateTextSection = function(docId, chapterId, paragraphId, text){
            let specialTextVarName = makeNameForSpecialVars(chapterId, paragraphId, "text");
            self.defineVariable(specialTextVarName, docId, chapterId, paragraphId,
                    {command: "assign", inputVars: [text], outputVars: [specialTextVarName]}, text);

            let embeddedVars = parseTextVars(text);
            if(embeddedVars){
                for(let i = 0; i < embeddedVars.length; i++){
                    let varName = embeddedVars[i].variable;
                    let varValue = embeddedVars[i].value;
                    self.defineVariable(varName, docId, chapterId, paragraphId,
                        {command: "assign", inputVars: [varValue], outputVars: [varName] , varTypes:["text"]}, varValue);
                }
            }
      }


    this.getVarValue = async function(docId, varName){
          let varId = varUtil.getVarID(docId, varName);
          return await varUtil.getVarValue(varId);
    }

    this.setNewValue = async function(docId, varName, value){
        let varId = varUtil.getVarID(docId, varName);
        return await varUtil.setNewValue(varId, value);
    }


    this.defineVariable = async function(varName, docId, chapterId, paragraphId, parsedCommand){
          if(typeof parsedCommand === "string"){
                parsedCommand = parseCommandLine(parsedCommand);
      }

        if(!paragraphId){
            paragraphId = "";
        }
        if(!chapterId){
            chapterId = "";
        }
        if(!docId){
            await $$.throwError("Document ID is mandatory");
        }

        if(!varName){
            await $$.throwError("Variable name is mandatory");
        }

        if(parsedCommand.command === "alias"){
            await $$.thowError("Alias command is not supported yet");
            let docId = parsedCommand.inputVars[0];
            let varId = parsedCommand.inputVars[1];
            /*
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
            } */
            parsedCommand.inputVars = [initialVariable.id];
            parsedCommand.varTypes = ["alias"];
         }

        if(await varUtil.updateVarDefinition(varName, docId, chapterId, paragraphId, parsedCommand)) {
            let varId = varUtil.getVarID(docId, varName);
            graph[varId] = {
                layer : 0,
                deps: await varUtil.getDependencies(varId)
                };
            await defaultPersistence.updateGraph("GRAPH", {state:graph});
        }
    }

    this.topologicalSort =  function(){
        let visited = {};
         function determineLayer(varName, node){
           // console.debug("Determining layer of", node);
            if(visited[varName]){
                return;
            }
            visited[varName] = true;
            if(node.layer !== 0){
                return;
            }
            for(let i = 0; i < node.deps.length; i++){
                let depName = node.deps[i];
                let dep = graph[depName];
                if(depName === varName){
                    $$.throwErrorSync("Circular dependency detected for variable", depName);
                }
                if(dep.layer === 0){
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
                    node.layer = 1;
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
      async function resolveValue(varId){
          let varContext = await varUtil.getVariable(varId);
          if(varContext.parsedCommand.command === "alias"){
              $$.throwErrorSync("Alias command is not supported yet");
              return resolveValue(varContext.getVarValue());
          }
          return await varUtil.getVarValue(varId);
      }

      async function runCommand(targetVar) {
          let parsedCommand = targetVar.parsedCommand;
          let inputValues = []
          for(let i = 0; i < parsedCommand.inputVars.length; i++){
              let value = parsedCommand.inputVars[i];
              switch(parsedCommand.varTypes[i]){
                  case "var":
                      inputValues.push( await resolveValue(value));
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



    async function computeValue(varId){
        let deps = await varUtil.getDependencies(varId);
        let varClock = await varUtil.getVarClock(varId);

        let mustRecompute = false;

        if(varClock === undefined){
            mustRecompute = true;
        } else {
            for(let i = 0; i < deps.length; i++){
                let depsClock = await varUtil.getVarClock(deps[i]);
                if(depsClock !== undefined){
                    if(varClock < depsClock){
                        mustRecompute = true;
                        break;
                    }
                }
            }
        }


        let value = await varUtil.getVarValue(varId);

        if(mustRecompute){
        /*
           if(varContext.parsedCommand.command === "special"){
                value = varContext.getVarValue();
            } else {
                value = await runCommand(varContext);
            }
         */
            let variable = await varUtil.getVariable(varId);
            let value = await runCommand(variable);
            await varUtil.setNewValue(varId, value);
        }
    }

    self.buildAll = async function(){
        let layers = self.getLayers();
        console.debug("Building all layers", layers);
        for(let i = 0; i < layers.length; i++){
            let layer = layers[i];
            //console.debug("Building layer", i, ":", layer);
            for(let j = 0; j < layer.length; j++){
                let varId = layer[j];
                //console.debug("Computing value for", varId);
                 await computeValue(varId);
            }
        }
    }

    self.varsDump = async function(){
        let result = {variables:"\n"};
        let variables = await defaultPersistence.getEveryVariable();
        for(let i =0 ; i < variables.length; i++){
            let varId = variables[i];
            let varInfo = await varUtil.getVariable(varId);
            if(!varInfo){
                console.warn("Failed to retrieve variable '" + varId + "'during dump");
                continue;
            }
            if(!result[varInfo.docId]){
                result[varInfo.docId] = {};
            }

            result.variables +="\t'" +varId+ "' is '" + varInfo.value + "'\n";
            result[varInfo.docId][varId] = {
                id: varInfo.id,
                varId: varInfo.varId,
                command: varInfo.parsedCommand.command,
                inputVars: varInfo.parsedCommand.inputVars.join(" "),
                value: JSON.stringify(varInfo.value),
                clock: varInfo.clock? varInfo.clock: "Not Initialized"
            };
        }
        return result;
    }

    self.printGraph = async function(){
        let layers = self.getLayers();
        console.log("--------------------- --- GRAPH PRINT ---------------------");
        for(let i = 0; i < layers.length; i++){
            console.log("\tLevel '"+ i+ "':", layers[i].join(", "));
        }
        console.log("\t---------------- VARIABLES ---------------------");
        let dump = await self.varsDump();
        console.log(dump.variables);
        delete dump.variables;
        console.log("\t Details:",JSON.stringify(dump));
        console.log("--------------------- END GRAPH PRINT ---------------------");
    }

}

module.exports = {
    createVarsGraph: function (commandsRegistry) {
            return new VarsGraph(commandsRegistry);
    }
}