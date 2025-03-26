import { fork } from 'child_process';
import path from 'path';
const tests = [
    './pipelines/defTest.mjs',
    './pipelines/varChangeTest.mjs',
    './pipelines/depsGraphHWTest.mjs',
    './pipelines/tablesTest.mjs',
    './util/commandLineParserTest.js',
    './pipelines/aliasTest.mjs',
    './workspace/mainSmokeTest.mjs'
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
            failed++;
        }
    }

    console.log(`\n🏁 Finished: ${passed} passed, ${failed} failed.`);
    process.exit(failed > 0 ? 1 : 0);
}

await runTestsSequentially(tests);