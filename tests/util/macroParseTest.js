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
        "@testEntry macro 'item' '%40c1 := %24item.c1%0A%40res if %5B assert %24c1 == %22a%22 %5D then true else false%0Areturn %24res'",
        `@testEntry2 testEntry 'sop:object:{a:"b", c:1}'`
    ]
);

await $$.exit();