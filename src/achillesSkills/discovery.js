import fs from "node:fs/promises";
import path from "node:path";

function getDefaultReposRoot() {
    if (process.env.SOPLANG_REPOS_ROOT) {
        return process.env.SOPLANG_REPOS_ROOT;
    }
    if (process.env.SOPLANG_TOOL_DIR) {
        return path.resolve(process.env.SOPLANG_TOOL_DIR, "..", "repos");
    }
    return path.resolve(process.cwd(), "..", "repos");
}

const DEFAULT_EXCLUDES = new Set(["node_modules", ".git", ".svn"]);

async function safeReadDir(targetPath) {
    try {
        return await fs.readdir(targetPath, {withFileTypes: true});
    } catch (error) {
        return [];
    }
}

async function collectSkillRecords(agentName, achillesDir, reposRoot) {
    const records = [];
    const skills = await safeReadDir(achillesDir);
    for (const skillEntry of skills) {
        if (!skillEntry.isDirectory()) {
            continue;
        }
        const skillDir = path.join(achillesDir, skillEntry.name);
        const files = await safeReadDir(skillDir);
        const definitionFiles = files
            .filter(item => item.isFile() && item.name.endsWith(".md"))
            .map(item => item.name)
            .sort();
        records.push({
            agent: agentName,
            agentPath: path.relative(reposRoot, path.dirname(achillesDir)) || agentName,
            skill: skillEntry.name,
            skillPath: skillDir,
            definitionFiles,
        });
    }
    return records;
}

async function scanRepoDirectory(repoPath, agentName, reposRoot) {
    const records = [];
    const queue = [repoPath];
    while (queue.length > 0) {
        const currentDir = queue.shift();
        const entries = await safeReadDir(currentDir);
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            if (DEFAULT_EXCLUDES.has(entry.name)) {
                continue;
            }
            const entryPath = path.join(currentDir, entry.name);
            if (entry.name === ".AchillesSkills") {
                const skillRecords = await collectSkillRecords(agentName, entryPath, reposRoot);
                records.push(...skillRecords);
                continue;
            }
            queue.push(entryPath);
        }
    }
    return records;
}

async function scanReposRoot(reposRoot) {
    const results = [];
    const repoEntries = await safeReadDir(reposRoot);
    for (const entry of repoEntries) {
        if (!entry.isDirectory()) {
            continue;
        }
        const repoPath = path.join(reposRoot, entry.name);
        const repoRecords = await scanRepoDirectory(repoPath, entry.name, reposRoot);
        results.push(...repoRecords);
    }
    return results;
}

export class AchillesSkillsDiscovery {
    constructor(options = {}) {
        this.reposRoot = options.reposRoot || getDefaultReposRoot();
        this._skills = [];
        this._loaded = false;
    }

    async reload() {
        this._skills = await scanReposRoot(this.reposRoot);
        this._loaded = true;
        return this._skills;
    }

    list() {
        if (!this._loaded) {
            return [];
        }
        return this._skills.slice();
    }

    listByAgent(agentName) {
        return this.list().filter(record => record.agent === agentName);
    }

    getReposRoot() {
        return this.reposRoot;
    }
}

export function createDiscovery(options = {}) {
    return new AchillesSkillsDiscovery(options);
}
