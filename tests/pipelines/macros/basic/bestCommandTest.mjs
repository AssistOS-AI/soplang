import {} from "../../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let script = `            
    @world := World        
    
    @counter jsdef
    if(global.counter === undefined){
        global.counter = 0;
       }
     global.counter++;
     return global.counter;
    end
    
    @generate macro hello  ~world        
        @orderNumber counter        
        @res := $hello $world $orderNumber                        
        return $res       
    end  
    
    @verify jsdef value
       if (value === "Hello World 5") {
            return 10;
       }       
       return 1;
    end 
    
    @result best 7 verify generate Hello
`;


await workspace.insertCode("doc1", script);
await graph.buildAll();

await $$.checkDocVar("doc1","result", "Hello World 5");
await $$.endTest();