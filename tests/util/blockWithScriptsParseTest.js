let block = `
     @world := World     
    
    @runTest script hello world       
        @res := $hello $world               
        return $res       
    end  
    
    @result runTest Hello $world
    `;

let util = await import("../../src/util/soplangUtil.js")
let parsedBlock = util.parseCommandBlock(undefined, undefined, block);
console.log(parsedBlock)