import { } from "../../deps/clean.mjs";
import assert from "assert";

let workspace = $$.loadPlugin("Workspace");
let graph = workspace.getGraph();

// Custom type for testing reinitialization
function ReinitTestType() {
    let self = this;
    self.__type = "ReinitTestType";
    self.initCount = 0;
    self.reinitCount = 0;
    self.currentArgs = [];
    self.instanceId = Math.random().toString(36).substring(2, 10); // Unique ID for instance tracking

    this.init = async function (...args) {
        self.initCount++;
        self.currentArgs = [...args];
        $$.debug("typeReinit", `Instance ${self.instanceId} INIT with args:`, args);
    };

    this.reinit = async function (...args) {
        self.reinitCount++;
        self.currentArgs = [...args];
        $$.debug("typeReinit", `Instance ${self.instanceId} REINIT with args:`, args);
    };

    this.restore = async function (JSONSerialisation) {
        if (JSONSerialisation) {
            self.initCount = JSONSerialisation.initCount || 0;
            self.reinitCount = JSONSerialisation.reinitCount || 0;
            self.currentArgs = JSONSerialisation.currentArgs || [];
            self.instanceId = JSONSerialisation.instanceId || self.instanceId;
            $$.debug("typeReinit", `Instance ${self.instanceId} RESTORED from serialization`);
        }
    };

    this.getStats = async function () {
        return {
            initCount: self.initCount,
            reinitCount: self.reinitCount,
            currentArgs: self.currentArgs,
            instanceId: self.instanceId
        };
    };
}

await workspace.defineCustomType("ReinitTestType", ReinitTestType);

console.log("Testing custom type reinitialization behavior...");

const testCode1 = `
    @inputVar := "initial"
    @obj new ReinitTestType $inputVar
    @stats obj.getStats
    `;

let docId = await workspace.runCode(testCode1);

const stats1 = await graph.getVarValue(docId, "stats");
assert.strictEqual(stats1.initCount, 1, "Test 1: initCount should be 1 after initial creation.");
assert.strictEqual(stats1.reinitCount, 0, "Test 1: reinitCount should be 0 after initial creation.");
assert.deepStrictEqual(stats1.currentArgs, ["initial"], "Test 1: currentArgs not set as expected.");
await workspace.setVarValue(docId, "inputVar", "updated");

await workspace.buildAll()
const stats2 = await graph.getVarValue(docId, "stats");
assert.strictEqual(stats2.initCount, 1, "Test 2: initCount should be 1 after initial creation.");
assert.strictEqual(stats2.reinitCount, 1, "Test 2: reinitCount should be 1 after args change.");
assert.deepStrictEqual(stats2.currentArgs, ["updated"], "Test 2: currentArgs not updated as expected.");
assert.strictEqual(stats1.instanceId, stats2.instanceId, "Test 2: InstanceId should be the same after reinit.");

console.log("All reinitialization tests completed successfully!");
await $$.endTest(); 