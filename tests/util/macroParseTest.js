import {} from "../deps/clean.mjs";
let block = `
      @testEntry macro item        
        @c1 := $item.c1                 
        @res if [ assert $c1 == "a" ] then true else false
        return $res 
    end
          
    @testEntry2 testEntry 'sop:object:{a:"b", c:1}' 
    `;

let util = await import("../../src/util/soplangUtil.js")
let parsedBlock = util.parseCommandBlock(undefined, undefined, block);
console.log(parsedBlock)
$$.checkValue(parsedBlock, [
        '@testEntry macro "item" "@c1 := $item_c1%0A@res if %5B assert $c1 == %22a%22 %5D then true else false%0Areturn $res"',
        `@testEntry2 macro 'sop:object:{a:"b", c:1}'`
    ]
);

await $$.exit();