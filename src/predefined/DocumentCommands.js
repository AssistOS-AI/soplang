
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
            self.docInstance = await persistence.createDocument({docId:self.docId});
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
        //workspace.setTitle()
    }

    this.getTitle = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    this.setGlobalCommands = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    this.getGlobalCommands = async function(inputValues, outputValues, currentDocId, workspace) {

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

    }

    this.setChapterCommands = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    this.getChapterCommands = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    this.setParagraphText = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    this.getParagraphText = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    this.setParagraphCommands = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    this.getParagraphCommands = async function(inputValues, outputValues, currentDocId, workspace) {

    }

}

export async function init() {
    $$.registerCustomType("Document", Document);
}