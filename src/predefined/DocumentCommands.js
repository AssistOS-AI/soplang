
function Document() {
    let self = this;
    let documentsPlugin;
    let persistence;

    this.init = async function(docId, docInstance) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        documentsPlugin = await $$.loadPlugin("Documents");
        self.docId = docId;
        if(docInstance){
            self.docInstance = docInstance;
        } else {
            self.docInstance = await persistence.createDocument({docId:self.docId, chapters: []});
        }
    }

    this.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        documentsPlugin = await $$.loadPlugin("Documents");
        if(JSONSerialisation){
            self.docId = JSONSerialisation.docId;
        }
    }

    this.setTitle = async function(inputValues, outputValues, currentDocId, workspace) {
        await persistence.updateDocument({
            title: inputValues[0],
        })
    }

    this.getTitle = async function(inputValues, outputValues, currentDocId, workspace) {
        let document = await documentsPlugin.getDocument(self.docId);
        return document.title;
    }

    this.setGlobalCommands = async function(inputValues, outputValues, currentDocId, workspace) {
        let commands = inputValues[0];
        await documentsPlugin.updateDocument(self.docId, undefined, undefined, undefined, commands);
    }

    this.getGlobalCommands = async function(inputValues, outputValues, currentDocId, workspace) {
        let document = await documentsPlugin.getDocument(self.docId);
        return document.commands;
    }

    this.setChapterTitle = async function(inputValues, outputValues, currentDocId, workspace) {
        let chapterOder = parseInt(inputValues[0]);
        let chapterTitle = inputValues[1];
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            chapter = await documentsPlugin.createChapter(self.docId, chapterTitle);
            await documentsPlugin.changeChapterOrder(self.docId, chapter.id, chapterOder);
        } else {
            await documentsPlugin.updateChapter(chapter.id, chapterTitle);
        }
    }

    this.getChapterTitle = async function(inputValues, outputValues, currentDocId, workspace) {
        let chapterOder = parseInt(inputValues[0]);
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(chapter){
            return chapter.title;
        }
        return "";
    }

    this.setChapterCommands = async function(inputValues, outputValues, currentDocId, workspace) {
        let chapterOder = parseInt(inputValues[0]);
        let commands = inputValues[1];
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            chapter = await documentsPlugin.createChapter(self.docId, "", commands);
            await documentsPlugin.changeChapterOrder(self.docId, chapter.id, chapterOder);
        } else {
            await documentsPlugin.updateChapter(chapter.id, undefined, undefined, commands);
        }
    }

    this.getChapterCommands = async function(inputValues, outputValues, currentDocId, workspace) {
        let chapterOder = parseInt(inputValues[0]);
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(chapter){
            return chapter.commands;
        }
        return "";
    }

    this.setParagraphText = async function(inputValues, outputValues, currentDocId, workspace) {
        let chapterOder = parseInt(inputValues[0]);
        let paragraphOder = parseInt(inputValues[1]);
        let paragraphText = inputValues[2];
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            chapter = await documentsPlugin.createChapter(self.docId, "");
            await documentsPlugin.changeChapterOrder(self.docId, chapter.id, chapterOder);
        }
        let paragraph = await documentsPlugin.getParagraphAt(self.docId, chapterOder, paragraphOder);
        if(!paragraph){
            paragraph = await documentsPlugin.createParagraph(chapter.id, paragraphText);
            await documentsPlugin.changeParagraphOrder(chapter.id, paragraph.id, paragraphOder);
        } else {
            await documentsPlugin.updateParagraph(chapter.id, paragraph.id, paragraphText);
        }
    }

    this.getParagraphText = async function(inputValues, outputValues, currentDocId, workspace) {
        let chapterOder = parseInt(inputValues[0]);
        let paragraphOder = parseInt(inputValues[1]);

        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            return "";
        }

        let paragraph = await documentsPlugin.getParagraphAt(self.docId, chapterOder, paragraphOder);
        if(paragraph){
            return paragraph.text;
        }
        return "";
    }

    this.setParagraphCommands = async function(inputValues, outputValues, currentDocId, workspace) {
        let chapterOder = parseInt(inputValues[0]);
        let paragraphOder = parseInt(inputValues[1]);
        let commands = inputValues[2];

        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            chapter = await documentsPlugin.createChapter(self.docId, "");
            await documentsPlugin.changeChapterOrder(self.docId, chapter.id, chapterOder);
        }

        let paragraph = await documentsPlugin.getParagraphAt(self.docId, chapterOder, paragraphOder);
        if(!paragraph){
            paragraph = await documentsPlugin.createParagraph(chapter.id, "", commands);
            await documentsPlugin.changeParagraphOrder(chapter.id, paragraph.id, paragraphOder);
        } else {
            await documentsPlugin.updateParagraph(chapter.id, paragraph.id, undefined, commands);
        }
    }

    this.getParagraphCommands = async function(inputValues, outputValues, currentDocId, workspace) {
        let chapterOder = parseInt(inputValues[0]);
        let paragraphOder = parseInt(inputValues[1]);
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            return "";
        }
        let paragraph = await documentsPlugin.getParagraphAt(self.docId, chapterOder, paragraphOder);
        if(paragraph){
            return paragraph.commands;
        }
        return "";
    }

}

export async function init() {
    $$.registerCustomType("Document", Document);
}