function Form(docId, varName){
    this.docId = docId;
    this.varName = varName;
    this.__type = "Form";

    this.init = async function(formData, ...args) {
        this.formData = formData;
        this.args = args;
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.varName = JSONSerialisation.varName;
            this.formData = JSONSerialisation.formData;
            this.args = JSONSerialisation.args;
        }
    }
}

$$.registerCustomType("Form", Form);