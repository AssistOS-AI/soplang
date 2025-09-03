import { fork } from 'child_process';
import path from 'path';
import { runTestsSequentially as runPersistoTests } from '../Persisto/tests/runAllTests.mjs';
let failedTests = [];
let missingPaths = [];

const tests = [
    './persisto/multipleGroupingTest.mjs',
    './util/SOPStringifyTest.mjs',
    './util/commandLineParserTest.js',
    './util/blockParseTest.js',
    './util/macroParseTest.js',
    './pipelines/basic/assertTest.mjs',
    './pipelines/basic/mathTest.mjs',
    './pipelines/basic/jsdefTest.mjs',
    './pipelines/basic/varChangeTest.mjs',
    './pipelines/basic/depsGraphHWTest.mjs',
    './pipelines/basic/aliasTest.mjs',
    './pipelines/basic/conditionalsTest.mjs',
    './pipelines/basic/implicitConditionalsTest.mjs',
    './pipelines/basic/promptCommand.mjs',
    './pipelines/customTypes/fakeAgentTest.mjs',
    './pipelines/customTypes/assignFromSubCommandTest.js',
    './pipelines/customTypes/reinitBehaviorTest.mjs',
    './pipelines/customTypes/constructorVarId.mjs',
    './pipelines/macros/basic/runMacroTest.mjs',
    './pipelines/macros/basic/macroJSONTest.mjs',
    './pipelines/macros/basic/runDefinedMacroTest.mjs',
    './pipelines/macros/basic/reactivityMacroTest.mjs',
    './pipelines/macros/basic/callMacroInMacroTest.mjs',
    './pipelines/macros/basic/importMacroTest.mjs',
    './pipelines/macros/basic/bestCommandTest.mjs',
    './pipelines/macros/advanced/reduceTest.mjs',
    './pipelines/macros/advanced/filterTest.mjs',
    './pipelines/macros/advanced/filterWithMacroTest.mjs',
    './pipelines/macros/advanced/callMacroWithoutReturn.js',
    './pipelines/macros/newFeature/callMacroWithReferencedVar.mjs',
    './pipelines/documents/assignValueFromDocumentSubcommand.js', //to be refactored
    './pipelines/documents/workWithDocsTest.mjs',
    './pipelines/documents/parseDocCommands.js',
    './pipelines/overwrite/customTypesTest.mjs',
    './pipelines/overwrite/basicOverwriteTest.mjs',
    './pipelines/set/containersTest.mjs',
    './pipelines/tables/tableProcessingTest.mjs',
    './pipelines/tables/upsertTest.js',
    './pipelines/tables/assignTableMethodResult.mjs',
    './plugins/documentSmokeTest.mjs',
    './plugins/parallelParagraphCreation.mjs',
    './plugins/overwriteDocCommands.mjs',
    './plugins/deleteDocumentCommandsFromBlock.mjs',
    './plugins/updateMacroDefinition.mjs',
    './chat/formTest.mjs',
    './chat/basicChatAgentAnswers.js',
    './chat/basicChatUserAnswers.js',
    './chat/contextChat.js',
    './chat/importScriptTest.js',
    './chat/changeScriptInChatExecution.js',

    //failing
    './pipelines/basic/parseSOPObject.mjs',
    './pipelines/basic/ifCommandEdgeCase.mjs',
    './pipelines/tables/preventTableInsertAfterBuild.js',
    //add update command definition test
];

import fs from 'node:fs/promises';
import { constants } from 'node:fs';

async function fileExists(filePath) {
    try {
        await fs.access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

function identAndCleanStdErr(output) {
    let lines = output.split("\n");
    let cleanedLines = lines.map(line => "\t\t" + line.trim());
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
            if (!await fileExists(absolutePath)) {
                missingPaths.push(testPath);
                continue;
            }
        } catch {
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
            failedTests.push({ testPath, stdErrResult: exitCode.stderr });
            failed++;
        }
    }

    return { passed, failed };
}

async function runAllTests() {
    console.log('🚀 Starting All Tests...\n');
    
    console.log('📦 Running Persisto Tests...');
    const persistoResult = await runPersistoTests();
    
    // Merge Persisto results
    failedTests.push(...persistoResult.failedTests);
    missingPaths.push(...persistoResult.missingPaths);
    
    // Run SOPLang tests
    console.log('\n🔧 Running SOPLang Tests...');
    const soplangResult = await runTestsSequentially(tests);
    
    // Calculate totals
    const totalPassed = persistoResult.passed + soplangResult.passed;
    const totalFailed = persistoResult.failed + soplangResult.failed;

    console.log(`\n\n>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Final Summary:`);
    if (totalFailed > 0) {
        console.log(`\tFailed tests:`);
        failedTests.forEach(test => console.log(`\t- ${test.testPath} \n${identAndCleanStdErr(test.stdErrResult)}`));
    }
    if (missingPaths.length) {
        console.log("\tFollowing paths do not exist:", missingPaths);
    }
    console.log(`\t🏁 Overall Finished: ${totalPassed} passed, ${totalFailed} failed.`);
    process.exit(totalFailed > 0 ? 1 : 0);
}

await runAllTests();

process.exit(0);