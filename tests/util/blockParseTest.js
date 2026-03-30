import {} from "../deps/clean.mjs";
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

let util = await import("../../src/util/soplangUtil.js")
let parsedBlock = util.parseCommandBlock(undefined, undefined, block);
console.log(parsedBlock)
$$.checkValue(parsedBlock, [
    '@____TMP1 delete nob1',
    '@____TMP2 exists $nob1',
    '@nob1_name chainAlias nob1 name $nob1',
    '@nob1Alias_name chainAlias nob1Alias name $nob1Alias',
    '@nob2_name chainAlias nob2 name $nob2',
    '@nob1          new NamedObject "NOB1" "Constructor Name NOB1"',
    '@nob1_name  := "Second Name of all NOBs"',
    '@nob2Alias  lookup "NOB2"',
    '@name       := $nob1Alias_name',
    '@nob2       new NamedObject "NOB2" @nob2Alias',
    '@nob2_name  := $nob1Alias_name',
    '@deleteNob1 if $____TMP2 then $____TMP1 else "already deleted"',
    'overwrite %nob1.name "Second Name of all NOBs"'
]);

// multiline backtick block test — parseCommandBlock returns raw lines (encoded), decode happens at parse time
let multilineBlock = `
@result assign \`line1
line2
line3\` "after"
`;
let parsedMultiline = util.parseCommandBlock(undefined, undefined, multilineBlock);
console.log("multiline parsed:", parsedMultiline);
// content is encoded at block level; getNextToken decodes when the command is actually parsed
$$.checkValue(parsedMultiline, [
    "@result assign 'line1%0Aline2%0Aline3' \"after\""
]);

// verify getNextToken decodes correctly end-to-end via parseCommandLine
let parsedCmd = util.parseCommandLine("assign @result 'line1%0Aline2%0Aline3' \"after\"");
$$.checkValue(parsedCmd.inputVars, ["line1\nline2\nline3", "after"]);

// backtick as last param — complex content with special chars
let blockLast = `@result assign "before" \`complex content
with 'single' and "double" quotes
@not-a-var $not-a-var [brackets] 42 !#\``;
let parsedLast = util.parseCommandBlock(undefined, undefined, blockLast);
let cmdLast = util.parseCommandLine(parsedLast[0]);
$$.checkValue(cmdLast.inputVars, ["before", "complex content\nwith 'single' and \"double\" quotes\n@not-a-var $not-a-var [brackets] 42 !#"]);

// backtick as first param (not last)
let blockFirst = `@result assign \`first line
second line\` normalParam 'quoted'`;
let parsedFirst = util.parseCommandBlock(undefined, undefined, blockFirst);
let cmdFirst = util.parseCommandLine(parsedFirst[0]);
$$.checkValue(cmdFirst.inputVars, ["first line\nsecond line", "normalParam", "quoted"]);

// escaped backtick inside content
let blockEscape = `@result assign \`line with \\\` escaped\nand more\``;
let parsedEscape = util.parseCommandBlock(undefined, undefined, blockEscape);
let cmdEscape = util.parseCommandLine(parsedEscape[0]);
$$.checkValue(cmdEscape.inputVars, ["line with ` escaped\nand more"]);

// array literal in string should not break embedded command parsing
let arrayLiteralBlock = `
@srcProbe := "[]"
@shouldGenerate if [ assert $srcProbe == "[]" ] then true else false
`;
let parsedArrayLiteral = util.parseCommandBlock(undefined, undefined, arrayLiteralBlock);
$$.checkValue(parsedArrayLiteral, [
    '@____TMP1 assert $srcProbe == "[]"',
    '@srcProbe := "[]"',
    '@shouldGenerate if $____TMP1 then true else false'
]);

await $$.exit();
