import {} from "../../deps/clean.mjs";
import assert from "assert";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let testCode = `
    @var0 := 
    @var1 := $var0
    @var2 := $var1      
    @firstOverwrite overwrite ~var1 "SHOULD NOT WORK" await $var2
    overwrite ~var0 "v1" await $var2 await $firstOverwrite
    
    @a := A
    @b alias "doc1" a
    overwrite b "B" 
    
    @x := "vx0"
    @y alias "doc1" x
    overwrite ~x "vx1" await $y        
    `

await workspace.insertCode("doc1", testCode);
await workspace.buildAll();

await $$.check("doc1", "var0", "v1", "After first build");
await $$.check("doc1", "var1", "v1", "After first build");
await $$.check("doc1", "var2", "v1", "After first build");

await $$.check("doc1", "a", "B" , "After first build");
await $$.check("doc1", "b", "B", "After first build");

await $$.check("doc1", "x", "vx1", "After first build");
await $$.check("doc1", "y", "vx1", "After first build");

await graph.setVarValue("doc1", "a", "C");
await graph.printGraph();

await workspace.buildAll();

await $$.check("doc1", "var0", "v1" , "After second build");
await $$.check("doc1", "var1", "v1", "After second build");
await $$.check("doc1", "var2", "v1", "After second build");

await $$.check("doc1", "a", "C", "After second build");
await $$.check("doc1", "b", "C", "After second build");

await $$.check("doc1", "x", "vx1", "After second build");
await $$.check("doc1", "y", "vx1", "After second build");

await graph.printGraph();

await $$.endTest();

