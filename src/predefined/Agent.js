function Agent(){
    let self = this;
    let documentsPlugin, persistence, LLMPlugin;
    this.init = async function(){
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

}
export async function init() {
    $$.registerCustomType("Agent", Agent);
}