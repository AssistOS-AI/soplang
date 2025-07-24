import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
import assert from "assert";
let script = `
    @agentName := "Assistant"
    @cars form currentUser
        carName : "Car name of" $currentUser
        color : "the color of the car for" $currentUser
        year : "year of production of the car for" $currentUser
    end
    @workflowAgent new Workflow $agentName
    workflowAgent.configure "Use " $cars " to find the favorite car for the user"
`;

let docId = await workspace.runCode(script);
let workFlow = await workspace.getVarValue(docId, "workflowAgent");
let answers = [
    {"carName": "Tesla Model S"},
    {"wrongAnswer": "This is not a valid answer"},
    {"color": "Red"},
    {"year": 2020}
]
for(let answer of answers) {
    let question = await workFlow.getQuestion();
    ///user answers
    await workFlow.acknowledgeResponse(answer);
}
//final query for question
let question = await workFlow.getQuestion();
assert(workFlow.isCompleted, true);
assert(workFlow.answers, [
    {"carName": "Tesla Model S", "color": "Red", "year": 2020}
]);
await $$.endTest();
