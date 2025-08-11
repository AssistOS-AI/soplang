import fs from "fs";
import path from "path";
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
import constants from "../src/util/constants.js"
async function LLM() {
    const self = {};
    self.providers = {};

    const loadProviderModule = (providerPath) => {
        try {
            return require(providerPath);
        } catch (e) {
            throw Error(`Cannot load provider module at path ${providerPath}: ${e.message}`);
        }
    };
    async function registerProviders(dirPath) {
        const providerFiles = fs.readdirSync(dirPath)
            .filter(file => file.endsWith('.js') || file.endsWith('.cjs')) // Support both .js and .cjs files
            .map(file => path.join(dirPath, file));

        if (providerFiles.length === 0) {
            console.warn(`No provider files found in ${dirPath}`);
            return;
        }

        for (const providerFile of providerFiles) {
            try {
                const module = loadProviderModule(providerFile);
                // Use filename (without extension) as the provider name
                const name = path.basename(providerFile, path.extname(providerFile));
                self.providers[name] = module;
            } catch (error) {
                console.error(`Error loading provider from ${providerFile}: ${error.message}`);
            }
        }
    }

    if(process.env.LLM_PROVIDERS_FOLDER) {
        let providersPath = path.join(process.env.PERSISTENCE_FOLDER, process.env.LLM_PROVIDERS_FOLDER);
        await registerProviders(providersPath);
    } else {
        //this log makes tests fail in runAllTests.mjs
        //console.warn("LLM_PROVIDERS_FOLDER environment variable is not set, using soplang/tests/llms/providers");
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        await registerProviders(path.join(__dirname, "../tests/chat/providers"));
    }



    self.getProvider = function(providerName) {
        return self.providers[providerName];
    }
    self.getProviderModels = async function (providerName) {
        const provider = await self.getProvider(providerName);
        return provider.getModels();
    }
    self.getModels = async function () {
        let allModels = [];
        for (const providerName in self.providers) {
            const provider = self.providers[providerName];
            let models = await provider.getModels();
            for(let model of models) {
                model.providerName = providerName;
            }
            allModels = allModels.concat(models);
        }
        return allModels;
    }

    self.getTextResponse = async (providerName, model, prompt, options = {}) => {
        const Provider = await self.getProvider(providerName);
        return await Provider.getTextResponse(model, prompt, options);
    }

    self.getTextStreamingResponse = async (providerName, model, prompt, options = {}, onDataChunk) => {
        const Provider = await self.getProvider(providerName)
        return await Provider.getTextStreamingResponse(model, prompt, options, onDataChunk);
    }

    self.getChatCompletionResponse = async (providerName, model, chatHistory, options = {}) => {
        const Provider = await self.getProvider(providerName)
        return await Provider.getChatCompletionResponse(model, chatHistory, options, constants);
    }

    self.getChatCompletionStreamingResponse = async (providerName, model, chatHistory, options = {}, onDataChunk) => {
        const Provider = await self.getProvider(providerName);
        return await Provider.getChatCompletionStreamingResponse(model, chatHistory, options, onDataChunk);
    }
    self.getTextResponseJson = (providerName, model, prompt, options = {}) =>
        self.getTextResponse(providerName, model, prompt, {...options, json: true})

    self.getTextStreamingResponseJson = (providerName, model, prompt, options = {}, onDataChunk) =>
        self.getTextStreamingResponse(providerName, model, prompt, {...options, json: true}, onDataChunk)

    self.getChatCompletionResponseJson = (providerName, model, messages, options = {}) =>
        self.getChatCompletionResponse(providerName, model, messages, {...options, json: true})

    self.getChatCompletionStreamingResponseJson = (providerName, model, messages, options = {}, onDataChunk) =>
        self.getChatCompletionStreamingResponse(providerName, model, messages, {...options, json: true}, onDataChunk)

    return self;
}
let singletonInstance;

const getInstance = async function () {
    if (!singletonInstance) {
        singletonInstance = await LLM();
    }
    return singletonInstance;
}
const getAllow = function () {
    return async function (globalUserId, email, command, ...args) {
        return true;
    }
}
const getDependencies = function () {
    return ["DefaultPersistence"];
}
export {
    getInstance,
    getAllow,
    getDependencies
}