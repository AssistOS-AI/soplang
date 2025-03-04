const fs = require('fs').promises;
const path = require('path');
const process = require("process");

function WorkSpaceLogger(flushInterval = 1, logDir) {
    if (!logDir) {
        if (process.env.LOGS_FOLDER === undefined) {
            console.error("LOGS_FOLDER environment variable is not set. Please set it to the path where the logs should be stored. Defaults to './logs/'");
            process.env.LOGS_FOLDER = "./logs/"
        }
    }
    logDir = process.env.LOGS_FOLDER;
    let self = this;

    let buffer = [];
    let usersBuffer = {};
    let timer = null;

    fs.mkdir(logDir, {recursive: true}).catch(console.error);

    function getLogFileName() {
        const date = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
        return path.join(logDir, `syslog_${date}.log`);
    }

    function getLogFileNameForUser(userID) {
        return path.join(logDir, `user-${userID}.log`);
    }

    function makeCSVCompliant(input) {
        // Replace semicolons with commas
        let output = input.replace(/;/g, ',');

        // Check if the string contains commas, double quotes, or newlines
        if (/[,"\n]/.test(output)) {
            // Escape double quotes by doubling them
            output = output.replace(/"/g, '""');
            // Enclose the string in double quotes
            output = `"${output}"`;
        }

        return output;
    }

    this.log = function (forUser, auditType, details) {
        const timestamp = makeCSVCompliant(new Date().toISOString());
        forUser = makeCSVCompliant(forUser);
        auditType = makeCSVCompliant(auditType);
        details = Array.isArray(details) ? makeCSVCompliant(details.join(" ")) : makeCSVCompliant(details);
        buffer.push(`[${timestamp}]; ${forUser.trim()}; ${auditType.trim()}; ${details.trim()};`);
        usersBuffer[forUser] = usersBuffer[forUser] || [];
        usersBuffer[forUser].push(`[${timestamp}]; ${auditType.trim()}; ${details.trim()};`);

        if (!this.timer) {
            this.timer = setTimeout(() => this.flush(), flushInterval);
        }
    };

    async function appendFile(filePath, logData) {
        try {
            await fs.appendFile(filePath, logData, 'utf8');
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }

    let duringFlush = false;
    this.flush = async function () {
        if (duringFlush) {
            return;
        }
        duringFlush = true;
        if (buffer.length !== 0) {
            const fileName = getLogFileName();
            const logData = buffer.join('\n') + '\n';
            await appendFile(fileName, logData);
            buffer = [];
        }

        for (const user in usersBuffer) {
            const fileName = getLogFileNameForUser(user);
            const logData = usersBuffer[user].join('\n') + '\n';
            usersBuffer[user] = [];
            delete usersBuffer[user];
            await appendFile(fileName, logData);
        }

        this.timer = null;
        duringFlush = false;
    };

    this.getUserLogs = async function (userID) {
        const fileName = getLogFileNameForUser(userID);
        try {
            return await fs.readFile(fileName, 'utf8');
        } catch (error) {
            console.error('Error reading user log file:', error);
            return 'No logs available';
        }
    }

    process.on('exit', () => this.flush());
    process.on('SIGINT', () => {
        this.flush().then(() => process.exit());
    });
}

module.exports = {
    getSystemLogger: function (flushInterval, logDir) {
        return new WorkSpaceLogger(flushInterval, logDir);
    }
}