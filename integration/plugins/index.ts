import PluginEvents = Cypress.PluginEvents;
import PluginConfigOptions = Cypress.PluginConfigOptions;
import { preprocessor } from './ts-preprocessor';
import { existsSync, mkdirSync, rmdirSync, rmSync } from 'fs';
import { resolve } from 'path';
import { COVERAGE } from '../common/constants';
import { configureEnv } from '../../src/plugins';
import { pluginGrep } from '@mmisty/cypress-grep/plugins';
import { redirectLogBrowser } from 'cypress-redirect-browser-log/plugins';

/**
 * Clear compiled js files from previous runs, otherwise coverage will be messed up
 */
const clearJsFiles = () => {
  // remove previous in
  const jsFiles = resolve('js-files-cypress');

  if (existsSync(jsFiles)) {
    rmdirSync(jsFiles, { recursive: true });
  }
};

const isCoverage = (config: PluginConfigOptions) => {
  return process.env[COVERAGE] || config.env[COVERAGE];
};

export const setupPlugins = (on: PluginEvents, config: PluginConfigOptions) => {
  clearJsFiles();
  const isCov = isCoverage(config);

  if (isCov) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@cypress/code-coverage/task')(on, config);
    config.env[COVERAGE] = true;
  }

  const browserHandler = redirectLogBrowser(config);

  on('before:browser:launch', (browser, opts) => {
    return browserHandler(browser, opts);
  });

  on('file:preprocessor', preprocessor(isCov));

  if (existsSync('allure-results')) {
    console.log('Deleting allure-results');
    rmSync('allure-results', { recursive: true });
    mkdirSync('allure-results');
  }

  // HERE you put your plugin functions
  configureEnv(on, config);

  console.log('CYPRESS ENV:');
  console.log(config.env);

  // register grep plugin
  pluginGrep(on, config);

  on('task', {
    log: (...args: any[]) => {
      console.log(...args);

      return null;
    },
  });

  // It's IMPORTANT to return the config object
  // with any changed environment variables
  return config;
};
