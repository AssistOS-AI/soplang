function Workflow(docId, varName){
    let self = this;
    let persistence, agentPlugin, workspace;
    this.agentName = undefined;
    this.varName = varName;
    let agentInstance = undefined;
    self.__type = "Agent";
    this.forms = [];
    this.docId = docId;
    this.currentFormIndex = -1;
    this.isCompleted = false;
    this.answers = [];

    this.init = async function(agentName) {
        persistence = $$.loadPlugin("DefaultPersistence");
        self.agentName = agentName;
        agentInstance = await persistence.createAgent({name: agentName, forms: []});
    }
    this.configure = async function(inputValues, parsedCommand, currentDocId, graph, buildInstance) {
        self.generalInstructionPrompt = "";
        for(let value of inputValues){
            if(typeof value === "string"){
                self.generalInstructionPrompt += value + " ";
            }
            if(value.__type === "Form"){
                this.forms.push(value.varName);
                self.generalInstructionPrompt += JSON.stringify(value.formData) + " ";
            }
        }
        await persistence.updateAgent(self.agentName, {forms:this.forms});
    }
    this.getCurrentRequiredFields = async function() {
        let graph = workspace.getGraph();
        let form = await graph.getVarValue(this.docId, this.forms[this.currentFormIndex]);
        return form.formData || {};
    }
    this.getMissingFields = async function() {
        const formAnswers = this.answers[this.currentFormIndex] || {};
        let requiredFields = await this.getCurrentRequiredFields();
        let missingFields = [];
        for(let fieldName in requiredFields) {
            if(!formAnswers[fieldName]) {
                missingFields.push(fieldName);
            }
        }
        return missingFields;
    }
    this.getNextQuestion = async function() {
        if(this.isCompleted) {
            return "Workflow is completed.";
        }
        const missing = await this.getMissingFields();
        if (missing.length === 0) {
            return "Thank you! All required fields are filled.";
        }

        //generate prompt for the first missing fields
        return `Please provide your ${missing[0]}.`;
    }
    this.findPossibleAnswers = async function(response) {
        let currentForm = await workspace.getVarValue(this.docId, this.forms[this.currentFormIndex]);
        let answers = {};
        for(let fieldName in response) {
            if(currentForm.formData[fieldName]){
                answers[fieldName] = response[fieldName];
            }
        }
        return answers;
    }
    this.acknowledgeResponse = async function(response) {
        //find any possible answers for the current form
        let answers = await this.findPossibleAnswers(response);
        if(Object.keys(answers).length > 0) {
            if(!this.answers[this.currentFormIndex]) {
                this.answers[this.currentFormIndex] = {};
            }
            for(let fieldName of Object.keys(answers)) {
                this.answers[this.currentFormIndex][fieldName] = answers[fieldName];
            }
            //update persistence
        }
    }
    this.canProceedToNextForm = async function() {
        if(this.currentFormIndex === -1) {
            return true; //beginning of the workflow
        }

        const missingFields = await this.getMissingFields();
        return missingFields.length === 0;
    }
    this.nextForm = function() {
        this.currentFormIndex++;
        if(this.currentFormIndex >= this.forms.length) {
            this.isCompleted = true;
        }
    }
    this.getQuestion = async function(){
        if(await this.canProceedToNextForm()) {
            this.nextForm();
        }
        return await this.getNextQuestion();
    }
    this.getTextResponse = async function(inputValues, parsedCommand, currentDocId, graph){
        const llm = $$.loadPlugin("LLM");
        const [provider, model, prompt,options={}] = inputValues;
        return await llm.getTextResponse(provider, model, prompt, options);

    }
    this.getChatCompletionResponse = async function(inputValues, parsedCommand, currentDocId, graph) {
        const llm = $$.loadPlugin("LLM");
        const [provider, model, messages,options={}] = inputValues;
        return await llm.getChatCompletionResponse(provider, model, messages, options);
    }

    this.restore = async function(JSONSerialisation) {
        persistence = $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
            self.agentName = JSONSerialisation.agentName;
            agentInstance = await persistence.getAgent(self.agentName);
            this.forms = agentInstance.forms;
        }
        workspace = $$.loadPlugin("Workspace");
    }
}

$$.registerCustomType("Workflow", Workflow);