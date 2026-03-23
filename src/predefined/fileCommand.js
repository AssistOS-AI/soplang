import { promises as fs } from "fs";
import path from "path";
let varUtil = await import("../graph/varUtil.js");

const mtimeCache = new Map();

export async function file(inputValues, parsedCommand, currentDocId) {
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

    let resolvedPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
    try {
        let stat = await fs.stat(resolvedPath);
        let currentMtime = stat.mtimeMs;
        if (mtimeCache.get(outputVarId) === currentMtime) {
            return await varUtil.getVarValue(outputVarId);
        }
        let content = await fs.readFile(resolvedPath, "utf8");
        mtimeCache.set(outputVarId, currentMtime);
        return content;
    } catch (error) {
        await varUtil.updateErrorInfo(outputVarId, `Failed to read file '${resolvedPath}': ${error.message}`);
        return undefined;
    }
}
