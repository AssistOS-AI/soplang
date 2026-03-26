import path from "path";
import fsPromises from "fs/promises";

async function CodeManager() {
    const self = {};
    const scriptsCache = new Map();

    function getScriptsPath(appName) {
        let root = process.env.SERVERLESS_ROOT_FOLDER || process.cwd();
        return path.join(root, "applications", appName, "chat-scripts");
    }

    function getScriptKey(appName, scriptName) {
        return `${appName}/${scriptName}`;
    }

    async function readScriptFromDisk(appName, scriptName) {
        let scriptsPath = getScriptsPath(appName);
        let scriptPath = path.join(scriptsPath, `${scriptName}.sop`);
        return await fsPromises.readFile(scriptPath, "utf8");
    }

    async function writeScriptToDisk(appName, scriptName, content) {
        let scriptsPath = getScriptsPath(appName);
        await fsPromises.mkdir(scriptsPath, { recursive: true });
        let scriptPath = path.join(scriptsPath, `${scriptName}.sop`);
        await fsPromises.writeFile(scriptPath, content);
    }

    self.getChatScript = async function (appName, scriptName) {
        try {
            return await readScriptFromDisk(appName, scriptName);
        } catch (error) {
            let cached = scriptsCache.get(getScriptKey(appName, scriptName));
            if (cached !== undefined) {
                return cached;
            }
            throw new Error(`Chat ${scriptName} does not exist`);
        }
    };

    self.getChatScriptPath = async function (appName, scriptName) {
        let scriptsPath = getScriptsPath(appName);
        let scriptPath = path.join(scriptsPath, `${scriptName}.sop`);
        try {
            await fsPromises.access(scriptPath);
            return scriptPath;
        } catch (error) {
            let cached = scriptsCache.get(getScriptKey(appName, scriptName));
            if (cached !== undefined) {
                return scriptPath;
            }
            throw new Error(`Chat ${scriptName} does not exist`);
        }
    };

    self.saveChatScript = async function (appName, scriptName, content, newName) {
        if (newName) {
            scriptName = newName;
        }
        scriptsCache.set(getScriptKey(appName, scriptName), content);
        await writeScriptToDisk(appName, scriptName, content);
    };

    self.listChatScripts = async function () {
        let root = process.env.SERVERLESS_ROOT_FOLDER || process.cwd();
        let appsPath = path.join(root, "applications");
        let scripts = [];
        try {
            let appsDirs = await fsPromises.readdir(appsPath);
            for (let appName of appsDirs) {
                let chatScriptsPath = path.join(appsPath, appName, "chat-scripts");
                let scriptNames;
                try {
                    scriptNames = await fsPromises.readdir(chatScriptsPath);
                } catch (e) {
                    continue;
                }
                for (let scriptName of scriptNames) {
                    if (scriptName.endsWith(".sop")) {
                        scriptName = scriptName.slice(0, -4);
                    }
                    scripts.push({ scriptName, appName });
                }
            }
        } catch (error) {
        }
        if (scripts.length === 0 && scriptsCache.size > 0) {
            for (let key of scriptsCache.keys()) {
                let [appName, scriptName] = key.split("/");
                scripts.push({ scriptName, appName });
            }
        }
        return scripts;
    };

    self.getPublicMethods = function () {
        return [];
    };

    return self;
}

let singletonInstance;

export async function getInstance() {
    if (!singletonInstance) {
        singletonInstance = await CodeManager();
    }
    return singletonInstance;
}

export function getAllow() {
    return async function () {
        return true;
    };
}

export function getDependencies() {
    return [];
}
