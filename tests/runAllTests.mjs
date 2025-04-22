import { fork } from 'child_process';
import path from 'path';
let failedTests = [];
let missingPaths = [];

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
    './pipelines/customTypes/fakeAgentTest.mjs',
    './pipelines/customTypes/assignFromSubCommandTest.js',
    './pipelines/macros/basic/runMacroTest.mjs',
    './pipelines/macros/basic/runDefinedMacroTest.mjs',
    './pipelines/macros/basic/reactivityMacroTest.mjs',
    './pipelines/macros/basic/callMacroInMacroTest.mjs',
    './pipelines/documents/assignValueFromDocumentSubcommand.js', //to be refactored
    './pipelines/documents/workWithDocsTest.mjs',
    './pipelines/overwrite/customTypesTest.mjs',
    './pipelines/overwrite/basicOverwriteTest.mjs',
    './pipelines/macros/advanced/containersTest.mjs',
];

import fs from 'node:fs/promises';
import { constants } from 'node:fs';

async function fileExists(filePath) {
    try {
        await fs.access(filePath, constants.F_OK);
        return true;
    } catch (error) {
        return false;
    }
}


function identAndCleanStdErr(output){
    let lines = output.split("\n");
    let cleanedLines = lines.map(line => "\t\t"+line.trim());
    cleanedLines = cleanedLines.filter(line => line !== "");
    return cleanedLines.join("\n");
}
async function runTestsSequentially(tests) {
    let passed = 0, failed = 0;

    for (const testPath of tests) {
        const absolutePath = path.resolve(testPath);
        console.log(`\n▶️ Running test: ${absolutePath}`);
        try {
            //use fs to check if the file exists
            if(!await fileExists(absolutePath)) {
                missingPaths.push(testPath);
            }
        } catch (error) {
            missingPaths.push(testPath);
            continue;
        }

        const exitCode = await new Promise((resolve) => {
            const child = fork(absolutePath, [], { stdio: 'pipe' });

            let stderrData = '';

            child.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            child.on('exit', (code) => {
                resolve({ code, stderr: stderrData }); // Rezolvăm cu un obiect care conține codul și stderr
            });
        });

        if (exitCode.code === 0 && exitCode.stderr === '') {
            console.log(`✅ PASSED: ${testPath}`);
            passed++;
        } else {
            console.log(`❌ FAILED: ${testPath} (exit code: ${exitCode.code}${exitCode.stderr ? `, stderr: ${exitCode.stderr.trim()}` : ''})`);
            failedTests.push({testPath, stdErrResult:exitCode.stderr});
            failed++;
        }
    }

    console.log("Following paths does not exist:", missingPaths);
    console.log(`\n🏁 Finished: ${passed} passed, ${failed} failed.`);
    if(failed > 0) {
        console.log(`\nFailed tests:`);
        failedTests.forEach(test => console.log(`- ${test.testPath} \n${identAndCleanStdErr(test.stdErrResult)}`));
    }
    process.exit(failed > 0 ? 1 : 0);
}

await runTestsSequentially(tests);

process.exit(0);