"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleCyLogEvents = void 0;
const helper_1 = require("./helper");
const allure_types_1 = require("../plugins/allure-types");
const common_1 = require("../common");
const tagToLabel_1 = __importDefault(require("./tagToLabel"));
const dbg = 'cypress-allure:cy-events';
const ARGS_TRIM_AT = 255;
const withTry = (message, callback) => {
    try {
        callback();
    }
    catch (err) {
        const e = err;
        console.error(`${common_1.packageLog} could do '${message}': ${e.message}`);
        console.error(e.stack);
    }
};
const stepMessage = (name, args) => {
    const argsLine = args && args.length > ARGS_TRIM_AT && name !== 'assert' ? '' : args && args.length > 0 ? args : '';
    return `${name}${argsLine}`;
};
const convertEmptyObj = (obj, indent) => {
    if (obj == null) {
        return '';
    }
    if (Object.keys(obj).length > 0) {
        try {
            return !indent ? JSON.stringify(obj) : JSON.stringify(obj, null, indent);
        }
        catch (e) {
            return 'could not stringify';
        }
    }
    return '';
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stringify = (args, indent) => {
    const getArr = () => {
        try {
            if (Array.isArray(args)) {
                return args.map(a => stringify(a, indent)).join(',');
            }
            else {
                return convertEmptyObj(args, indent);
            }
        }
        catch (err) {
            return 'could not stringify';
        }
    };
    if (typeof args === 'string') {
        try {
            return stringify(JSON.parse(args), indent);
        }
        catch (err) {
            return `${args}`;
        }
    }
    return typeof args === 'string' || typeof args === 'number' || typeof args === 'boolean' ? `${args}` : getArr();
};
const requestName = (url, method) => {
    return `${method}, ${url}`;
};
const COMMAND_REQUEST = 'request';
const attachRequests = (allureAttachRequests, command, opts) => {
    var _a, _b, _c;
    const debug = (0, helper_1.logClient)(dbg);
    const maxParamLength = 70;
    const compact = (_a = opts.compactAttachments) !== null && _a !== void 0 ? _a : true;
    const indent = compact ? undefined : ' ';
    debug(command);
    const logsAttr = (_c = (_b = command.attributes) === null || _b === void 0 ? void 0 : _b.logs) !== null && _c !== void 0 ? _c : [];
    const consoleProps = logsAttr.map(t => { var _a, _b; return (_b = (_a = t.attributes) === null || _a === void 0 ? void 0 : _a.consoleProps) === null || _b === void 0 ? void 0 : _b.call(_a); });
    debug('consoleProps:');
    debug(consoleProps);
    // t.Command for less than 13.x cypress
    const logs = consoleProps.filter(t => t.name === COMMAND_REQUEST || t.Command === COMMAND_REQUEST);
    const getRequests = () => {
        const logsMapped = logs.map(t => { var _a; return (_a = t.props) !== null && _a !== void 0 ? _a : t; }); // support  cypress < 13.x
        if (logsMapped.every(t => !!t.Requests)) {
            // several requests if there are come redirects
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return logsMapped.flatMap(t => t.Requests.map((x) => { var _a; return (Object.assign(Object.assign({}, x), { duration: (_a = t.Yielded) === null || _a === void 0 ? void 0 : _a.duration })); }));
        }
        if (logsMapped.every(t => !!t.Request)) {
            return logsMapped.map(t => { var _a; return (Object.assign(Object.assign({}, t.Request), { duration: (_a = t.Yielded) === null || _a === void 0 ? void 0 : _a.duration })); });
        }
        return undefined;
    };
    const requests = getRequests();
    if (!requests) {
        return;
    }
    const allRequests = requests.filter(r => !!r);
    allRequests.forEach((req) => {
        var _a, _b, _c, _d, _e;
        const reqHeaders = { obj: req['Request Headers'], name: 'Request Headers' };
        const reqBody = { obj: req['Request Body'], name: 'Request Body' };
        const resHeaders = { obj: req['Response Headers'], name: 'Response Headers' };
        const resBody = { obj: req['Response Body'], name: 'Response Body' };
        const resStatusParam = { name: 'Response Status', value: `${(_a = req['Response Status']) !== null && _a !== void 0 ? _a : ''}` };
        const reqUrlParam = { name: 'Request URL', value: `${(_b = req['Request URL']) !== null && _b !== void 0 ? _b : ''}` };
        const stepUrl = reqUrlParam.value.replace((_e = (_c = Cypress.config('baseUrl')) !== null && _c !== void 0 ? _c : (0, common_1.baseUrlFromUrl)((_d = Cypress.config('browserUrl')) !== null && _d !== void 0 ? _d : '')) !== null && _e !== void 0 ? _e : '', '');
        const stepStatus = resStatusParam.value !== '200' ? 'broken' : 'passed';
        /*if (reqNumber === 0) {
          Cypress.Allure.parameters({ name: 'duration', value: req.duration });
        }*/
        if (allRequests.length > 1) {
            Cypress.Allure.startStep(`request: ${resStatusParam.value} ${stepUrl}`);
        }
        const attaches = [reqBody, reqHeaders, resBody, resHeaders].map(t => (Object.assign(Object.assign({}, t), { stringified: stringify(t.obj, indent) })));
        const shortAttaches = attaches.filter(a => a.stringified.length < maxParamLength);
        const longAttaches = attaches.filter(a => a.stringified.length >= maxParamLength);
        if (allRequests.length === 1) {
            Cypress.Allure.parameters(resStatusParam);
        }
        Cypress.Allure.parameters(reqUrlParam, ...shortAttaches.map(a => ({ name: a.name, value: a.stringified })));
        if (allureAttachRequests) {
            longAttaches
                .filter(t => !!t.obj)
                .forEach(attach => {
                Cypress.Allure.attachment(attach.name, attach.stringified, 'application/json');
            });
        }
        if (allRequests.length > 1) {
            Cypress.Allure.endStep(stepStatus);
        }
    });
};
const commandParams = (command) => {
    var _a, _b, _c, _d;
    const name = (_b = (_a = command.attributes) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'no name';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commandArgs = (_c = command.attributes) === null || _c === void 0 ? void 0 : _c.args;
    const state = ((_d = command.state) !== null && _d !== void 0 ? _d : allure_types_1.Status.PASSED);
    // exclude command logs with Cypress options isLog = false
    const isLog = () => {
        try {
            if (commandArgs && Array.isArray(commandArgs)) {
                return !commandArgs.some(a => a && a.log === false);
            }
            return commandArgs.log !== false;
        }
        catch (err) {
            return false; // 'could not get log';
        }
    };
    const getArgs = () => {
        try {
            if (Array.isArray(commandArgs)) {
                return commandArgs
                    .map(arg => {
                    if (name === COMMAND_REQUEST && typeof arg === 'object' && arg.method && arg.url) {
                        return requestName(arg.url, arg.method);
                    }
                    return stringify(arg);
                })
                    .filter(x => x.trim() !== '');
            }
            return [convertEmptyObj(commandArgs)];
        }
        catch (err) {
            return ['could not parse args'];
        }
    };
    const args = getArgs();
    return {
        name,
        args,
        message: stepMessage(name, args.filter(t => t.length < ARGS_TRIM_AT).join(', ')),
        isLog: isLog(),
        state,
    };
};
const createEmitEvent = (runner) => (args) => {
    runner.emit('task', args);
};
const handleCyLogEvents = (runner, events, config) => {
    const debug = (0, helper_1.logClient)(dbg);
    const { ignoreCommands, wrapCustomCommands, allureLogCyCommands } = config;
    const ignoreAllCommands = () => {
        const cmds = [...ignoreCommands(), 'should', 'then', 'allure', 'doSyncCommand']
            .filter(t => t.trim() !== '')
            .map(x => new RegExp(`^${x.replace(/\*/g, '.*')}$`));
        return {
            includes(ttl) {
                return cmds.some(t => t.test(ttl));
            },
        };
    };
    const customCommands = [];
    const allLogged = [];
    const emit = createEmitEvent(runner);
    const getCucumberTestState = () => {
        const globalState = globalThis;
        if (globalState && globalState.testState) {
            return globalState.testState;
        }
        return {};
    };
    const updateLabel = (tag) => {
        const [name, value] = (0, tagToLabel_1.default)(tag);
        if (value && name) {
            Cypress.Allure.label(name, value);
        }
        if (value && name === 'testID') {
            Cypress.Allure.label('AS_ID', value);
        }
    };
    const updateLabels = () => {
        const { pickle } = getCucumberTestState();
        if (pickle) {
            const { tags } = pickle;
            tags.forEach(updateLabel);
        }
    };
    const updateFeature = () => {
        const { gherkinDocument } = getCucumberTestState();
        if (gherkinDocument) {
            const feature = gherkinDocument.feature.name;
            Cypress.Allure.label('feature', feature);
        }
    };
    Cypress.Allure.on('test:ended', () => {
        updateFeature();
        updateLabels();
    });
    Cypress.Allure.on('test:started', () => {
        allLogged.splice(0, allLogged.length);
    });
    const allureAttachRequests = Cypress.env('allureAttachRequests')
        ? Cypress.env('allureAttachRequests') === 'true' || Cypress.env('allureAttachRequests') === true
        : false;
    const allureCompactAttachmentsRequests = Cypress.env('allureCompactAttachments')
        ? Cypress.env('allureCompactAttachments') === 'true' || Cypress.env('allureCompactAttachments') === true
        : true;
    const isLogCommand = (isLog, name) => {
        return isLog && !ignoreAllCommands().includes(name) && !Object.keys(Cypress.Allure).includes(name);
    };
    const wrapCustomCommandsFn = (commands, isExclude) => {
        const origAdd = Cypress.Commands.add;
        Cypress.on('command:enqueued', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const queue = () => cy.queue;
            // swap if next chainer is 'should'
            // should be done for all child commands ?
            const swapCmd = () => {
                const custId = queue().queueables.findIndex((t, i) => { var _a; return i >= queue().index && ((_a = t.attributes) === null || _a === void 0 ? void 0 : _a.name) === 'doSyncCommand'; });
                const next = custId + 1;
                if (queue().queueables.length > next && ['assertion'].includes(queue().queueables[next].attributes.type)) {
                    (0, common_1.swapItems)(queue().queueables, custId, next);
                    swapCmd();
                }
            };
            swapCmd();
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Cypress.Commands.add = (...args) => {
            const fnName = args[0];
            const fn = typeof args[1] === 'function' ? args[1] : args[2];
            const opts = typeof args[1] === 'object' ? args[1] : undefined;
            if (!fnName ||
                typeof fnName !== 'string' ||
                ignoreAllCommands().includes(fnName) ||
                // wrap only specified commands
                (commands.length > 0 && commands.includes(fnName) && isExclude) ||
                (commands.length > 0 && !commands.includes(fnName) && !isExclude)) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                origAdd(...args);
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newFn = (...fnargs) => {
                var _a, _b;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const currentCmd = (_b = (_a = Cypress).state) === null || _b === void 0 ? void 0 : _b.call(_a).current;
                events.emit('cmd:started:tech', currentCmd, true);
                const res = fn(...fnargs);
                const end = () => events.emit('cmd:ended:tech', currentCmd, true);
                if ((res === null || res === void 0 ? void 0 : res.then) && !(res === null || res === void 0 ? void 0 : res.should)) {
                    // for promises returned from commands
                    res.then(() => {
                        end();
                    });
                }
                else {
                    cy.doSyncCommand(() => {
                        end();
                    });
                }
                return res;
            };
            if (fn && opts) {
                origAdd(fnName, opts, newFn);
            }
            else if (fn) {
                origAdd(fnName, newFn);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                origAdd(...args);
            }
        };
    };
    const wrapCustomCommandsRes = wrapCustomCommands();
    if (allureLogCyCommands() && wrapCustomCommandsRes) {
        const commands = Array.isArray(wrapCustomCommandsRes) ? wrapCustomCommandsRes : [];
        let isExclude = false;
        let commadsFixed = commands;
        if (!(commands === null || commands === void 0 ? void 0 : commands.every(c => c.startsWith('!'))) || !(commands === null || commands === void 0 ? void 0 : commands.every(c => !c.startsWith('!')))) {
            console.warn('wrapCustomCommands env var - should either all start from "!" or not');
        }
        if (commands === null || commands === void 0 ? void 0 : commands.every(c => c.startsWith('!'))) {
            isExclude = true;
            commadsFixed = commands === null || commands === void 0 ? void 0 : commands.map(t => t.slice(1));
        }
        wrapCustomCommandsFn(commadsFixed, isExclude);
    }
    const cucumberHooksNames = [
        'Before',
        'After',
        '"before each" hook',
        '"after each" hook',
        '"after all" hook',
    ];
    const cucumberStepsNames = [
        'When',
        'Then',
        'Given',
        'And',
    ];
    const cucumberLogsNames = [
        ...cucumberHooksNames,
        ...cucumberStepsNames,
    ];
    const hasCucumberStep = (cmdMessage) => {
        return cucumberStepsNames.some((cucumberStepName) => {
            return cmdMessage.startsWith(cucumberStepName);
        });
    };
    const hasCucumberLog = (cmdMessage) => {
        return cucumberLogsNames.some((cucumberLogName) => {
            return cmdMessage.startsWith(cucumberLogName);
        });
    };
    const startedCucumberSteps = [];
    const endAllCucumberLogSteps = () => {
        while (startedCucumberSteps.length > 0) {
            startedCucumberSteps.pop();
            Cypress.Allure.endStep(allure_types_1.Status.PASSED);
        }
    };
    const startLogStep = (cmdMessage, isCucumberLog) => {
        if (isCucumberLog) {
            endAllCucumberLogSteps();
            startedCucumberSteps.push(cmdMessage);
        }
        Cypress.Allure.startStep(cmdMessage);
    };
    const endLogStep = (isCucumberLog) => {
        if (!isCucumberLog) {
            Cypress.Allure.endStep(allure_types_1.Status.PASSED);
        }
    };
    Cypress.on('log:added', (log) => __awaiter(void 0, void 0, void 0, function* () {
        if (!allureLogCyCommands()) {
            return;
        }
        withTry('report log:added', () => {
            const logName = log.name.trim();
            const isCucumberLog = hasCucumberLog(logName);
            const stepName = hasCucumberStep(logName) ? `[${logName}]` : logName;
            const args = log.message === undefined || log.message === 'null' ? '' : log.message.replace('**', '').replace('**', '');
            const cmdMessage = stepMessage(stepName, args);
            const lastAllLoggedCommand = allLogged[allLogged.length - 1];
            // const isEnded = log.end;
            // logs are being added for all from command log, need to exclude same items
            if (cmdMessage !== lastAllLoggedCommand &&
                !cmdMessage.match(/its:\s*\..*/) && // its already logged as command
                !ignoreAllCommands().includes(logName) &&
                logName !== COMMAND_REQUEST) {
                allLogged.push(cmdMessage);
                debug(`step: ${cmdMessage}`);
                startLogStep(cmdMessage, isCucumberLog);
                if (logName !== 'assert' && log.message && log.message.length > ARGS_TRIM_AT) {
                    Cypress.Allure.attachment(`${cmdMessage} args`, log.message, 'application/json');
                }
                endLogStep(isCucumberLog);
            }
        });
    }));
    Cypress.on('command:start', (command) => __awaiter(void 0, void 0, void 0, function* () {
        events.emit('cmd:started:tech', command);
    }));
    Cypress.on('command:end', (command) => __awaiter(void 0, void 0, void 0, function* () {
        events.emit('cmd:ended:tech', command);
    }));
    events.on('cmd:started:tech', (command, isCustom) => {
        const { message: cmdMessage } = commandParams(command);
        debug(`started tech: ${cmdMessage}`);
        if (isCustom) {
            customCommands.push(cmdMessage);
            // not start when custom because cypress already
            // fired event command:start
            return;
        }
        events.emit('cmd:started', command);
    });
    Cypress.Allure.on('cmd:started', (command) => {
        var _a, _b;
        const { name, isLog, message: cmdMessage, args } = commandParams(command);
        if (name === 'screenshot') {
            // add screenshot to report
            const screenName = (_b = (_a = command.attributes) === null || _a === void 0 ? void 0 : _a.args[0]) !== null && _b !== void 0 ? _b : 'anyName';
            emit({ task: 'screenshotOne', arg: { forStep: true, name: screenName } });
        }
        if (!isLogCommand(isLog, name) || !allureLogCyCommands()) {
            return;
        }
        debug(`started: ${cmdMessage}`);
        Cypress.Allure.startStep(cmdMessage);
        allLogged.push(cmdMessage);
        withTry('report command:attachment', () => {
            const requestAndLogRequests = allureAttachRequests && name === COMMAND_REQUEST;
            if (!requestAndLogRequests && args.join(',').length > ARGS_TRIM_AT) {
                const content = args.join('\n');
                Cypress.Allure.attachment(`${cmdMessage} args`, content, 'application/json');
            }
        });
    });
    events.on('cmd:ended:tech', (command, isCustom) => {
        const { message: cmdMessage } = commandParams(command);
        const last = customCommands[customCommands.length - 1];
        if (last && last === cmdMessage) {
            customCommands.pop();
            // cypress ends custom commands right away
            // not end when custom started
            return;
        }
        events.emit('cmd:ended', command, isCustom);
    });
    Cypress.Allure.on('cmd:ended', (command, isCustom) => {
        const { name, isLog, state, message: cmdMessage } = commandParams(command);
        if (!isLogCommand(isLog, name)) {
            return;
        }
        if (name === COMMAND_REQUEST) {
            withTry('report attach:requests', () => {
                attachRequests(allureAttachRequests, command, { compactAttachments: allureCompactAttachmentsRequests });
            });
        }
        if (!allureLogCyCommands()) {
            return;
        }
        debug(`ended ${isCustom ? 'CUSTOM' : ''}: ${cmdMessage}`);
        Cypress.Allure.endStep(state);
    });
};
exports.handleCyLogEvents = handleCyLogEvents;
