/**
 * Represents a physical Sync Boxthis.
 * @param platform The PhilipsHueSyncBoxPlatform instance.
 * @param state The state.
 */
export class SyncBoxDevice {

    getLastSyncMode = () => {
        if (this.state && this.state.execution && this.state.execution.lastSyncMode) {
            return this.state.execution.lastSyncMode;
        }
        return 'video'
    }

    getName = (suffix) => {
        return [this.platform.config.syncBoxNameOverride || this.state.device.name, suffix].join(' ')
    }

    isOn = (check) => {
        if (this.state && this.state.execution && this.state.execution.mode) {
            if (!!check) {
                return this.state.execution.mode == check
            }
            return this.state.execution.mode !== 'powersave' && this.state.execution.mode !== 'passthrough'
        }
        return false
    };

    isInput = (input) => {
        return this.state && this.state.execution && this.state.execution.hdmiSource == input
    }

    isIntensity = (intensity) => {

        if (this.state.execution.mode == 'powersave' || this.state.execution.mode == 'passthrough') {
            return false;
        }

        let mode = this.getLastSyncMode()
        let currentIntensity = this.state.execution[mode].intensity

        switch (true) {
        case intensity == 'subtle':
        case intensity == 'moderate':
        case intensity == 'high':
        case intensity == 'intense':
            return currentIntensity == intensity;
        default:
            this.platform.log(`unknown intensity '${intensity}'`);
            return false;
        }
    }

    /**
      Only call in constructor before switches!
    */
    addAccessory = (name) => {
        const {
            UUIDGen,
            Accessory
        } = this.platform;
        // Gets the main light bulb accessory
        let accessory = this.unusedDeviceAccessories.find(function (a) {
            return a.context.kind === name;
        });
        if (accessory) {
            this.unusedDeviceAccessories.splice(this.unusedDeviceAccessories.indexOf(accessory), 1);
        } else {
            this.platform.log(`Adding new accessory '${name}'.`);
            accessory = new Accessory(this.getName(name), UUIDGen.generate(name));
            accessory.context.kind = name;
            this.newDeviceAccessories.push(accessory);
        }
        this.deviceAccessories.push(accessory);
        return accessory
    }

    getBrightness = () => {
        if (this.state && this.state.execution) {
            return this.state.execution.brightness / 2;
        }

        return 0;
    }

    removeBrightness = (accessory, name) => {
      const {
          Service
      } = this.platform;
      // Removes the light bulb service
      let service = accessory.getService(name);
      if (service) {
          accessory.removeService(service);
      }
    }

    setUpBrightness = (accessory, name) => {
        const {
            Characteristic,
            Service
        } = this.platform;
        // Updates the light bulb service
        let service = accessory.getService(name);
        if (!service) {
            service = accessory.addService(Service.Lightbulb, name);
        }

        service.getCharacteristic(Characteristic.On)
            .onGet(() => this.isOn(null));
        service.getCharacteristic(Characteristic.Brightness)
            .onGet(() => this.getBrightness());
        service.getCharacteristic(Characteristic.On)
            .on('set', (value, callback) => {
                // Saves the changes
                if (value) {
                    this.platform.log.debug('Switch state to lastSyncMode');
                    this.platform.limiter.schedule(() => {
                            return this.platform.client.updateExecution({
                                'mode': this.getLastSyncMode()
                            });
                        })
                        .then(() => {}, () => {
                            this.platform.log('Failed to switch state to ON');
                        });
                } else {
                    this.platform.log.debug('Switch state to OFF');
                    this.platform.limiter.schedule(() => {
                            return this.platform.client.updateExecution({
                                'mode': this.platform.config.defaultOffMode
                            });
                        })
                        .then(() => {}, () => {
                            this.platform.log('Failed to switch state to OFF');
                        });
                }
                // Performs the callback
                callback(null);
            });

        service.getCharacteristic(Characteristic.Brightness)
            .on('set', (value, callback) => {
                // Saves the changes
                if (value) {
                    this.platform.limiter.schedule(() => {
                            return this.platform.client.updateExecution({ 'brightness': Math.round((value / 100.0) * 200) });
                        })
                        .then(() => {}, () => {
                            this.platform.log('Failed to set brightness');
                        });
                }
                // Performs the callback
                callback(null);
            });

        this.onUpdate(() => {
            service.getCharacteristic(Characteristic.On)
                .updateValue(this.isOn(null));
            service.getCharacteristic(Characteristic.Brightness)
                .updateValue(this.getBrightness());
        })
    }

    setUpModeSwitch = (accessory, name, mode) => {
        const {
            Characteristic,
            Service
        } = this.platform;
        // Updates the light bulb service
        let service = accessory.getService(name);
        if (!service) {
            service = accessory.addService(Service.Switch, name, mode);
        }
        service.getCharacteristic(Characteristic.On)
            .onGet(() => this.isOn(mode));
        service.getCharacteristic(Characteristic.On)
            .on('set', (value, callback) => {
                // Saves the changes
                if (value) {
                    this.platform.log.debug('Switch state to lastSyncMode');
                    this.platform.limiter.schedule(() => {
                            return this.platform.client.updateExecution({
                                'mode': mode || this.getLastSyncMode()
                            });
                        })
                        .then(() => {}, () => {
                            this.platform.log('Failed to switch state to ON');
                        });
                } else {
                    this.platform.log.debug('Switch state to OFF');
                    this.platform.limiter.schedule(() => {
                            return this.platform.client.updateExecution({
                                'mode': this.platform.config.defaultOffMode
                            });
                        })
                        .then(() => {}, () => {
                            this.platform.log('Failed to switch state to OFF');
                        });
                }
                // Performs the callback
                callback(null);
            });

        this.onUpdate(() => {
            service.getCharacteristic(Characteristic.On)
                .updateValue(this.isOn(mode));
        })
    }

    setUpIntensitySwitch = (accessory, name, intensity) => {
        const {
            Characteristic,
            Service
        } = this.platform;

        let service = accessory.getService(name);
        if (!service) {
            service = accessory.addService(Service.Switch, name, intensity);
        }

        service.getCharacteristic(Characteristic.On)
            .onGet(() => this.isIntensity(intensity));
        service.getCharacteristic(Characteristic.On)
            .on('set', (value, callback) => {
                // Saves the changes
                if (value) {
                    this.platform.log.debug(`Switch intensity to ${intensity}`);
                    this.platform.limiter.schedule(() => {
                            return this.platform.client.updateExecution({
                                'intensity': intensity
                            });
                        })
                        .then(() => {

                            callback(null);
                        }, () => {
                            this.platform.log('Failed to switch state to ON');
                            callback('Failed to switch state to ON');
                        });
                } else {
                    // this can only turn on.
                    // service.getCharacteristic(Characteristic.On).updateValue(true)

                    callback(`cannot be turned off by user`);
                }
            });

        this.onUpdate(() => {
            service.getCharacteristic(Characteristic.On)
                .updateValue(this.isIntensity(intensity));
        })
    }

    /**
    accessory: HMAccessory
    name: String handle to reference the switch in HomeKit
    inputName: String handle to reference the input on the Hue Bridge (input<n>)
    */
    setUpInputSwitch = (accessory, name, inputName) => {
        const {
            Characteristic,
            Service
        } = this.platform;
        // Updates the light bulb service

        let service = accessory.getService(name);
        if (!service) {
            service = accessory.addService(Service.Switch, name, inputName);
        }
        service.getCharacteristic(Characteristic.On)
            .onGet(() => this.isInput(inputName));
        service.getCharacteristic(Characteristic.On)
            .on('set', (value, callback) => {
                // Saves the changes
                if (value) {
                    this.platform.log.debug(`Switch input to ${inputName}`);
                    this.platform.limiter.schedule(() => {
                            return this.platform.client.updateExecution({
                                'hdmiSource': inputName
                            });
                        })
                        .then(() => {

                            callback(null);
                        }, () => {
                            this.platform.log(`Failed to switch input ${index} to ON`);
                            callback('Failed to switch state to ON');
                        });
                } else {
                    // this can only turn on.
                    // service.getCharacteristic(Characteristic.On).updateValue(true)

                    callback(`cannot be turned off by user`);
                }
                /* else {
                    this.platform.log.debug('Switch state to OFF');
                    this.platform.limiter.schedule(() => { return this.platform.client.updateExecution({ 'mode': this.platform.config.defaultOffMode }); }).then(() => {}, () => {
                        this.platform.log('Failed to switch state to OFF');
                    });
                }*/
                // Performs the callback
            });

        this.onUpdate(() => {
            service.getCharacteristic(Characteristic.On)
                .updateValue(this.isInput(inputName));
        })
    }

    updateCallbacks = [];
    onUpdate = (callback) => {
        this.updateCallbacks.push(callback);
    }

    constructor(platform, state) {
        const {
            UUIDGen,
            Accessory,
            Characteristic,
            Service,
            Categories
        } = platform;

        // Sets the platform
        this.platform = platform;

        // Stores the latest state
        this.state = state;
        this.platform.client.stateUpdate = (new_state) => {
            this.state = new_state;
            for (let cb of this.updateCallbacks) {
                cb();
            }
        }

        // Gets all accessories from the platform
        this.externalAccessories = [];
        this.unusedDeviceAccessories = platform.accessories.slice();
        this.newDeviceAccessories = [];
        this.deviceAccessories = [];

        let brightnessState, powerState, modeState, intensityState, inputState = null

        switch (true) {
          case platform.config.hideBrightness && platform.config.unifiedAccessory:
            platform.log(`unifiedAccessory is enabled. Only registering 1 accessory`);
            powerState = this.addAccessory(this.platform.config.syncBoxNameOverride || this.state.device.name);
            modeState = powerState;
            intensityState = powerState;
            inputState = powerState;
            break;
          case platform.config.unifiedAccessory:
            platform.log(`unifiedAccessory is enabled. Only registering 1 accessory`);
            brightnessState = this.addAccessory(this.platform.config.syncBoxNameOverride || this.state.device.name);
            powerState = brightnessState;
            modeState = brightnessState;
            intensityState = brightnessState;
            inputState = brightnessState;
            break;
          case platform.config.hideBrightness:
            platform.log(`hideBrightness is enabled. Skipping Lightbulb accessory`)
            platform.log(`unifiedAccessory is disabled. Registering all accessories`);
            powerState = this.addAccessory("Power");
            modeState = this.addAccessory("Mode");
            intensityState = this.addAccessory("Intensity");
            inputState = this.addAccessory("Input");
            break;
          default:
            platform.log(`hideBrightness is disabled. Registering Lightbulb accessory`)
            platform.log(`unifiedAccessory is disabled. Registering all accessories`);
            brightnessState = this.addAccessory("Brightness");
            powerState = this.addAccessory("Power");
            modeState = this.addAccessory("Mode");
            intensityState = this.addAccessory("Intensity");
            inputState = this.addAccessory("Input");
            break;
        }

        if (!powerState || !modeState || !intensityState || !inputState || (!platform.config.hideBrightness && !brightnessState)) {
          throw ("Something broke :/")
        }

        // Registers the newly created accessories
        platform.api.registerPlatformAccessories(platform.pluginName, platform.platformName, this.newDeviceAccessories);

        // Removes all unused accessories
        for (let i = 0; i < this.unusedDeviceAccessories.length; i++) {
            const unusedDeviceAccessory = this.unusedDeviceAccessories[i];
            platform.log('Removing unused accessory with kind ' + unusedDeviceAccessory.context.kind + '.');
            platform.accessories.splice(platform.accessories.indexOf(unusedDeviceAccessory), 1);
        }
        platform.api.unregisterPlatformAccessories(platform.pluginName, platform.platformName, this.unusedDeviceAccessories);

        // Updates the accessory information
        for (let i = 0; i < this.deviceAccessories.length; i++) {
            const deviceAccessory = this.deviceAccessories[i];
            let accessoryInformationService = deviceAccessory.getService(Service.AccessoryInformation);
            if (!accessoryInformationService) {
                accessoryInformationService = deviceAccessory.addService(Service.AccessoryInformation);
            }
            accessoryInformationService
                .setCharacteristic(Characteristic.Manufacturer, 'Philips')
                .setCharacteristic(Characteristic.Model, 'Sync Box')
                .setCharacteristic(Characteristic.FirmwareRevision, state.device.firmwareVersion)
                .setCharacteristic(Characteristic.SerialNumber, state.device.uniqueId);
        }

        if (!platform.config.hideBrightness) {
          platform.log(`hideBrightness is disabled. Registering Brightness service`)
          this.setUpBrightness(brightnessState, "Brightness");
        } else {
          platform.log(`hideBrightness is enabled. Removing Brightness service`)
          this.removeBrightness(brightnessState || powerState, "Brightness");
        }

        this.setUpModeSwitch(powerState, "Power", null)

        this.setUpModeSwitch(modeState, "Video", "video")
        this.setUpModeSwitch(modeState, "Music", "music")
        this.setUpModeSwitch(modeState, "Game", "game")
        this.setUpModeSwitch(modeState, "Passthrough", "passthrough")

        this.setUpIntensitySwitch(intensityState, "Subtle", 'subtle')
        this.setUpIntensitySwitch(intensityState, "Moderate", 'moderate')
        this.setUpIntensitySwitch(intensityState, "High", 'high')
        this.setUpIntensitySwitch(intensityState, "Intense", 'intense')

        for (let i = 1; i <= 4; i++) {
            this.setUpInputSwitch(inputState, `HDMI ${i}`, `input${i}`)
        }

        // Publishes the external accessories (i.e. the TV accessories)
        if (this.externalAccessories.length > 0) {
            platform.api.publishExternalAccessories(platform.pluginName, this.externalAccessories);
        }

        // Updates all the Characteristics initially
        this.platform.client.getState();
    }

}
