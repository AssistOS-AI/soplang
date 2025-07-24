import {} from "../../../deps/clean.mjs";

let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let myTestCode = `        
    @testEntry macro item        
        @c1 := $item.c1                 
        @res if [ assert $c1 == "a" ] then "true" else "false"
        return $res 
    end            
`;

await workspace.insertCode("doc1", myTestCode);
await workspace.buildAll();

let value = await workspace.runMacro("doc1", "testEntry" , {c1:"a", c2:1 });
await $$.checkValue(value, "true");

value = await workspace.runMacro("doc1", "testEntry" , {c1:"b", c2:1 });
await $$.checkValue(value, "false");

await $$.exit();