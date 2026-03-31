import { glob, stat } from "node:fs/promises";
import path from "path";
let varUtil = await import("../graph/varUtil.js");

export async function files(inputValues, parsedCommand, currentDocId, graph, buildInstance, docPath) {
    let outputVarId = varUtil.getVarID(currentDocId, parsedCommand.outputVars[0]);
    if (!inputValues || inputValues.length !== 1) {
        await varUtil.updateErrorInfo(outputVarId, "Invalid files/glob command. Expected exactly 1 argument: unix glob pattern");
        return undefined;
    }
    let rawPattern = inputValues[0];
    if (typeof rawPattern !== "string" || rawPattern.trim().length === 0) {
        await varUtil.updateErrorInfo(outputVarId, "Invalid files/glob command. Pattern must be a non-empty string");
        return undefined;
    }
    let baseDir = docPath ? path.dirname(docPath) : process.cwd();
    let pattern = rawPattern.trim();
    try {
        let matches = [];
        for await (let matchedPath of glob(pattern, { cwd: baseDir })) {
            let fullPath = path.isAbsolute(matchedPath) ? matchedPath : path.resolve(baseDir, matchedPath);
            let fileStat;
            try {
                fileStat = await stat(fullPath);
            } catch {
                continue;
            }
            matches.push({
                path: fullPath,
                mtimeMs: fileStat.mtimeMs,
                ctimeMs: fileStat.ctimeMs
            });
        }
        matches.sort((a, b) => b.mtimeMs - a.mtimeMs || a.path.localeCompare(b.path));
        let existingValue = await varUtil.getVarValue(outputVarId);
        if (existingValue !== undefined && varUtil.sameValue(existingValue, matches)) {
            return existingValue;
        }
        return matches;
    } catch (error) {
        await varUtil.updateErrorInfo(outputVarId, `Failed to resolve files/glob pattern '${rawPattern}': ${error.message}`);
        return undefined;
    }
}

export { files as glob };
