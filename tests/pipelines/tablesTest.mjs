import {parseCommandLine} from "../../src/util/soplangUtil.js";
import {createVarsGraph} from "../../src/graph/VarsGraph.js";
import {createRegistry} from "../../src/graph/CommandsRegistry.js";

import assert from "assert";

let graph = createVarsGraph(createRegistry());

await graph.defineVariable("t1", "doc1","c1", "p1", parseCommandLine("@t1 : table c1 c2 c3 c4 c5"));

await graph.setNewValue("doc1", "t1",
    [{c1:'a', c2:1, c3:10, c4:0, c5:1},
          {c1:'b', c2:100, c3:1000, c4:0, c5:1},
          {c1:'c', c2:10000, c3:100000, c4:0, c5:1},
          {c1:'d', c2:1000000, c3:10000000, c4:0, c5:1},
          {c1:'3', c2:"xxx", c3:"yyy", c4:"0", c5:"1"}
    ]);


graph.defineVariable("area1", "doc1","ch1", "p1",parseCommandLine("@area1= area $t1 2-3 2-3"));
graph.defineVariable("s1", "doc1","ch1", "p1",parseCommandLine("@s1 : sum $area1"));
graph.defineVariable("sarea1", "doc1","ch1", "p1",parseCommandLine("@sarea1 :sum $t1 2-3 1-3"));
graph.defineVariable("sarea1_cn", "doc1","ch1", "p1",parseCommandLine("@sarea1_cn =  sum $t1 2-3 c2,c3,c4"));


graph.defineVariable("area2", "doc1","ch1", "p1",parseCommandLine("@area2 area $t1 3 2-4"));
graph.defineVariable("s2", "doc1","ch1", "p1",parseCommandLine("@s2 sum $area2"));

graph.defineVariable("area3", "doc1","ch1", "p1",parseCommandLine("@area3 area $t1 2-3 4"));
graph.defineVariable("s3", "doc1","ch1", "p1",parseCommandLine("@s3 sum $area3"));


graph.defineVariable("sc2", "doc1","ch1", "p1",parseCommandLine("@sc2 sum $t1 '' c2"));

graph.defineVariable("col_c2", "doc1","ch1", "p1",parseCommandLine("@col_c2 column $t1 c2"));
graph.defineVariable("s_col_c2", "doc1","ch1", "p1",parseCommandLine("@s_col_c2 sum $col_c2"));


graph.topologicalSort();
graph.printGraph();

await graph.buildAll();

console.log("Graph dump:", graph.dump());


assert(graph.getVariable("doc1","s1") === 10100000);

assert(graph.getVariable("doc1","s2") === 10000001);

assert(graph.getVariable("doc1","s3") === 2);

assert(graph.getVariable("doc1","sarea1_cn") === 11110000);

assert(graph.getVariable("doc1","sarea1") === 11110000);


console.log("All tests executed!");