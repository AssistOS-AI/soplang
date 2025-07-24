import {} from "../deps/clean.mjs";
let documents = $$.loadPlugin("Documents");
async function createParagraphs(chapterId) {
    let paragraphs = [];
    for (let i = 0; i < 10; i++) {
        let paragraph = await documents.createParagraph(chapterId, `Paragraph ${i}`, "");
        paragraphs.push(paragraph);
    }
    return paragraphs;
}

let doc = await documents.createDocument("doc1", "Document title");
let chapters = []
for(let i = 0; i < 10; i++) {
    let chapter = await documents.createChapter(doc.id, `Chapter ${i}`);
    chapters.push(chapter);
}
 createParagraphs(chapters[0].id).then(async paragraphs => {
    for(let i = 0; i < 9; i++) {
         documents.deleteParagraph(chapters[0].id, paragraphs[i].id).catch(error => {
            console.error(`Error deleting paragraph ${paragraphs[i].id} from chapter 0:`, error);
        });
    }
})
//await new Promise(resolve => setTimeout(resolve, 2000));
createParagraphs(chapters[1].id).then(async paragraphs => {
    for(let i = 0; i < 9; i++) {
         documents.deleteParagraph(chapters[1].id, paragraphs[i].id).catch(error => {
            console.error(`Error deleting paragraph ${paragraphs[i].id} from chapter 1:`, error);
        });
    }
})
await new Promise(resolve => setTimeout(resolve, 2000));

await $$.exit();