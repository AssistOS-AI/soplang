import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
let documents = $$.loadPlugin("Documents");

const commands = `
    @docVar1 := "doc var 1"
    @a new Table c1 c2 c3 c4
    @generate macro hello ~world        
        @orderNumber counter        
        @res := $hello $world $orderNumber                        
        return $res       
    end
    @verify jsdef value
       if (value === "Hello World 5") {
            return 10;
       }       
       return 1;
    end
    @result ?verify $docVar1
`;

let docId = await workspace.runCode(commands);

let parsedCommands = await workspace.getDocCommandsParsed(docId);
await $$.checkValue(parsedCommands[0].varName, "docVar1");
await $$.checkValue(parsedCommands[1].command, "new");
await $$.checkValue(parsedCommands[1].customType, "Table");
await $$.checkValue(parsedCommands[2].params, ["hello", "~world"]);

let chapterCommands = `
    @ch0 := "ch var 0"
    @ch1 new Table c1 c2 c3 c4
    @ch2 macro hello ~world
        @orderNumber counter
        @res := $hello $world $orderNumber
        return $res
    end
`
let chapter = await documents.createChapter(docId, "chapter 1", chapterCommands);
parsedCommands = await workspace.getDocCommandsParsed(docId, chapter.id);

let chapterVars = parsedCommands.filter((c) => c.chapterId === chapter.id);
await $$.checkValue(chapterVars[0].varName, "ch0");
await $$.checkValue(chapterVars[1].command, "new");
await $$.checkValue(chapterVars[2].expression, `@orderNumber counter\n@res := $hello $world $orderNumber\nreturn $res`);

let paragraphCommands = `
    @p0 := "p var 0"
`;
let paragraph = await documents.createParagraph(chapter.id, "paragraph 1", paragraphCommands);
parsedCommands = await workspace.getDocCommandsParsed(docId);
let paragraphVars = parsedCommands.filter((c) => c.paragraphId === paragraph.id);
await $$.checkValue(paragraphVars[0].varName, "p0");
await $$.endTest();
