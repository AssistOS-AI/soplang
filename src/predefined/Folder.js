import fsPromises from "node:fs/promises";
import path from "path";
import { getVarID, getVariable, sameValue, updateErrorInfo } from "../graph/varUtil.js";

async function resolveDocBaseDir(docPath) {
    if (!docPath) {
        return process.cwd();
    }
    try {
        let docPathStat = await fsPromises.stat(docPath);
        if (docPathStat.isDirectory()) {
            return docPath;
        }
        return path.dirname(docPath);
    } catch {
        return path.dirname(docPath);
    }
}

async function buildFileSnapshot(absolutePath) {
    try {
        let fileStat = await fsPromises.stat(absolutePath);
        return {
            exists: true,
            kind: "file",
            mtimeMs: fileStat.mtimeMs,
            ctimeMs: fileStat.ctimeMs
        };
    } catch {
        return {
            exists: false,
            kind: "missing"
        };
    }
}

async function collectDirectoryEntries(directoryPath, relativePath = "", entries = {}) {
    let currentStat = await fsPromises.stat(directoryPath);
    entries[relativePath || "."] = {
        kind: "dir",
        mtimeMs: currentStat.mtimeMs,
        ctimeMs: currentStat.ctimeMs
    };

    let children = await fsPromises.readdir(directoryPath, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name));

    for (let child of children) {
        if (!child.isDirectory() && !child.isFile()) {
            continue;
        }

        let childAbsolutePath = path.join(directoryPath, child.name);
        let childRelativePath = relativePath ? path.join(relativePath, child.name) : child.name;

        if (child.isDirectory()) {
            await collectDirectoryEntries(childAbsolutePath, childRelativePath, entries);
            continue;
        }

        let childStat = await fsPromises.stat(childAbsolutePath);

        entries[childRelativePath] = {
            kind: "file",
            mtimeMs: childStat.mtimeMs,
            ctimeMs: childStat.ctimeMs
        };
    }

    return entries;
}

async function buildFolderSnapshot(absolutePath) {
    try {
        let rootStat = await fsPromises.stat(absolutePath);
        if (!rootStat.isDirectory()) {
            return await buildFileSnapshot(absolutePath);
        }
        let entries = await collectDirectoryEntries(absolutePath);
        return {
            exists: true,
            kind: "dir",
            entries
        };
    } catch {
        return {
            exists: false,
            kind: "missing"
        };
    }
}

function Folder(docId, varName) {
    let self = this;
    self.__type = "Folder";
    self.docId = docId;
    self.varName = varName;
    self.baseDir = process.cwd();
    self.relativePath = "";
    self.path = process.cwd();
    self.snapshots = {};

    async function resolveAndSetPath(relativePathInput) {
        let varDef = await getVariable(getVarID(self.docId, self.varName));
        self.baseDir = await resolveDocBaseDir(varDef?.docPath);
        self.relativePath = relativePathInput;
        self.path = path.resolve(self.baseDir, self.relativePath);
    }

    self.init = async function(relativePathInput) {
        if (typeof relativePathInput !== "string" || relativePathInput.trim().length === 0) {
            throw new Error("Invalid Folder init path. Expected a non-empty string relative path");
        }
        await resolveAndSetPath(relativePathInput.trim());
    }

    self.reinit = async function(relativePathInput) {
        if (typeof relativePathInput !== "string" || relativePathInput.trim().length === 0) {
            throw new Error("Invalid Folder reinit path. Expected a non-empty string relative path");
        }
        await resolveAndSetPath(relativePathInput.trim());
    }

    self.restore = async function(JSONSerialisation) {
        if (!JSONSerialisation) {
            return;
        }
        self.baseDir = JSONSerialisation.baseDir || self.baseDir;
        self.relativePath = JSONSerialisation.relativePath || self.relativePath;
        self.path = JSONSerialisation.path || self.path;
        self.snapshots = JSONSerialisation.snapshots || {};
    }

    self.newer = async function(inputValues, parsedCommand, currentDocId, graph, buildInstance, docPath) {
        let outputVarId = getVarID(currentDocId, parsedCommand.outputVars[0]);
        if (!inputValues || inputValues.length !== 1) {
            await updateErrorInfo(outputVarId, "Invalid Folder.newer call. Expected exactly one path argument");
            return undefined;
        }

        let inputPath = inputValues[0];
        if (typeof inputPath !== "string" || inputPath.trim().length === 0) {
            await updateErrorInfo(outputVarId, "Invalid Folder.newer call. Path must be a non-empty string");
            return undefined;
        }

        let baseDir = self.baseDir;
        if (docPath) {
            baseDir = await resolveDocBaseDir(docPath);
        }

        let absolutePath = path.resolve(baseDir, inputPath.trim());
        let currentSnapshot = await buildFolderSnapshot(absolutePath);
        let previousSnapshot = self.snapshots[absolutePath];
        let changed = previousSnapshot === undefined ? true : !sameValue(previousSnapshot, currentSnapshot);
        self.snapshots[absolutePath] = currentSnapshot;
        return changed;
    }
}

$$.registerCustomType("Folder", Folder);
