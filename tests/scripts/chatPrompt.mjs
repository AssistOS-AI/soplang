import {parseCommandLine,compareObjects} from "../../src/util/soplangUtil.js";
import {createVarsGraph} from "../../src/graph/VarsGraph.js";
import {createRegistry} from "../../src/graph/CommandsRegistry.js";

let allOk = true;

let graph = createVarsGraph(createRegistry());

let script = `        
    @question is $arg1
    @personality lookupByName personality $arg2    
    @systemPrompt extract $personality chat.prompt
    @description extract $personality description
    @name extract $personality name
    @context alias $arg3 $arg4
    @prompt set "You are " $name $description $systemPrompt "Discussion Context is" $context "Focus on this aspect:" $question
    @result ask $personality $prompt
    append $result to $arg3 $arg5
    @yesno ask $personality "Answer with yes or not. Is result usefully to keep in history:" $result
    @storeResult if [equal? $yesno 'yes'] then [append $result in $arg3 $arg6];    
`;

graph.defineVariable("v1", "doc1","ch1", "p1",parseCommandLine("set @v1 Hello"));

graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

//console.log("Graph dump:", graph.dump());

await graph.runScript(script, "doc1", "v1");
allOk &&= graph.getVariable("doc1","v1") === "Hello World!";

await graph.runScript(script, "doc1", "v1" );
allOk &&= graph.getVariable("doc1","v1") === "Better World!";


console.log("All tests passed:", allOk? "true" : "false");