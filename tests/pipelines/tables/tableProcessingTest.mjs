import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let testCode = `
    @t1 new Table "c1" "c2" "c3"     
    @t1_newData new Table "c1" "c2" "c3"       
    @t1_insights new Table "c1" "c2" "c3" "c4: math c2 * c3"
        
    @addRow macro row ~t1 ~t1_newData 
        t1.upsert $row
        t1_newData.upsert $row   
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

let valueT1 = await workspace.getVarValue("doc1", "t1")
let valueT1_newData = await workspace.getVarValue("doc1", "t1_newData")
let valueT1_insights = await workspace.getVarValue("doc1", "t1_insights")
let valueFilterT1 = await workspace.runMacro("doc1", "filterT1" );

await $$.checkValue(valueT1.data.length, 4);
await $$.checkValue(valueT1_newData.data.length, 0);
await $$.checkValue(valueT1_insights.data.length, 2);

for(let i = 0; i < valueT1_insights.data.length; i++){
    console.debug("Row", i, "in valueT1_insights is:", JSON.stringify(valueT1_insights.data[i]));
}

await $$.checkValue((valueT1_insights.data[0]).c3, 5);
await $$.checkValue((valueT1_insights.data[0]).c4, 15);


await $$.exit();