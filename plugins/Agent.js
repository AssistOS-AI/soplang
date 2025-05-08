import path from "path";
import {promises as fsPromises} from "fs";

async function Agent() {
    let self = {};

    let persistence = await $$.loadPlugin("DefaultPersistence")
    const Chat = await $$.loadPlugin("Chat");
    const Llm = await $$.loadPlugin("LLM");

    await persistence.configureTypes({
            agent: {
                id: "random",
                name: "string",
                description: "string",
                imageId: "string",
                chatPrompt: "string",
                chats: "array document",
                contextSize: "integer",
                selectedChat: "string",
                selectedTextLlm: "llm",
                selectedChatLlm: "llm",
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

    self.copyDefaultAgents = async function (spacePath, spaceId) {
        let agentsFolder = '../apihub-components/globalServerlessAPI/default-agents';
        const files = await fsPromises.readdir(agentsFolder, {withFileTypes: true});

        let promises = [];
        for (const entry of files) {
            if (entry.isFile()) {
                promises.push(self.createAgentFromFile(agentsFolder, entry, spaceId));
            }
        }
        await Promise.all(promises);
    }

    self.updateAgent = async function (id, values) {
        return await persistence.updateAgent(id, values);
    }

    self.addChat = async function (id, chatId) {
        const agent = await self.getAgent(id);
        if (!agent.chats) {
            agent.chats = [];
        }
        agent.chats.push(chatId);
        agent.selectedChat = chatId;

        await self.updateAgent(agent.id, {...agent});
    }

    self.removeChatFromAgent = async function (agentId, chatId) {
        let agent = await self.getAgent(agentId);
        agent.chats = agent.chats.filter(c => c !== chatId);
        agent.selectedChat = agent.chats[0]
        await self.updateAgent(agent.id, {...agent});
    }
    self.createAgent = async function (name, description, chatPrompt, imageId) {
        const chatId = await Chat.createChat(name);
        return await persistence.createAgent({
            name: name,
            description: description,
            imageId: imageId,
            chats: [chatId],
            selectedChat: chatId,
            selectedChatLlm: null,
            selectedTextLlm: null,
            contextSize: 3,
            chatPrompt: chatPrompt || "You will be given instructions in the form of a string from a user and you need to execute them",
            telegramBot: null
        });

    }
    self.createAgentFromFile = async function (agentsFolder, entry) {
        const filePath = path.join(agentsFolder, entry.name);
        let agent = JSON.parse(await fsPromises.readFile(filePath, 'utf8'));
        agent.configuredLlms = [];
        let imagesPath = path.join(agentsFolder, 'images');
        let imageBuffer = await fsPromises.readFile(path.join(imagesPath, `${agent.imageId}.png`));

        //personality.imageId = await spaceModule.putImage(imageBuffer);
        return await self.createAgent(agent.name, agent.description, agent.chatPrompt)
    }

    self.deleteAgent = async function (id) {
        return await persistence.deleteAgent(id);
    }

    self.getConversationIds = async function (id) {
        const agent = await self.getAgent(id)
        return agent.chats;
    }

    self.getPersonalityImageUrl = async function (id) {
        const agent = await self.getAgent(id);
        const imageId = agent.imageId;
        //return await storage.getDownloadURL("image/png", imageId);
    }
    self.exportPersonality = async function (id) {
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
            const chatId = await Chat.createChat(agentData.name);
            let agent = await self.createAgent(agentData.name, agentData.description, chatId);
            await self.updateAgent(agent.id, agentData);
            agentId = agent.id;
        }
        return {id: agentId, overwritten: overwritten, name: agentData.name};
    }

    const getApiKey = async function (provider) {
        const API_KEYS = JSON.parse(process.env.API_KEYS)
        const keyTypes = Object.values(API_KEYS)
        const apiKey = keyTypes.find(obj => {
            return obj.name === provider;
        })
        return apiKey.value;
    }
    const getCurrentAgentChatLlm = async function (agentId) {
        const agent = await self.getAgent(agentId);
        if (!agent) {
            throw new Error("Agent not found");
        }
        return await Llm.getRandomLlm(agent.selectedChatLlm);
    }

    self.sendQuery = async function (chatId, personalityId, userId, userPrompt) {
        const checkApplyContextInstructions = async function (chatId, prompt) {
            const generateMemoizationPrompt = (prompt) => `
        **Role**: You have received a query from the user and you need to check if the user's query contains general instructions, preferences of any kind that should be remembered and applied to future queries.
        **Current Query to Address (Begins with "<" and ends with ">"**: <"${prompt}">
        **Instructions**: 
        - Check the user's query for any general instructions, preferences, or any other information that should be remembered and applied to future queries and make a concise list item for each instruction.
        - Each item to remember will be as concise as possible and will be a single sentence.
        - You will only consider instructions or preferences that you consider important and relevant to the user's future queries, with an aim to avoid false positives and overfilling the context with irrelevant information.
        **Output Format**:
        - Should always return a VALID JSON string with the following format:
        {"detectedPreferences": true/false, "preferences": ["preference1", "preference2", ...]}
        - In no circumstance should the output be null, undefined,contain any metadata, meta-information or meta-commentary
        **Output Examples**:
        Example1:
        "{ "detectedPreferences": true,
            "preferences": [
            "User wants to be called by their first name",
            "User prefers to receive emails instead of calls"
            ]
        }"
        Example2:
        "{"detectedPreferences": false,"preferences":[]"}"
        `;
            const addPreferencesToContext = async function (chatId, preferences) {
                const chat = await Workspace.getDocument(chatId);
                const contextChapter = chat.chapters.find(chapter => chapter.title === "Context");
                if (!contextChapter) {
                    throw new Error("Context chapter not found");
                }
                let promises = [];
                preferences.forEach((preference, index) => {
                    promises.push(Workspace.createParagraph(contextChapter.id, preference, {replay: {role: "assistant"}}, {}, index + contextChapter.paragraphs.length));
                });

                return await Promise.all(promises);
            }

            const llmRes = await Llm.generateText(generateMemoizationPrompt(prompt));

            let parsedLlmAnswer;
            try {
                parsedLlmAnswer = JSON.parse(llmRes);
            } catch (error) {
                throw new Error("Error parsing LLM response: " + error.message);

            }
            if (parsedLlmAnswer.detectedPreferences) {
                if (Array.isArray(parsedLLMAnswer.preferences)) {
                    return await addPreferencesToContext(chatId, parsedLLMAnswer.preferences);
                } else {
                    throw new Error("Llm response object does not contain preferences property or is not an array");
                }
            } else {
                throw new Error("Llm response object does not contain detectedPreferences property");
            }
        }

        const applyChatPrompt = function (chatPrompt, userPrompt, context, personalityDescription) {
            return `${chatPrompt}
            **Your Identity**
            ${personalityDescription}
            **Previous Conversation**
            ${context.messages.map(message => `${message.commands?.replay?.role || "Unknown"} : ${message.text}`).join('\n')}
            **Conversation Context**
            ${context.context.map(contextItem => contextItem.text).join('\n')}
            **Current Query to Address**:
            ${userPrompt}
    `;
        }

        const buildContext = async function (chatId, agentId) {
            const chat = await Chat.getChat(chatId);

            const {chatPrompt, contextSize} = await self.getAgent(agentId);

            const contextChapter = chat.chapters.find(chapter => chapter.title === "Context");
            const messagesChapter = chat.chapters.find(chapter => chapter.title === "Messages");

            const context = {
                messages: messagesChapter?.paragraphs.slice(-contextSize, messagesChapter.paragraphs.length) || [],
                context: contextChapter ? chat.chapters[1].paragraphs : []
            }
            return context;
        }

        let {chatPrompt, description} = await self.getAgent(personalityId);

        const context = buildContext(chatId, personalityId);

        const combinedQueryPrompt = applyChatPrompt(chatPrompt, userPrompt, context, description);

        const llmRes = await Llm.generateText(combinedQueryPrompt)

        const message = await self.sendMessage(chatId, userId, llmRes, "assistant");

        await checkApplyContextInstructions(chatId, userPrompt, userId);
        return message;
    }
    self.sendStreamingQuery = async function (chatId, personalityId, userId, userPrompt) {
        return self.sendQuery(chatId, personalityId, userId, userPrompt);
    }


    self.sendChatQuery = async function (chatId, agentId, userId, prompt) {
        const userMessage = await Chat.sendMessage(chatId, userId, prompt, "user");

        const model = await getCurrentAgentChatLlm(agentId);
        const apiKey = await getApiKey(model.provider);

        const llmResponse = await Llm.getChatCompletionResponse({
            provider: model.provider,
            model: model.name,
            apiKey,
            messages: prompt
        })
        const message = await Chat.sendMessage(chatId, agentId, llmResponse, "assistant");
        return {
            id: message.id
        };
    }
    self.sendChatStreamingQuery = async function (chatId, personalityId, userId, userPrompt) {
        return await self.sendChatQuery(chatId, personalityId, userId, userPrompt);
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
    return ["Chat", 'LLM', 'DefaultPersistence'];
}
