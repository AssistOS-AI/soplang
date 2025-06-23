import {} from "../../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");

let script = `
    @agentName := "Assistant"
    @cars discussion currentUser
        @carName := "Car name of" $currentUser
        @color := "the color of the car for" $currentUser
        @year := "year of production of the car for" $currentUser
    end
    @workflowAgent new Workflow $agentName
    workflowAgent.configure "Use $cars to find the favorite car for the user"
`;

let docId = await workspace.runCode(script);
