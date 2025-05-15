import {} from "../deps/clean.mjs";
let documents = await $$.loadPlugin("Documents");

let doc = await documents.createDocument("doc1", "Document title");
let chapters = []
for(let i = 0; i < 10; i++) {
    let chapter = await documents.createChapter(doc.id, `Chapter ${i}`);
    chapters.push(chapter);
}
let paragraphs = [];
for(let i = 0; i < 10; i++) {
    let paragraph = await documents.createParagraph(chapters[0].id, `Paragraph ${i}`);
    paragraphs.push(paragraph);
}
//await new Promise(resolve => setTimeout(resolve, 5000));
for(let i = 0; i < 9; i++) {
    await documents.deleteParagraph(chapters[0].id, paragraphs[i].id);
}
await $$.exit();