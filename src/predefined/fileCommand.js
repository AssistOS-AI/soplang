import { promises as fs } from "fs";
import path from "path";
let varUtil = await import("../graph/varUtil.js");

export async function file(inputValues, parsedCommand, currentDocId, graph, buildInstance, docPath) {
    let outputVarId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
    if (!inputValues || inputValues.length !== 1) {
        await varUtil.updateErrorInfo(outputVarId, "Invalid file command. Expected exactly 1 argument: file path");
        return undefined;
    }
    let rawPath = inputValues[0];
    if (typeof rawPath !== "string" || rawPath.length === 0) {
        await varUtil.updateErrorInfo(outputVarId, "Invalid file command. Path must be a non-empty string");
        return undefined;
    }

    let baseDir = docPath ? path.dirname(docPath) : process.cwd();
    let resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(baseDir, rawPath);
    try {
        let stat = await fs.stat(resolvedPath);
        let currentMtime = stat.mtimeMs;
        let currentCtime = stat.ctimeMs;
        let existingValue = await varUtil.getVarValue(outputVarId);
        if (existingValue && existingValue.mtimeMs === currentMtime && existingValue.ctimeMs === currentCtime) {
            return existingValue;
        }
        return { mtimeMs: currentMtime, ctimeMs: currentCtime };
    } catch (error) {
        await varUtil.updateErrorInfo(outputVarId, `Failed to stat file '${resolvedPath}': ${error.message}`);
        return undefined;
    }
}
