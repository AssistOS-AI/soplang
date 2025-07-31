
function Document(docId, varName) {
    let self = this;
    let documentsPlugin;
    let persistence;
    self.__type = "Document";

    this.init = async function(docId, docInstance) {
        persistence = $$.loadPlugin("DefaultPersistence");
        documentsPlugin = $$.loadPlugin("Documents");
        self.docId = docId;
        if(docInstance){
            self.docInstance = docInstance;
        } else {
            self.docInstance = await persistence.createDocument({docId:self.docId, chapters: []});
        }
    }

    this.restore = async function(JSONSerialisation) {
        persistence = $$.loadPlugin("DefaultPersistence");
        documentsPlugin = $$.loadPlugin("Documents");
        if(JSONSerialisation){
            self.docId = JSONSerialisation.docId;
        }
    }

    this.setTitle = async function(inputValues, parsedCommand, currentDocId, graph) {
        await persistence.updateDocument(self.docId, {title:inputValues[0]});
        return inputValues[0];
    }

    this.setInfoText = async function(inputValues, parsedCommand, currentDocId, graph) {
        await persistence.updateDocument(self.docId, {infoText:inputValues[0]});
    }

    this.getInfoText = async function(inputValues, parsedCommand, currentDocId, graph) {
        let document = await documentsPlugin.getDocument(self.docId);
        return document.infoText;
    }

    this.getTitle = async function(inputValues, parsedCommand, currentDocId, graph) {
        let document = await documentsPlugin.getDocument(self.docId);
        return document.title;
    }

    this.setGlobalCommands = async function(inputValues, parsedCommand, currentDocId, graph) {
        let commands = inputValues[0];
        await persistence.updateDocument(self.docId, {commands});
    }

    this.getGlobalCommands = async function(inputValues, parsedCommand, currentDocId, graph) {
        let document = await documentsPlugin.getDocument(self.docId);
        return document.commands;
    }

    this.setChapterTitle = async function(inputValues, parsedCommand, currentDocId, graph) {
        let chapterOder = parseInt(inputValues[0]);
        let chapterTitle = inputValues[1];
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            let document = await documentsPlugin.getDocument(self.docId);
            let chapters = document.chapters;
            for (let i = chapters.length; i < chapterOder; i++) {
                await documentsPlugin.createChapter(self.docId, "");
            }
            await documentsPlugin.createChapter(self.docId, chapterTitle);
        } else {
            await documentsPlugin.updateChapter(chapter.id, chapterTitle, chapter.comments, chapter.commands);
        }
    }

    this.getChapterTitle = async function(inputValues, parsedCommand, currentDocId, graph) {
        let chapterOder = parseInt(inputValues[0]);
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(chapter){
            return chapter.title;
        }
    }

    this.setChapterCommands = async function(inputValues, parsedCommand, currentDocId, graph) {
        let chapterOder = parseInt(inputValues[0]);
        if(chapterOder < 0){
            return;
        }
        let commands = inputValues[1];
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            let document = await documentsPlugin.getDocument(self.docId);
            let chapters = document.chapters;
            for (let i = chapters.length; i < chapterOder; i++) {
                await documentsPlugin.createChapter(self.docId, "");
            }
            await documentsPlugin.createChapter(self.docId, "", commands);
        } else {
            await documentsPlugin.updateChapter(chapter.id, chapter.title, chapter.comments, commands);
        }
    }

    this.getChapterCommands = async function(inputValues, parsedCommand, currentDocId, graph) {
        let chapterOder = parseInt(inputValues[0]);
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(chapter){
            return chapter.commands;
        }
    }

    this.setParagraphText = async function(inputValues, parsedCommand, currentDocId, graph) {
        let chapterOder = parseInt(inputValues[0]);
        let paragraphOder = parseInt(inputValues[1]);
        let paragraphText = inputValues[2];
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            let document = await documentsPlugin.getDocument(self.docId);
            let chapters = document.chapters;
            for (let i = chapters.length; i <= chapterOder; i++) {
                await documentsPlugin.createChapter(self.docId, "");
            }
        }
        let paragraph = await documentsPlugin.getParagraphAt(self.docId, chapterOder, paragraphOder);
        if(!paragraph){
            let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
            let paragraphs = chapter.paragraphs;
            for (let i = paragraphs.length; i < paragraphOder; i++) {
                await documentsPlugin.createParagraph(chapter.id, "");
            }
            await documentsPlugin.createParagraph(chapter.id, paragraphText);
        } else {
            await documentsPlugin.updateParagraph(chapter.id, paragraph.id, paragraphText, paragraph.commands, paragraph.comments);
        }
    }

    this.getParagraphText = async function(inputValues, parsedCommand, currentDocId, graph) {
        let chapterOder = parseInt(inputValues[0]);
        let paragraphOder = parseInt(inputValues[1]);

        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            return;
        }

        let paragraph = await documentsPlugin.getParagraphAt(self.docId, chapterOder, paragraphOder);
        if(paragraph){
            return paragraph.text;
        }
    }

    this.setParagraphCommands = async function(inputValues, parsedCommand, currentDocId, graph) {
        let chapterOder = parseInt(inputValues[0]);
        let paragraphOder = parseInt(inputValues[1]);
        let commands = inputValues[2];

        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            let document = await documentsPlugin.getDocument(self.docId);
            let chapters = document.chapters;
            for (let i = chapters.length; i <= chapterOder; i++) {
                await documentsPlugin.createChapter(self.docId, "");
            }
        }

        let paragraph = await documentsPlugin.getParagraphAt(self.docId, chapterOder, paragraphOder);
        if(!paragraph){
            let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
            let paragraphs = chapter.paragraphs;
            for (let i = paragraphs.length; i < paragraphOder; i++) {
                await documentsPlugin.createParagraph(chapter.id, "");
            }
            await documentsPlugin.createParagraph(chapter.id, "", commands);
        } else {
            await documentsPlugin.updateParagraph(chapter.id, paragraph.id, paragraph.text, commands, paragraph.comments);
        }
    }

    this.getParagraphCommands = async function(inputValues, parsedCommand, currentDocId, graph) {
        let chapterOder = parseInt(inputValues[0]);
        let paragraphOder = parseInt(inputValues[1]);
        let chapter = await documentsPlugin.getChapterAt(self.docId, chapterOder);
        if(!chapter){
            return;
        }
        let paragraph = await documentsPlugin.getParagraphAt(self.docId, chapterOder, paragraphOder);
        if(paragraph){
            return paragraph.commands;
        }
    }
}

$$.registerCustomType("Document", Document);
