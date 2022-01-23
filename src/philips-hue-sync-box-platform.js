import Bottleneck from 'bottleneck';

import { PhilipsHueSyncBoxClient } from './philips-hue-sync-box-client.js';
import { SyncBoxDevice } from './sync-box-device.js';
import SyncBoxApi from './sync-box-api.js';

/**
 * Initializes a new platform instance for the Philips Hue Sync Box plugin.
 * @param log The logging function.
 * @param config The configuration that is passed to the plugin (from the config.json file).
 * @param api The API instance of homebridge (may be null on older homebridge versions).
 */
export class PhilipsHueSyncBoxPlatform {
    config = {};
    log = null;
    pluginName = 'homebridge-philips-hue-sync-box-switches';
    platformName = 'PhilipsHueSyncBoxSwitchesPlatform';

    constructor(log, config, api) {
        // Saves objects for functions
        this.Accessory = api.platformAccessory;
        this.Categories = api.hap.Accessory.Categories;
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        this.UUIDGen = api.hap.uuid;
        this.hap = api.hap;

        // Checks whether a configuration is provided, otherwise the plugin should not be initialized
        if (!config) {
            return;
        }

        // Defines the variables that are used throughout the platform
        this.log = log;
        this.config = Object.assign(this.config, config);
        this.device = null;
        this.accessories = [];

        // Initializes the configuration
        this.config.syncBoxIpAddress = this.config.syncBoxIpAddress || null;
        this.config.syncBoxApiAccessToken = this.config.syncBoxApiAccessToken || null;
        this.config.syncBoxNameOverride = this.config.syncBoxNameOverride || null;
        this.config.defaultOffMode = this.config.defaultOffMode || 'passthrough';
        this.config.isApiEnabled = this.config.isApiEnabled || false;
        this.config.hideBrightness = this.config.hideBrightness || false;
        this.config.unifiedAccessory = this.config.unifiedAccessory || false;
        this.config.apiPort = this.config.apiPort || 40220;
        this.config.apiToken = this.config.apiToken || null;
        this.config.requestsPerSecond = 5;
        this.config.updateInterval = 10000;

        // Initializes the limiter
        this.limiter = new Bottleneck({
            maxConcurrent: 1,
            minTime: 1000.0 / this.config.requestsPerSecond
        });

        // Checks whether the API object is available
        if (!api) {
            this.log('Homebridge API not available, please update your homebridge version!');
            return;
        }

        // Saves the API object to register new devices later on
        this.log('Homebridge API available.');
        this.api = api;

        // Checks if all required information is provided
        if (!this.config.syncBoxIpAddress || !this.config.syncBoxApiAccessToken) {
            this.log('No Sync Box IP address or access token provided.');
            return;
        }

        // Initializes the client
        this.client = new PhilipsHueSyncBoxClient(this.config, log);

        // Subscribes to the event that is raised when homebridge finished loading cached accessories
        this.api.on('didFinishLaunching', async () => {
            this.log('Cached accessories loaded.');
            try {
                let state = await this.client.getState();

                // Creates the Sync Box instance
                this.log('Create Sync Box.');
                this.device = new SyncBoxDevice(this, state);

                // Starts the timer for updating the Sync Box
                setInterval(async () => {
                    try {
                        await this.client.getState();
                    } catch (e) {
                        this.log('Error while getting the state. Please check the access token.' + e);
                    }
                }, this.config.updateInterval);

                // Initialization completed
                this.log('Initialization completed.');

                // Starts the API if requested
                if (this.config.isApiEnabled) {
                    // this.syncBoxApi = new SyncBoxApi(platform);
                }
            } catch (e) {
                this.log('Error while getting the state. Please check the access token.' + e);
            }
        });
    }

    /**
     * Configures a previously cached accessory.
     * @param accessory The cached accessory.
     */
    configureAccessory = (accessory) => {
        // Adds the cached accessory to the list
        this.accessories.push(accessory);
    }
}
