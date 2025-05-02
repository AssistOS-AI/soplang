import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let testCode = `
    @t1 new Table "c1" "c2" "c3"     
    @t1_newData new Table "c1" "c2" "c3"       
    @t1_insights new Table "c1" "c2" "c3" "c4: math c2 * c3"
        
    @addRow macro row ~t1 ~t1_newData 
        t1.append $row
        t1_newData.append $row   
        return $t1   
    end
    
    @testEntry macro item        
        @c1 := $item.c1                 
        @res if [ assert $c1 == "a" ] then true else false
        return $res 
    end
    
    @filterT1 macro ~t1_newData ~t1_insights ~testEntry      
        @t1nd t1_newData.exwipe testEntry   #debug
        t1_insights.upsert $t1nd
        return $t1_insights         
    end        
`;

await workspace.insertCode("doc1", testCode);
await workspace.buildAll();
await workspace.runMacro("doc1", "addRow", {c1:'x', c2:2, c3:5});
await workspace.runMacro("doc1", "addRow", {c1:'a', c2:3, c3:5});

await workspace.runMacro("doc1", "addRow", {c1:'a', c2:3, c3:3});
await workspace.runMacro("doc1", "addRow", {c1:'y', c2:1, c3:3});

let value = await workspace.runMacro("doc1", "filterT1" );
//await graph.printGraph();
//console.log("t1 var is ", await workspace.getVarValue("doc1", "t1"));
//console.log("t1_newData var is ", await workspace.getVarValue("doc1", "t1_newData"));
//console.log("t1_insights var is ", await workspace.getVarValue("doc1", "t1_insights"));
console.debug("t1 var is ", $$.dumpObject(value));
await $$.checkValue(value.data.length, 2);
//await $$.checkValue(value.data, [{c1:'a', c2:3, c3:5, c4:15}, {c1:'a', c2:3, c3:3, c4:9}]);

await $$.exit();