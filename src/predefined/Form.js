function Form(docId, varId){
    let self = this;
    let persistence;
    this.varId = varId;
    self.__type = "Form";

    this.init = async function(formData, ...args) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        this.formData = formData;
        self.instance = await persistence.createForm({formData: formData, varId: this.varId, args: args});
    }

    this.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
            this.varId = JSONSerialisation.varId;
            self.instance = await persistence.getForm(this.varId);
        }
    }
}

$$.registerCustomType("Form", Form);