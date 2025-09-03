import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
let script = `
@components := 'sop:array:[{"name":"Create Chat","componentName":"create-chat"}]'
`;
await workspace.runCode(script);
//TODO create json command
//{"variables":{"____TMP1":"{\"name\":\"Create Chat\",\"componentName\":\"create-chat\"}"},
// "transformedText":"@components := 'sop:array:$____TMP1'"}