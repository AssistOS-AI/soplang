import {createDiscovery} from "../src/achillesSkills/discovery.js";

const sanitizeName = (value) => {
    if (!value) {
        return "unknown";
    }
    return value.replace(/[^A-Za-z0-9_]/g, "_");
};

function formatRecord(record) {
    return {
        agent: record.agent,
        agentPath: record.agentPath,
        skill: record.skill,
        command: `${sanitizeName(record.agent)}.${sanitizeName(record.skill)}`,
        definitionFiles: record.definitionFiles,
        skillPath: record.skillPath,
    };
}

async function AchillesSkills() {
    let self = {};
    const workspace = $$.loadPlugin("Workspace");
    const discovery = createDiscovery({
        reposRoot: process.env.SOPLANG_REPOS_ROOT,
    });
    const registeredSkillCommands = new Set();
    let staticCommandsRegistered = false;

    const registerStaticCommands = () => {
        if (staticCommandsRegistered) {
            return;
        }
        staticCommandsRegistered = true;

        workspace.registerCommand("skills.list", async () => {
            return discovery.list().map(formatRecord);
        });

        workspace.registerCommand("skills.forAgent", async (inputValues) => {
            const targetAgent = inputValues?.[0];
            if (!targetAgent) {
                return [];
            }
            return discovery.listByAgent(targetAgent).map(formatRecord);
        });

        workspace.registerCommand("skills.reposRoot", async () => {
            return discovery.getReposRoot();
        });

        workspace.registerCommand("skills.reload", async () => {
            await discovery.reload();
            registerSkillCommands();
            return discovery.list().length;
        });
    };

    const registerSkillCommands = () => {
        const records = discovery.list();
        for (const record of records) {
            const commandName = `${sanitizeName(record.agent)}.${sanitizeName(record.skill)}`;
            if (registeredSkillCommands.has(commandName)) {
                continue;
            }
            workspace.registerCommand(commandName, async () => formatRecord(record));
            registeredSkillCommands.add(commandName);
        }
    };

    await discovery.reload();
    registerStaticCommands();
    registerSkillCommands();

    self.listSkills = function () {
        return discovery.list();
    };

    self.reloadSkills = async function () {
        await discovery.reload();
        registerSkillCommands();
        return discovery.list();
    };

    self.getReposRoot = function () {
        return discovery.getReposRoot();
    };

    return self;
}

let singletonInstance = undefined;

export async function getInstance() {
    if (!singletonInstance) {
        singletonInstance = await AchillesSkills();
    }
    return singletonInstance;
}

export function getAllow() {
    return async function () {
        return true;
    };
}

export function getDependencies() {
    return ["Workspace"];
}
