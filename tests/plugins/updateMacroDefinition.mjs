import {} from "../deps/clean.mjs";
let documents = $$.loadPlugin("Documents");
let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();
const doc = await documents.createDocument("docId", "category", "title");
const commands = `
    @concat macro
        @result := "value"
        return $result
    end
    @call concat
`;
await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, commands, doc.comments);
await workspace.buildOnlyForDocument(doc.docId);
await $$.checkDocVar(doc.docId, "call", "value");

const updatedCommands = `
     @concat macro a b
        @result := $a $b
        return $result
     end
    @call concat "Hello" "World"
`;

console.log("Updating macro definition...");

await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, updatedCommands, doc.comments);
await workspace.buildOnlyForDocument(doc.docId);
await $$.checkDocVar(doc.docId, "call", "Hello World");

await graph.printGraph();
await $$.exit();

