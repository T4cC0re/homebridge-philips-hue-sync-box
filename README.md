# homebridge-philips-hue-sync-box-switches

Homebridge plugin for the Philips Hue Sync Box. Adapted to be Switch accessories. This is useful for automation purposes.

The Sync Box is exposed as a lightbulb and/or a switch (configurable). The following features are currently supported:
* On/Off
* Brightness

You also have additional Switch accessories that support:
* Switching HDMI inputs
* Switching modes
* Switching intensity

## Installation

Install the plugin via npm:

```bash
npm install homebridge-philips-hue-sync-box-switches -g
```

## Prepare Sync Box

You have to create new credentials to communicate with the Philips Hue Sync Box:
* Make sure the Sync Box is on
* Make sure synchronization is stopped
* Make an HTTP POST request to `https://<SYNC-BOX-IP>/api/v1/registrations`
* The body of the request has to be JSON: `{ "appName": "homebridge", "appSecret": "MDAwMTExMDAwMTExMDAwMTExMDAwMTExMDAwMTExMDA=", "instanceName": "homebridge" }`
* One way to do this is to enter the following into the Terminal: `curl -k -H "Content-Type: application/json" -X POST -d '{"appName": "homebridge", "appSecret":"MDAwMTExMDAwMTExMDAwMTExMDAwMTExMDAwMTExMDA=", "instanceName": "homebridge"}' https://<SYNC-BOX-IP>/api/v1/registrations`, replacing `<SYNC-BOX-IP>` with the IP address of your Sync Box.
* The first response to the request will be `{ "code": 16, "message": "Invalid State" }`
* IMPORTANT: Now, click and hold the button of the Sync Box until the LED switches to green. Immediately release the button as soon as the LED is green! It will switch to white again.
* Immediately make the request again
* The response contains an `accessToken` string

## Configuration

```json
{
    "platforms": [
        {
            "platform": "PhilipsHueSyncBoxSwitchesPlatform",
            "syncBoxIpAddress": "<SYNC-BOX-IP-ADDRESS>",
            "syncBoxApiAccessToken": "<ACCESS-TOKEN>",
            "defaultOffMode": "passthrough",
            "syncBoxNameOverride": "Sync box",
            "hideBrightness": false,
            "isApiEnabled": false,
            "apiPort": 40220,
            "apiToken": "<YOUR-TOKEN>"
        }
    ]
}
```

**syncBoxIpAddress**: The IP address of your Philips Hue Sync Box.

**syncBoxApiAccessToken**: The access token that you get while registration.

**defaultOffMode** (optional): The mode that is used when switching the Sync Box off via HomeKit. Defaults to `passthrough`. Possible values are `powersave` or `passthrough`.

**syncBoxNameOverride** (optional): Set a different name on this instance if you have multiple boxes.

**hideBrightness** (optional): When true, no Light accessory will be presented. Instead you will see a 'Power' switch to toggle between `defaultOffMode` and the last sync mode. When false (default), you will have a Light accessory.

**isApiEnabled** (optional): Enables an HTTP API for controlling the Sync Box. Defaults to `false`. See **API** for more information.

**apiPort** (optional): The port that the API (if enabled) runs on. Defaults to `40220`, please change this setting of the port is already in use.

**apiToken** (optional): The token that has to be included in each request of the API. Is required if the API is enabled and has no default value.

## API

This plugin also provides an HTTP API to control some features of the Sync Box. It has been created so that you can further automate the system with HomeKit shortcuts. Starting with iOS 13, you can use shortcuts for HomeKit automation. Those automations that are executed on the HomeKit coordinator (i.e. iPad, AppleTV or HomePod) also support HTTP requests, which means you can automate your Sync Box without annoying switches and buttons exposed in HomeKit.

If the API is enabled, it can be reached at the specified port on the host of this plugin.
```
http://<YOUR-HOST-IP-ADDRESS>:<apiPort>
```

The token has to be specified as value of the `Authorization` header on each request:
```
Authorization: <YOUR-TOKEN>
```

## API - GET

Use the `state` endpoint to retrieve the state of the Sync Box. The HTTP method has to be `GET`:
```
http://<YOUR-HOST-IP-ADDRESS>:<apiPort>/state
```

The response is a JSON response, the following properties are included:
```
{
    groupId: '<group-number>',
    mode: 'passthrough|powersave|video|game|music',
    lastSyncMode: 'video|game|music',
    brightness: 0-100,
    hdmiSource: 'input1|input2|input3|input4',
    options: {
        video: {
            intensity: 'subtle|moderate|high|intense',
            backgroundLighting: true|false
        },
        game: {
            intensity: 'subtle|moderate|high|intense',
            backgroundLighting: true|false
        },
        music: {
            intensity: 'subtle|moderate|high|intense'
        }
    }
}
```

## API - POST

Use the `state` endpoint to set state of the Sync Box. The HTTP method has to be `POST`:
```
http://<YOUR-HOST-IP-ADDRESS>:<apiPort>/state
```

The body of the request has to be JSON and can contain any/some/all of the following values:
```
{
    groupId: '<group-number>',
    mode: 'passthrough|powersave|video|game|music',
    brightness: 0-100,
    hdmiSource: 'input1|input2|input3|input4',
    options: {
        video: {
            intensity: 'subtle|moderate|high|intense',
            backgroundLighting: true|false
        },
        game: {
            intensity: 'subtle|moderate|high|intense',
            backgroundLighting: true|false
        },
        music: {
            intensity: 'subtle|moderate|high|intense'
        }
    }
}
```
