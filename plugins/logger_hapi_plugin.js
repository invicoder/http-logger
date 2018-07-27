const _ = require('lodash'),
    Logger = require('../lib/index'),
    serialiser = require('../lib/hapi_serialiser');

/**
 * register defines our errorHandler plugin following the standard hapi-wrapper plugin
 * @param {Object} server - the server instance where the plugin is being used
 * @param {Object} options - any configuration options passed into the plugin
 * @returns {Function} h.continue is called when the plugin is finished
 */
exports.plugin = {

    register: function hapiLogger(server, options) {
        options = _.defaults(options || {}, {
            name: 'Hapi',
            level: 'info',
            instance: 'generic',
            minifyLogs: true,
        });
        const ServerLogger = new Logger(options);

        const prepare = (request, event_name) => {
            const loggedObject = options.minifyLogs ? serialiser.minified(request) : serialiser.full(request);
            return _.assign(loggedObject, { logged_event: event_name });
        };

        // onPreResponse intercepts ALL errors
        server.ext('onPreResponse', (request, h) => {
            const loggedObject = prepare(request, 'onPreResponse');
            if (loggedObject.err && loggedObject.status_code >= 500) {
                ServerLogger.error(loggedObject.err, loggedObject).report();
            } else {
                ServerLogger.info(loggedObject);
            }
            return h.continue; // continue processing the request
        });

        server.events.on({ name: 'request', channels: 'error' }, (request, { error }) => {
            const loggedObject = prepare(request, 'request-error');
            ServerLogger.error(error, loggedObject).report();
        });

        process.on('uncaughtException', (err) => {
            ServerLogger.error(err, { logged_event: 'uncaughtException' }).report();
        });
    },

    name: 'HapiLogger'
};
