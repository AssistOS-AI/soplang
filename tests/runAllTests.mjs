import { fork } from 'child_process';
import path from 'path';
let failedTests = [];

const tests = [
    './pipelines/basic/defTest.mjs',
    './pipelines/basic/varChangeTest.mjs',
    './pipelines/basic/depsGraphHWTest.mjs',
    './pipelines/tables/tablesTest.mjs',
    './util/commandLineParserTest.js',
    './pipelines/basic/aliasTest.mjs',
    './pipelines/documents/mainSmokeTest.mjs',
    './pipelines/basic/conditionalsTest.mjs',
    './pipelines/basic/implicitConditionalsTest.mjs',
    './pipelines/scripts/runScriptTest.mjs',
    './pipelines/customTypes/simpleCustomTypesTest.mjs',
    './pipelines/customTypes/fakeAgentTest.mjs',
    './pipelines/scripts/workWithDocsTest.mjs',
];

async function runTestsSequentially(tests) {
    let passed = 0, failed = 0;

    for (const testPath of tests) {
        const absolutePath = path.resolve(testPath);
        console.log(`\n▶️ Running test: ${absolutePath}`);

        const exitCode = await new Promise((resolve) => {
            const child = fork(absolutePath, [], { stdio: 'inherit' });

            child.on('exit', (code) => {
                resolve(code);
            });
        });

        if (exitCode === 0) {
            console.log(`✅ PASSED: ${testPath}`);
            passed++;
        } else {
            console.log(`❌ FAILED: ${testPath} (exit code: ${exitCode})`);
            failedTests.push(testPath);
            failed++;
        }
    }

    console.log(`\n🏁 Finished: ${passed} passed, ${failed} failed.`);
    if(failed > 0) {
        console.log(`\nFailed tests:`);
        failedTests.forEach(test => console.log(`- ${test}`));
    }
    process.exit(failed > 0 ? 1 : 0);
}

await runTestsSequentially(tests);