import {} from "../deps/clean.mjs";
let documents = await $$.loadPlugin("Documents");
let workspace = await $$.loadPlugin("Workspace");

const doc = await documents.createDocument("docId", "category", "title");
const commands = `
    @concat macro a b
        @result := "value"
        return $result
    end
    @call concat "Hello" "World"
`;
await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, commands, doc.comments);
await workspace.buildOnlyForDocument(doc.docId);
await $$.checkDocVar(doc.docId, "call", "value");

const updatedCommands = `
     @concat macro a b
        @result := $a + " " + $b
        return $result
    end
    @call concat "Hello" "World"
`;
await documents.updateDocument(doc.id, doc.title, doc.docId, doc.category, doc.infoText, updatedCommands, doc.comments);
await workspace.buildOnlyForDocument(doc.docId);
await $$.checkDocVar(doc.docId, "call", "Hello World");

await $$.exit();

