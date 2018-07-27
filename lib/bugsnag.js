const _ = require('lodash'),
    bugsnag = require('bugsnag'),
    API_KEY = process.env.BUGSNAG_API_KEY;

const Bugsnag = {

    enabled: process.env.NODE_ENV !== 'test' && _.isString(API_KEY) && API_KEY.length > 0,
    registered: false,

    /**
     * Errors from this list will NOT be sent to bugsnag
     */
    ignore: [],

    notify(err, options) {
        if (!err || !this.enabled) {
            return;
        }

        if (!this.registered) {
            bugsnag.register(API_KEY);
            this.registered = true;
        }

        options.error_data = err.data || {};

        if (this.shouldErrorBeReported(err)) {
            bugsnag.notify(err, options);
        }
    },

    shouldErrorBeReported(e) {
        return !_.find(this.ignore, error => e instanceof error);
    },
};

module.exports = Bugsnag;
