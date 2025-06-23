function Workflow(){
    let self = this;
    let documentsPlugin, persistence, agentPlugin;
    this.agentName = undefined;
    let agentInstance = undefined;
    self.__type = "Agent";

    this.init = async function(agentName) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        this.agentName = agentName;
        agentInstance = await persistence.createAgent({name: agentName});
    }
    this.configure = async function(inputValues, parsedCommand, currentDocId, graph) {
        console.log(inputValues);
    }
    this.getTextResponse = async function(inputValues, parsedCommand, currentDocId, graph){
        const llm = await $$.loadPlugin("LLM");
        const [provider, model, prompt,options={}] = inputValues;
        return await llm.getTextResponse(provider, model, prompt, options);

    }
    this.getChatCompletionResponse = async function(inputValues, parsedCommand, currentDocId, graph) {
        const llm = await $$.loadPlugin("LLM");
        const [provider, model, messages,options={}] = inputValues;
        return await llm.getChatCompletionResponse(provider, model, messages, options);
    }

    this.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
            this.agentName = JSONSerialisation.agentName;
            agentInstance = await persistence.getAgent(this.agentName);
        }
    }
}

$$.registerCustomType("Workflow", Workflow);