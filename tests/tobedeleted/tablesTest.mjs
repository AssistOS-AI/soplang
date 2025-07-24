import {} from "../../deps/clean.mjs";
import assert from "assert";

let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

let testCode = `
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

await $$.exit();