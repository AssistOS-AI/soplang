import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = await $$.loadPlugin("Workspace");
let graph = workspace.getGraph();
let allOk = true;

import Table from "../../../src/predefined/Table.js";

let testScript = `
    @t1 new Table "c1" "c2" "c3" "c4" "c5"
    t1.append "c1:'a', c2:1, c3:10, c4:0, c5:1"
    t1.append "c1:'b', c2:100, c3:1000, c4:0, c5:1"
    t1.append "c1:'c', c2:10000, c3:100000, c4:0, c5:1"
    t1.append "c1:'d', c2:1000000, c3:10000000, c4:0, c5:1"
    t1.append "c1:'3', c2:'xxx', c3:'yyy', c4:0, c5:1"
    @area1 t1.area "2-3" "2-3"
    @s1 t1.sum $area1
    
    @sarea1 t1.sum $t1 "2-3" "1-3"
    @sarea1_cn t1.sum $t1 "2-3" "c2,c3,c4"
    
    @area2 t1.area "3" "2-4"
    @s2 t1.sum $area2
    
    @area3 t1.area "2-3" "4"
    @s3 t1.sum $area3
        
    @col_c2 t1.column "c2"
    @s_col_c2 t1.sum $col_c2
`;

// # Testing append method
// @new_row t1.append "c1:'z', c2:5000, c3:50000, c4:0, c5:1"
// @after_append t1.getData
//
// @min_c2 t1.min "" "c2"
// @max_c3 t1.max "" "c3"
// @avg_c2 t1.avg "" "c2"
//
// @set_val t1.setAt "0" "c2" "999"
// @c2_after_set t1.column "c2"

await workspace.defineCustomType("Table", Table);

let docId = await workspace.runScript(testScript);

await workspace.buildAll();
await graph.printGraph();

await $$.check(docId, "s1", 10100000);
await $$.check(docId, "s2", 10000001);
await $$.check(docId, "s3", 2);
await $$.check(docId, "sarea1_cn", 11110000);
await $$.check(docId, "sarea1", 11110000);

await workspace.shutDown();
console.log("All tests passed:", $$.allOk ? "true" : "false");