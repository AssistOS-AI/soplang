import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
//parser removes unnecessary spaces after "\n", adding them will fail the test
let promptContent = `You are an expert web component developer for the WebSkel framework.
Your primary task is to create and modify web components based on user requests.
A component has the following structure: html, css and js.`;
let script = `
    @newPrompt prompt
    ${promptContent}
    end
`;

let docId = await workspace.runCode(script);
await $$.check(docId, "newPrompt", promptContent);
await $$.endTest();
