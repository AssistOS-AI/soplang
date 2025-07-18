import {} from "../../deps/clean.mjs";
let workspace = await $$.loadPlugin("Workspace");
let script = `
    @doc new Document "doc1"
    doc.setTitle "Document title"
    @getDocTitle macro ~doc
        @docTitle doc.getTitle
        @res if $docTitle then [ := $docTitle ] else [ := "No title" ]
        return $res
    end
    @scriptRes getDocTitle
`;


let docId = await workspace.runCode(script);
await $$.check(docId, "scriptRes", "Document title");
await $$.endTest();
