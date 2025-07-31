import {} from "../../deps/clean.mjs";
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();
let script = `
    @doc new Document "doc1"
    @initialTitle doc.setTitle "Document title" #debug
    @getDocTitle macro ~doc
        @docTitle doc.getTitle  #debug
        @res if $docTitle then [ := $docTitle ] else [ := "No title" ]  #debug
        return $res #debug
    end
    @scriptRes getDocTitle $initialTitle  #debug
`;


let docId = await workspace.runCode(script);

await $$.check(docId, "initialTitle", "Document title");
await $$.check(docId, "scriptRes", "Document title");
await graph.printGraph();
await $$.endTest();
