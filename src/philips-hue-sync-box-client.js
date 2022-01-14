import request from 'request';
export class PhilipsHueSyncBoxClient {
    stateUpdate = null
    constructor(config, log) {
        this.config = config;
        this.log = log;
    }

    /**
     * Gets the current state of the Sync Box.
     */
    getState = async () => {
        let data = await this.send('GET', '', null);
        if (this.stateUpdate) {
            this.stateUpdate(data);
        }
        return data
    }
    /**
     * Updates the execution settings of the Sync Box.
     */
    updateExecution = async (settings) => {
        let data = await this.send('PUT', '/execution', settings);
        // await the actual operation, but not this to make this fetch async.
        this.getState()
        return data
    }

    /**
     * Updates the Hue settings of the Sync Box.
     */
    updateHue = async (settings) => {
        let data = await this.send('PUT', '/hue', settings);
        // await the actual operation, but not this to make this fetch async.
        this.getState()
        return data
    }

    /**
     * Sends an HTTP request to the Sync Box.
     * @param method The HTTP method.
     * @param uri The uri path to the endpoint.
     * @param body The body of the request.
     */
    send = (method, uri, body) => {
        // Checks if all required information is provided
        if (!this.config.syncBoxIpAddress) {
            this.log('No Sync Box IP address provided.');
            return;
        }
        if (!this.config.syncBoxApiAccessToken) {
            this.log('No access token for the Sync Box provided.');
            return;
        }

        // Sends out the request
        return new Promise((resolve, reject) => {
            request({
                uri: 'https://' + this.config.syncBoxIpAddress + '/api/v1' + uri,
                headers: {
                    'Authorization': 'Bearer ' + this.config.syncBoxApiAccessToken
                },
                method: method,
                body: body,
                json: true,
                rejectUnauthorized: false
            }, (error, response, body) => {

                // Checks if the API returned a positive result
                if (error || response.statusCode != 200) {
                    if (error) {
                        this.log('Error while communicating with the Sync Box. Error: ' + error);
                    } else if (response.statusCode != 200) {
                        this.log('Error while communicating with the Sync Box. Status Code: ' + response.statusCode);
                    }
                    reject(error);
                }

                // Returns the response
                resolve(body);
            });
        });
    }

}
