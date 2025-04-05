import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();
let allOk = true;

await graph.defineVariable("t1", "doc1","c1", "p1", "@t1 table c1 c2 c3 c4 c5");

await graph.setVarValue("doc1", "t1",
    [{c1:'a', c2:1, c3:10, c4:0, c5:1},
          {c1:'b', c2:100, c3:1000, c4:0, c5:1},
          {c1:'c', c2:10000, c3:100000, c4:0, c5:1},
          {c1:'d', c2:1000000, c3:10000000, c4:0, c5:1},
          {c1:'3', c2:"xxx", c3:"yyy", c4:"0", c5:"1"}
    ]);


await graph.defineVariable("area1", "doc1","ch1", "p1","@area1 area $t1 2-3 2-3");
await graph.defineVariable("s1", "doc1","ch1", "p1","@s1 sum $area1");
await graph.defineVariable("sarea1", "doc1","ch1", "p1","@sarea1 sum $t1 2-3 1-3");
await graph.defineVariable("sarea1_cn", "doc1","ch1", "p1","@sarea1_cn sum $t1 2-3 c2,c3,c4");


await graph.defineVariable("area2", "doc1","ch1", "p1","@area2 area $t1 3 2-4");
await graph.defineVariable("s2", "doc1","ch1", "p1","@s2 sum $area2");

await graph.defineVariable("area3", "doc1","ch1", "p1","@area3 area $t1 2-3 4");
await graph.defineVariable("s3", "doc1","ch1", "p1","@s3 sum $area3");


await graph.defineVariable("sc2", "doc1","ch1", "p1","@sc2 sum $t1 '' c2");

await graph.defineVariable("col_c2", "doc1","ch1", "p1","@col_c2 column $t1 c2");
await graph.defineVariable("s_col_c2", "doc1","ch1", "p1","@s_col_c2 sum $col_c2");


graph.topologicalSort();
await graph.printGraph();

await graph.buildAll();

await graph.printGraph();

assert(await graph.getVarValue("doc1","s1") === 10100000);

assert(await graph.getVarValue("doc1","s2") === 10000001);

assert(await graph.getVarValue("doc1","s3") === 2);

assert(await graph.getVarValue("doc1","sarea1_cn") === 11110000);

assert(await graph.getVarValue("doc1","sarea1") === 11110000);


await workspace.shutDown();
console.log("All tests executed!");
assert(allOk === true, "Some tests failed");