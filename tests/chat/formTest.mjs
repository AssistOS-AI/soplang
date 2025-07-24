import {} from "../deps/clean.mjs";
let varUtils = await import("../../src/graph/varUtil.js")
let workspace = $$.loadPlugin("Workspace");
let script = `
    @currentUser := "Michael"
    @favCar form currentUser
        modelName : "modelName" 
        color : "color" 
        currentUser : $currentUser 
    end
`;
let docId = await workspace.runCode(script);
let variable = await varUtils.getVariable(varUtils.getVarID(docId, "favCar"));
$$.endTest();