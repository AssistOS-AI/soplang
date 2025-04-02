let block = `
    @nob1          new NamedObject "NOB1" "Constructor Name NOB1"
    @nob1.name  := "Second Name of all NOBs"
    #initial value will be null as no object exists with id NOB2
    @nob2Alias  lookup "NOB2"   
    @name       := $nob1Alias.name 
    #new become a lookup on the re-execution of the script, added @nob2Alias dependency to force order of execution
    @nob2       new NamedObject "NOB2" @nob2Alias
    @nob2.name  := $nob1Alias.name
    #force deletion of nob1.    
    @deleteNob1 if [exists $nob1] then [ delete nob1 ] else "already deleted" 
    overwrite %nob1.name "Second Name of all NOBs"
    `;

let util =require("../../src/util/soplangUtil.js")
let parsedBlock = util.parseCommandBlock(undefined, undefined, block);
console.log(parsedBlock)