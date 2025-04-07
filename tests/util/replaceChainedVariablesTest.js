let util = await import("../../src/util/soplangUtil.js")
const line = `@a.b.c := $d.e.f d.e $d.e.f`
let res = util.replaceDotVariables(line);
console.debug(res);
