let util = await import("../../src/util/soplangUtil.js")

let textSection = " first ignored comment 1 %var1 World % comment2 %var_2 New World %  some ignored comment 2" + "\n" +
    "ignored comment 3 %_var_3 World % comment2 %var-4%%var-5 New World  value continues with new line and" + "\n" +
     "  other texts are possible%  ignored comment 4" + "\n" +
    "ignored comment 5 % var_6 World % comment2 %   var7 New Brave World %" + "\n";

let vars = util.parseTextVars(textSection);
console.assert(vars.length === 7, `Expected 7 variables. Got ${vars.length}`)
console.log(vars);


