import path from "path";
import {promises as fsPromises} from "fs";

async function Agent() {
    let self = {};

    let persistence = $$.loadPlugin("DefaultPersistence")
    const chatRoom = $$.loadPlugin("ChatRoom");

    await persistence.configureTypes({
            agent: {
                id: "random",
                name: "string",
                description: "string",
                imageId: "string",
                chatPrompt: "string",
                contextSize: "integer",
                llms: "object",
                telegramBot: "any",
                info: "object",
            },
        /*
            //Most probable these will be just custom types that will be stored in normal variables
            VarSet: {
                id: "random",
                vars: "array string",
                executionStatuses: "dictionary with keys outputVars to vars versions",
            },
            Knowledge: {
                id: "random",
                documents: "array document"
            },
            Plan: {
                id: "random",
                docId: "string",//where the plan is represented
            },
            Context: {
                id: "random",
                questions: "array string",
                answers: "array string",
            },
            Fact: {
             id: "random",
             summary: "string",
             longText: "string",
             reference: "string",
             referenceURL: "string",
             authors: "array string",
            }*/
        }
    )
    await persistence.createIndex("agent", "name");

    self.getAgent = async function (id) {
        return await persistence.getAgent(id);
    }

    self.getAllAgents = async function () {
        return await persistence.getEveryAgent();
    }
    self.getAllAgentObjects = async function () {
        return await persistence.getEveryAgentObject();
    }

    self.createDefaultAgent = async function() {
        let agentPath = '../apihub-components/globalServerlessAPI/defaults/AssistantAgent.json';
        let agent = JSON.parse(await fsPromises.readFile(agentPath));
        return await self.createAgent(agent.name, agent.description, agent.chatPrompt)
    }

    self.updateAgent = async function (id, values) {
        return await persistence.updateAgent(id, values);
    }

    self.createAgent = async function (name, description, chatPrompt, imageId) {
        return await persistence.createAgent({
            name: name,
            description: description,
            imageId: imageId,
            llms: {},
            contextSize: 3,
            chatPrompt: chatPrompt || "You will be given instructions in the form of a string from a user and you need to execute them",
            telegramBot: null
        });
    }
    self.selectLLM = async function (agentName, llmType, llmName, provider){
        const agent = await persistence.getAgentByName(agentName);
        if(!agent.llms){
            agent.llms = {};
        }
        agent.llms[llmType] = {
            modelName: llmName,
            providerName: provider
        };
        await self.updateAgent(agent.id, agent);
        return agent;
    }

    self.deleteAgent = async function (id) {
        return await persistence.deleteAgent(id);
    }

    self.exportAgent = async function (id) {
        await $$.throwAsyncError("Exporting personalities is not supported yet");
        //import archiver from "archiver";
        let agent = await self.getAgent(id);
        const contentBuffer = Buffer.from(JSON.stringify(agent), 'utf-8');
        const archive = archiver('zip', {zlib: {level: 9}});
        const stream = new require('stream').PassThrough();
        archive.pipe(stream);
        archive.append(contentBuffer, {name: 'data.json'});
        archive.finalize();
        return stream;
    }
    self.importAgent = async function (extractedPath) {
        const agentPath = path.join(extractedPath, 'data.json');
        const fileContent = await fsPromises.readFile(agentPath, 'utf8');
        const agentData = await JSON.parse(fileContent);
        const agents = await self.getAllAgentObjects();
        const existingAgent = agents.find(ag => ag.name === agentData.name);

        let agentId, overwritten = false;
        if (existingAgent) {
            agentData.id = existingAgent.id;
            await self.updateAgent(existingAgent.id, agentData);
            overwritten = true;
        } else {
            const chatId = await chatRoom.createChat(agentData.name);
            let agent = await self.createAgent(agentData.name, agentData.description, chatId);
            await self.updateAgent(agent.id, agentData);
            agentId = agent.id;
        }
        return {id: agentId, overwritten: overwritten, name: agentData.name};
    }

    self.getAgentNames = async function () {
        return await persistence.getEveryAgentName();
    }
    return self;
}

let singletonInstance;

export async function getInstance() {
    if (!singletonInstance) {
        singletonInstance = await Agent();
    }
    return singletonInstance;
}

export function getAllow() {
    return async function (id, name, command, ...args) {
        return true;
    }
}

export function getDependencies() {
    return ["ChatRoom", 'LLM', 'DefaultPersistence'];
}
