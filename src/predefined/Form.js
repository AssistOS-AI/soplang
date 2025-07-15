function Form(docId, varId){
    this.varId = varId;
    this.__type = "Form";

    this.init = async function(formData, ...args) {
        this.formData = formData;
        this.args = args;
    }

    this.restore = async function(JSONSerialisation) {
        if(JSONSerialisation){
            this.varId = JSONSerialisation.varId;
            this.formData = JSONSerialisation.formData;
            this.args = JSONSerialisation.args;
        }
    }
}

$$.registerCustomType("Form", Form);