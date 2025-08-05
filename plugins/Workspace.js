import {createVarsGraph} from "../src/graph/VarsGraph.js";
import {createRegistry} from "../src/graph/CommandsRegistry.js";
import '../src/util/debugUtil.js';
import {promises as fsPromises} from "fs";
import path from "path";

const ROLES = {
    ADMIN: "admin",
    MEMBER: "member",
    GUEST: "guest",
}

const customTypeRegistry = await import("../src/graph/customTypeRegistry.js");


async function Workspace() {
    let self = {};
    let persistence = $$.loadPlugin("DefaultPersistence");
    let Email = $$.loadPlugin("EmailPlugin");
    let WorkspaceUser = $$.loadPlugin("WorkspaceUser");
    const ChatScript = await $$.loadPlugin("ChatScript");
    await persistence.configureTypes({
        webAssistant: {
            id: "singleton webAssistant",
            alias: "string",
            scripts: "array chatScript",
            scriptsWidgetMap: `object`,
            settings: "object",
            chats: "object"
        },
        theme: {
            name: "string",
            description: "string",
            css: "any",
            variables: "object"
        },
        page: {
            name: "string",
            description: "string",
            chatSize: "string",
            widget: "string",
            data: "string",
            role: "string",
            generalSettings: "string",
            css: "",
            html: "",
            js: ""
        },
        menuItem: {
            name: "string",
            description: "string",
            targetPage: "string",
            location: "string",
            icon: "string"
        }
    })
    let commandsRegistry = await createRegistry(self);
    let graph = await createVarsGraph(commandsRegistry);

    self.getGraph = function () {
        return graph;
    }

    self.buildAll = async function () {
        return await graph.buildAll();
    }

    self.buildOnlyForDocument = async function (docId) {
        return await graph.buildOnlyForDocument(docId);
    }

    self.getBuildErrors = function () {
        throw new Error("Not implemented");
    }

    self.getVarValue = async function (documentId, variableName) {
        return await graph.getVarValue(documentId, variableName);
    }
    self.getVariablesForDoc = async function (docId) {
        let variables = await persistence.getVariablesObjectsByDocId(docId);
        for (let variable of variables) {
            variable.value = await graph.getVarValue(docId, variable.varName);
        }
        return variables;
    }
    self.getEveryVariableObject = async function () {
        return await persistence.getEveryVariableObject();
    }
    self.setVarValue = async function (documentId, variableName, value) {
        return await graph.setVarValue(documentId, variableName, value);
    }

    self.registerCommand = function (commandName, commandFunction) {
        commandsRegistry.addCommand(commandName, commandFunction);
    }
    self.getCustomTypes = async function () {
        return customTypeRegistry.getTypes();
    }
    self.getCommands = async function () {
        return graph.getCommands();
    }
    self.getDocCommandsParsed = async function (docId) {
        return await graph.getDocCommandsParsed(docId);
    }

    self.runMacro = async function (docId, scriptName, ...args) {
        return await graph.runMacro(docId, scriptName, ...args);
    }

    self.runCode = async function (code, ...args) {
        return await graph.runCode(code, ...args);
    }


    self.insertCode = async function (docId, code) {
        return await graph.insertCode(docId, code);
    }

    self.createWorkspace = async function (workspaceName, ownerId, spaceGlobalId) {
        async function addDefaultWebAssistantThemes() {
            const defaultThemes = [
                {
                    name: "Ubuntu Theme",
                    description: "A theme inspired by the Ubuntu operating system.",
                    variables: {
                        '--bg': '#333333',
                        '--bg-secondary': '#444444',
                        '--text': '#ffffff',
                        '--text-secondary': '#cccccc',
                        '--primary': '#dd4814',
                        '--primary-hover': '#b83b10',
                        '--accent': '#77216f',
                        '--danger': '#dc3545',
                        '--success': '#28a745',
                        '--warning': '#ffc107',
                        '--focus-ring': '#dd4814',
                        '--disabled-bg': '#555555',
                        '--disabled-text': '#999999',
                        '--link-color': '#dd4814',
                        '--link-hover': '#b83b10',
                        '--font-family': 'Ubuntu',
                        '--font-size': '16px',
                        '--heading-font-size': '26px',
                        '--padding': '18px',
                        '--margin': '18px',
                        '--border-color': '#555555',
                        '--border-radius': '6px',
                        '--button-radius': '4px',
                        '--container-max-width': '1280px',
                        '--gap': '1.2rem'
                    },
                    css: `
            /* Custom CSS for Ubuntu Theme */
            body {
                font-smooth: antialiased;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
        `
                },
                {
                    name: "Windows 11 Theme",
                    description: "A clean and modern theme inspired by Windows 11.",
                    variables: {
                        '--bg': '#f3f3f3',
                        '--bg-secondary': '#ffffff',
                        '--text': '#000000',
                        '--text-secondary': '#605e5c',
                        '--primary': '#0078d4',
                        '--primary-hover': '#005ea2',
                        '--accent': '#107c10',
                        '--danger': '#d13438',
                        '--success': '#107c10',
                        '--warning': '#ffc83b',
                        '--focus-ring': '#0078d4',
                        '--disabled-bg': '#e9e9e9',
                        '--disabled-text': '#a8a8a8',
                        '--link-color': '#0078d4',
                        '--link-hover': '#005ea2',
                        '--font-family': 'Segoe UI',
                        '--font-size': '15px',
                        '--heading-font-size': '22px',
                        '--padding': '14px',
                        '--margin': '14px',
                        '--border-color': '#e0e0e0',
                        '--border-radius': '4px',
                        '--button-radius': '2px',
                        '--container-max-width': '1360px',
                        '--gap': '0.8rem'
                    },
                    css: `
            /* Custom CSS for Windows 11 Theme */
            button {
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
        `
                },
                {
                    name: "Halloween Theme",
                    description: "A spooky theme perfect for Halloween!",
                    variables: {
                        '--bg': '#1a1a1a',
                        '--bg-secondary': '#2e0000',
                        '--text': '#ffa500', /* Orange */
                        '--text-secondary': '#cc5500',
                        '--primary': '#8b0000', /* Dark Red */
                        '--primary-hover': '#660000',
                        '--accent': '#4b0082', /* Indigo */
                        '--danger': '#ff0000',
                        '--success': '#32cd32', /* Lime Green */
                        '--warning': '#ff8c00', /* Dark Orange */
                        '--focus-ring': '#ffa500',
                        '--disabled-bg': '#333333',
                        '--disabled-text': '#666666',
                        '--link-color': '#ffa500',
                        '--link-hover': '#cc5500',
                        '--font-family': 'Creepster',
                        '--font-size': '18px',
                        '--heading-font-size': '30px',
                        '--padding': '20px',
                        '--margin': '20px',
                        '--border-color': '#8b0000',
                        '--border-radius': '0px',
                        '--button-radius': '0px',
                        '--container-max-width': '1000px',
                        '--gap': '1.5rem'
                    },
                    css: `
            /* Custom CSS for Halloween Theme */
            body {
                background-image: url('[https://www.transparenttextures.com/patterns/dark-fish-skin.png](https://www.transparenttextures.com/patterns/dark-fish-skin.png)');
                background-repeat: repeat;
            }
            .theme-var-label {
                text-shadow: 1px 1px 2px black;
            }
        `
                },
                {
                    name: "Dark Mode",
                    description: "A sleek, dark theme for reduced eye strain.",
                    variables: {
                        '--bg': '#1e1e1e',
                        '--bg-secondary': '#2c2c2c',
                        '--text': '#e0e0e0',
                        '--text-secondary': '#a0a0a0',
                        '--primary': '#8a2be2', /* Blue Violet */
                        '--primary-hover': '#6a1eb8',
                        '--accent': '#00bcd4', /* Cyan */
                        '--danger': '#ff6b6b',
                        '--success': '#5cb85c',
                        '--warning': '#ffeb3b',
                        '--focus-ring': '#8a2be2',
                        '--disabled-bg': '#3a3a3a',
                        '--disabled-text': '#6a6a6a',
                        '--link-color': '#8a2be2',
                        '--link-hover': '#6a1eb8',
                        '--font-family': 'Inter',
                        '--font-size': '16px',
                        '--heading-font-size': '24px',
                        '--padding': '16px',
                        '--margin': '16px',
                        '--border-color': '#444444',
                        '--border-radius': '8px',
                        '--button-radius': '6px',
                        '--container-max-width': '1200px',
                        '--gap': '1rem'
                    },
                    css: `
            /* Custom CSS for Dark Mode */
            body {
                color-scheme: dark;
            }
        `
                },
                {
                    name: "Light Mode",
                    description: "A bright and airy theme for maximum clarity.",
                    variables: {
                        '--bg': '#ffffff',
                        '--bg-secondary': '#f5f5f5',
                        '--text': '#000000',
                        '--text-secondary': '#6c757d',
                        '--primary': '#007bff',
                        '--primary-hover': '#0056b3',
                        '--accent': '#17a2b8',
                        '--danger': '#dc3545',
                        '--success': '#28a745',
                        '--warning': '#ffc107',
                        '--focus-ring': '#66afe9',
                        '--disabled-bg': '#e9ecef',
                        '--disabled-text': '#adb5bd',
                        '--link-color': '#007bff',
                        '--link-hover': '#0056b3',
                        '--font-family': 'Lato',
                        '--font-size': '16px',
                        '--heading-font-size': '24px',
                        '--padding': '16px',
                        '--margin': '16px',
                        '--border-color': '#dee2e6',
                        '--border-radius': '8px',
                        '--button-radius': '4px',
                        '--container-max-width': '1200px',
                        '--gap': '1rem'
                    },
                    css: `
            /* Custom CSS for Light Mode */
            body {
                color-scheme: light;
            }
        `
                },
                {
                    name: "High Contrast Theme",
                    description: "A theme with high contrast for accessibility.",
                    variables: {
                        '--bg': '#000000',
                        '--bg-secondary': '#000000',
                        '--text': '#ffff00', /* Bright Yellow */
                        '--text-secondary': '#ffffff',
                        '--primary': '#00ff00', /* Bright Green */
                        '--primary-hover': '#00cc00',
                        '--accent': '#ff00ff', /* Magenta */
                        '--danger': '#ff0000',
                        '--success': '#00ff00',
                        '--warning': '#ffff00',
                        '--focus-ring': '#ffffff',
                        '--disabled-bg': '#333333',
                        '--disabled-text': '#aaaaaa',
                        '--link-color': '#00ffff', /* Cyan */
                        '--link-hover': '#00aaaa',
                        '--font-family': 'Arial',
                        '--font-size': '18px',
                        '--heading-font-size': '28px',
                        '--padding': '12px',
                        '--margin': '12px',
                        '--border-color': '#ffffff',
                        '--border-radius': '0px',
                        '--button-radius': '0px',
                        '--container-max-width': '100%',
                        '--gap': '0.5rem'
                    },
                    css: `
            /* Custom CSS for High Contrast Theme */
            * {
                border: 2px solid var(--border-color) !important;
                box-shadow: none !important;
                text-shadow: none !important;
            }
            a:focus, button:focus, input:focus, select:focus, textarea:focus {
                outline: 5px solid var(--focus-ring) !important;
                outline-offset: 2px;
            }
        `
                }
            ];
            for (const theme of defaultThemes) {
                await persistence.createTheme(theme);
            }
        }

        async function addDefaultWidgets() {
            const defaultWidgets = [
                {
                    name: "Control Room Load Room",
                    description: "Widget to load a specific chat room.",
                    widget: "assistOS/select-chat",
                    chatSize: "50",
                    role: "load",
                    generalSettings: "",
                    data: "",
                    html: "",
                    css: "",
                    js: ""
                },
                {
                    name: "Control Room New Room",
                    description: "A widget to create a chat room",
                    widget: "assistOS/create-chat",
                    chatSize: "50",
                    role: "new",
                    generalSettings: "",
                    data: "",
                    html: "",
                    css: "",
                    js: ""
                },
                {
                    name: "AssistOS About Us Page",
                    description: "A dedicated page to inform users about your organization.",
                    widget: "assistOS/about-us",
                    chatSize: "50",
                    role: "page",
                    generalSettings: JSON.stringify({
                        title: "About Our Company",
                        showMissionStatement: true
                    }, null, 2),
                    data: JSON.stringify({
                        companyName: "Your Awesome Company",
                        foundingYear: "2020",
                        mission: "To provide the best solutions for our customers."
                    }, null, 2),
                    html: `<div><h1>About Us Placeholder</h1><p>Learn more about our company and mission here.</p></div>`,
                    css: `/* Test CSS for About Us Widget */.about-section { background-color: var(--bg-secondary); padding: 30px; }`,
                    js: `// Test JS for About Us Widget console.log('About Us widget placeholder loaded.');`
                },
                {
                    name: "AssistOS Modal Widget",
                    description: "A versatile modal dialog for displaying content.",
                    widget: "assistOS/modal-widget",
                    chatSize: "50",
                    role: "page",
                    generalSettings: JSON.stringify({
                        title: "Welcome Modal",
                        showCloseButton: true,
                        backdropDismiss: true
                    }, null, 2),
                    data: JSON.stringify({
                        content: "This is a placeholder for your modal content."
                    }, null, 2),
                    html: `<div><h1>Modal Content Area</h1><p>This is where your modal's main content would go.</p></div>`,
                    css: `/* Test CSS for Modal Widget */.modal-content { border: 1px solid blue; padding: 20px; }`,
                    js: `// Test JS for Modal Widget console.log('Modal widget placeholder loaded.');`
                },
                {
                    name: "AssistOS Text Widget",
                    description: "A simple widget for displaying blocks of text.",
                    widget: "assistOS/text-widget",
                    chatSize: "0",
                    role: "page",
                    generalSettings: JSON.stringify({
                        heading: "Important Information",
                        alignment: "left"
                    }, null, 2),
                    data: JSON.stringify({
                        text: "This is a basic text widget. You can use it to display paragraphs, instructions, or any general textual content on your page."
                    }, null, 2),
                    html: `<div><h2>Placeholder Text</h2><p>This paragraph serves as a basic example of text content.</p></div>`,
                    css: `/* Test CSS for Text Widget */.text-block { font-family: var(--font-family); color: var(--text); }`,
                    js: `// Test JS for Text Widget console.log('Text widget placeholder loaded.');`
                },
                {
                    name: "AssistOS Blog Widget",
                    description: "Displays a list of blog posts or articles.",
                    widget: "assistOS/blog-widget",
                    chatSize: "30",
                    role: "page",
                    generalSettings: JSON.stringify({
                        postsToShow: 3,
                        showReadMoreButton: true
                    }, null, 2),
                    data: JSON.stringify({
                        blogPosts: [
                            {title: "First Post", summary: "Summary of the first post."},
                            {title: "Second Post", summary: "Summary of the second post."}
                        ]
                    }, null, 2),
                    html: `<div><h3>Recent Blog Posts</h3><ul><li>Post 1</li><li>Post 2</li></ul></div>`,
                    css: `/* Test CSS for Blog Widget */.blog-list { list-style: none; } .blog-item { margin-bottom: 15px; }`,
                    js: `// Test JS for Blog Widget console.log('Blog widget placeholder loaded.');`
                },
                {
                    name: "AssistOS Contact Widget",
                    description: "A form for users to get in touch with you.",
                    widget: "assistOS/contact-widget",
                    chatSize: "0",
                    role: "page",
                    generalSettings: JSON.stringify({
                        formTitle: "Send us a message",
                        successMessage: "Message sent successfully!"
                    }, null, 2),
                    data: JSON.stringify({
                        recipientEmail: "contact@example.com",
                        phone: "+40 123 456 789"
                    }, null, 2),
                    html: `<form><h4>Contact Form Placeholder</h4><input type="text" placeholder="Name"><button>Submit</button></form>`,
                    css: `/* Test CSS for Contact Widget */.contact-form input, .contact-form button { display: block; margin-bottom: 10px; }`,
                    js: `// Test JS for Contact Widget console.log('Contact widget placeholder loaded.');`
                },
                {
                    name: "AssistOS Pricing Widget",
                    description: "Showcases different pricing plans or tiers.",
                    widget: "assistOS/pricing-widget",
                    chatSize: "0",
                    role: "page",
                    generalSettings: JSON.stringify({
                        currency: "RON",
                        buttonText: "Sign Up"
                    }, null, 2),
                    data: JSON.stringify({
                        plans: [
                            {name: "Basic", price: "99", features: ["Feature A", "Feature B"]},
                            {name: "Pro", price: "199", features: ["All Basic", "Feature C"]}
                        ]
                    }, null, 2),
                    html: `<div><h2>Pricing Plans Placeholder</h2><p>See our flexible pricing options.</p></div>`,
                    css: `/* Test CSS for Pricing Widget */.pricing-card { border: 1px solid var(--border-color); padding: 20px; text-align: center; }`,
                    js: `// Test JS for Pricing Widget console.log('Pricing widget placeholder loaded.');`
                },
                {
                    name: "AssistOS Privacy Widget",
                    description: "Displays your privacy policy or related information.",
                    widget: "assistOS/privacy-widget",
                    chatSize: "0",
                    role: "page",
                    generalSettings: JSON.stringify({
                        title: "Privacy Policy",
                        lastUpdated: "2025-07-24"
                    }, null, 2),
                    data: JSON.stringify({
                        policyText: "This is a placeholder for your detailed privacy policy text. It would typically be a long string of legal content."
                    }, null, 2),
                    html: `<div><h3>Privacy Policy Placeholder</h3><p>Your privacy is important to us.</p></div>`,
                    css: `/* Test CSS for Privacy Widget */.privacy-content { max-width: 800px; margin: 0 auto; line-height: 1.6; }`,
                    js: `// Test JS for Privacy Widget console.log('Privacy widget placeholder loaded.');`
                }
            ];
            const promises = [];

            for (const widget of defaultWidgets) {
                promises.push(persistence.createPage(widget));
            }
            return await Promise.all(promises);
        }

        async function addDefaultChatScript() {
            const scriptCode = "@history new Table from message timestamp role\n" +
                "@context new Table from message timestamp role\n" +
                "@currentUser := $arg1\n" +
                "@agentName := $arg2\n" +
                "@assistant new ChatAIAgent $agentName\n" +
                "@user new ChatUserAgent $currentUser\n" +
                "@chat new Chat $history $context $user $assistant\n" +
                "\n" +
                "context.upsert system [ assistant.getSystemPrompt ] \"\" system\n" +
                "@newReply macro reply ~history ~context ~chat ~assistant\n" +
                "    @res history.upsert $reply\n" +
                "    context.upsert $res\n" +
                "    chat.notify $res\n" +
                "    return $res\n" +
                "end"
            const name = "DefaultChatScript"
            const description = "Default chat script for web assistants";
            return await ChatScript.createChatScript(name, scriptCode, description);
        }

        async function addDefaultControlRoomScript() {
            const name = "DefaultControlRoomScript";
            const description = "Default control room script for web assistants";
            const scriptCode = "@history new Table from message timestamp role\n" +
                "@context new Table from message timestamp role\n" +
                "@currentUser := $arg1\n" +
                "@agentName := $arg2\n" +
                "@assistant new ChatAIAgent $agentName\n" +
                "@user new ChatUserAgent $currentUser\n" +
                "@chat new Chat $history $context $user $assistant\n" +
                "\n" +
                "context.upsert system [ assistant.getSystemPrompt ] \"\" system\n" +
                "@newReply macro reply ~history ~context ~chat ~assistant\n" +
                "    @res history.upsert $reply\n" +
                "    context.upsert $res\n" +
                "    chat.notify $res\n" +
                "    return $res\n" +
                "end"
            return await ChatScript.createChatScript(name, scriptCode, description);
        }

        const script = await addDefaultChatScript();
        const controlRoomScript = await addDefaultControlRoomScript();

        const assistant = await persistence.createWebAssistant(
            {
                chats: {},
                scripts: [script.id, controlRoomScript.id],
                scriptsWidgetMap: {},
                settings: {
                    header: "",
                    footer: "",
                    initialPrompt: "",
                    chatIndications: "",
                    agentId: "",
                    knowledge: "",
                    themeId: "",
                    authentication: "existingSpaceMembers",
                }
            })

        const widgets = await addDefaultWidgets();

        const webAssistant = await persistence.getWebAssistant(assistant.id);
        webAssistant.scriptsWidgetMap[controlRoomScript.id] = [widgets[0].id, widgets[1].id];
        await addDefaultWebAssistantThemes()

        return await persistence.createWorkspace({
            name: workspaceName,
            ownerId: ownerId,
            spaceGlobalId: spaceGlobalId,
            documents: [],
            webAssistant: assistant.id,
            clock: 0
        });
    }
    self.setCurrentChatId = async function (spaceId, chatId) {
        let spaceStatus = await persistence.getWorkspace(spaceId);
        spaceStatus.currentChatId = chatId;
        await persistence.updateWorkspace(spaceId, spaceStatus);
    }

    self.getCollaborators = async function () {
        return await WorkspaceUser.getAllUsers();
    }
    self.addCollaborators = async function (referrerEmail, collaborators, spaceName) {
        const users = await self.getCollaborators();
        let existingUserEmails = users.map(user => user.email);
        let existingCollaborators = [];
        for (let collaborator of collaborators) {
            if (existingUserEmails.includes(collaborator.email)) {
                existingCollaborators.push(collaborator.email);
                continue;
            }
            await WorkspaceUser.createUser(collaborator.email, collaborator.email, collaborator.role);
            if (process.env.NODE_ENV === 'development') {
                continue;
            }
            let subject = "You have been added to a space";
            let text = `You have been added to the space ${spaceName} by ${referrerEmail}`;
            let html = `<p>You have been added to the space ${spaceName} by ${referrerEmail}</p>`;
            await Email.sendEmail(collaborator.email, process.env.SENDGRID_SENDER_EMAIL, subject, text, html);
        }
        return existingCollaborators;
    }
    self.removeCollaborator = async function (email) {
        let allUsers = await self.getCollaborators();
        let user = await allUsers.find(user => user.email === email);
        if (user === ROLES.ADMIN) {
            let owners = self.getOwnersCount(allUsers);
            if (owners === 1) {
                return "Can't delete the last owner of the space";
            }
        }
        await WorkspaceUser.deleteUser(email);
    }
    self.setCollaboratorRole = async function (email, role) {
        let allUsers = await self.getCollaborators();
        let user = await allUsers.find(user => user.email === email);
        if (user === ROLES.ADMIN) {
            let owners = self.getOwnersCount(allUsers);
            if (owners === 1 && role !== ROLES.ADMIN) {
                return "Can't change the role of the last owner of the space";
            }
        }
        user.role = role;
        await WorkspaceUser.updateUser(user.id, user.email, user.displayName, role);
    }
    self.getOwnersCount = function (users) {
        let owners = 0;
        for (let id in users) {
            if (users[id].role === ROLES.ADMIN) {
                owners++;
            }
        }
        return owners;
    }

    self.getWorkspace = async function (globalId) {
        return await persistence.getWorkspace(globalId);
    }
    self.getWorkspaceInfo = async function (globalId) {
        let workspace = await persistence.getWorkspace(globalId);
        let users = await self.getCollaborators();
        let documents = await persistence.getEveryDocument();
        return {
            id: workspace.id,
            spaceGlobalId: workspace.spaceGlobalId,
            name: workspace.name,
            documents: documents,
            clock: workspace.clock,
            users: users,
        };
    }

    self.defineCustomType = function (typeName, typeDefinition) {
        customTypeRegistry.registerType(typeName, typeDefinition);
    }

    self.getAllVariables = async function () {
        return await persistence.getEveryVariable();
    }

    self.forceSave = async function () {
        return await persistence.forceSave();
    }

    self.shutDown = async function () {
        return await persistence.shutDown();
    }
    return self;
}

let singletonInstance = undefined;

export async function getInstance() {
    if (!singletonInstance) {
        singletonInstance = await Workspace();
    }
    return singletonInstance;
}

export function getAllow() {
    return async function (globalUserId, email, command, ...args) {
        return true;
    };
}

export function getDependencies() {
    return ["DefaultPersistence", "EmailPlugin", "WorkspaceUser", "ChatScript"];
}