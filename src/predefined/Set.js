
async function createSet(){
    let newSet = new SetContainer();
    await newSet.init();
    return newSet;
}
function SetContainer(){
    let self = this;
    let persistence;
    self.id = undefined;
    self.__type = "Set";
    let instance = undefined;

    self.init = async function(...args){
        persistence = await $$.loadPlugin("DefaultPersistence");
        //instance = await persistence.createSet({});
        self.id = 1;
    }

    self.restore = async function(JSONSerialisation) {
        persistence = await $$.loadPlugin("DefaultPersistence");
        if(JSONSerialisation){
            self.id = JSONSerialisation.id;
           // instance = await persistence.getSet(this.id);
        }
    }

    self.map = async function(inputValues, outputValues, currentDocId, workspace) {
        console.debug(">>>>> Set.map", inputValues, outputValues, currentDocId);
        let newSet = await createSet();
        return newSet;
    }

    self.filter = async function(inputValues, outputValues, currentDocId, workspace) {
        await createSet();
    }

    self.reduce = async function(inputValues, outputValues, currentDocId, workspace) {
        await createSet();
    }

    self.add = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    self.getAt = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    self.first = async function(inputValues, outputValues, currentDocId, workspace) {

    }

    self.rest = async function(inputValues, outputValues, currentDocId, workspace) {

    }

}
$$.registerCustomType("Set", SetContainer);
