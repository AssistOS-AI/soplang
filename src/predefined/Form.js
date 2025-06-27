function Form(docId, varId){
    let persistence;
    this.varId = varId;
    this.__type = "Form";

    this.init = async function(formData, ...args) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        this.formData = formData;
        this.args = args;
    }

    this.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
            this.varId = JSONSerialisation.varId;
            this.formData = JSONSerialisation.formData;
            this.args = JSONSerialisation.args;
        }
    }
}

$$.registerCustomType("Form", Form);