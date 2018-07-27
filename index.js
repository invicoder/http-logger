const _ = require('lodash'),
    MaskFields = require('./lib/mask_fields'),
    Logger = require('./lib/index'),
    HapiLogger = require('./plugins/logger_hapi_plugin');

const DefaultLoggerConfig = {
    level: 'info',
    name: `default-logger`,
    instance: `default-instance`,
    silent: false,
};

function getLogger(config) {
    if (_.isString(config)) {
        config = { 'logger-filename': config };
    }
    return new Logger(_.defaults(config, DefaultLoggerConfig));
}

module.exports = {
    LoggerUtils: {
        MaskFields
    },
    getLogger,
    HapiLogger,
    Logger,
};