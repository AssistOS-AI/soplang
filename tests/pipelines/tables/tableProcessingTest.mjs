import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let testCode = `
    @t1 new Table "c1" "c2" 
    
    @t1_newData new Table "c1" "c2"
    
    @t1_insights new Table "c1" "c2"
        
    @addRow macro row ~t1 ~t1_newData 
        t1.append $row
        t1_newData.append $row
        #if [ assert $row.c1 == 'a' ] then [ t2.append $row ]
    end
    
    @filterEntry macro item                
        @res if [ assert item.c1 == 'a' ] then true else false
        return $res
    end
    
    @filterT1 macro ~t1_newData ~t1_insights
        @t1nd t1_newData.filter filterEntry
        t1_insights.append $t1nd
        t1_newData.clear await $t1nd 
    end
        
`;
await workspace.insertCode("doc1", testCode);
await workspace.runMacro("doc1", "addRow", {c1:'x', c2:1} );
await workspace.runMacro("doc1", "addRow", {c1:'a', c2:2} );

await workspace.runMacro("doc1", "filterT1" );

await $$.checkDocVar("doc1", "t1_insights", [{c1:'a', c2:2}]);

await $$.exit();