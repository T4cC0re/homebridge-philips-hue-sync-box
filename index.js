
import {
  PhilipsHueSyncBoxPlatform
} from './src/philips-hue-sync-box-platform.js';

/**
 * Defines the export of the plugin entry point.
 * @param homebridge The homebridge API that contains all classes, objects and
 *     functions for communicating with HomeKit.
 */
export default (homebridge) => {
  homebridge.registerPlatform('homebridge-philips-hue-sync-box-switches',
                              'PhilipsHueSyncBoxSwitchesPlatform',
                              PhilipsHueSyncBoxPlatform, true);
}
