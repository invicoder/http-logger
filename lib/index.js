const _ = require('lodash'),
    bunyan = require('bunyan'),
    os = require('os'),
    bugsnag = require('./bugsnag'),
    MaskFields = require('./mask_fields');

const LogLevels = {
    TRACE: 'trace',
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal',
};

const LOGGER_DEFAULTS = {
    name: 'logger',
    silent: false,
    level: LogLevels.INFO,
    defaultContext: {},
    instance: 'instance',
    internal: false,
    version: '0.0.1'
};

const report = (rec, context, options) => {
    options = _.defaults(options || {}, {
        ignore: []
    });
    let ignore = false;

    _.each(options.ignore, item => {
        const { key, value } = item;
        if (_.has(rec, key) && rec[key] === value) {
            ignore = true;
        }
    });

    if (ignore) return;
    bugsnag.notify(rec, context);
};

class Logger {
    constructor(config) {
        config = this.setConfig(config);
        this.status = '';

        const logger_params = {
            name: config.name,
            streams: config.silent ? [] : [{
                level: config.level,
                stream: process.stdout,
            }, {
                // also using additional, error, stream to log an error and above
                level: LogLevels.ERROR,
                stream: process.stderr
            }],
            serializers: { err: bunyan.stdSerializers.err }
        };
        this.bunyan_instance = bunyan.createLogger(logger_params);

        // mapping bunyan log methods to this
        _.forEach(LogLevels, (level) => {
            this[level] = this._write.bind(this, level);
        });
    }

    /**
     * Base method for outputting logs and reporting errors
     * @private
     */
    _write(level, rec, message, context) {
        const logged_context = this.fold(rec, message, context, this.context);
        const logged_object = this.buildRecord(rec, message, logged_context);
        const logged_message = logged_object.msg;

        const logger = this.bunyan_instance;
        if (_.isString(level) && logger && _.isFunction(logger[level])) {
            if (logged_message && logged_message.length) {
                logger[level](logged_object, logged_message);
            } else {
                logger[level](logged_object);
            }
        }

        logged_context.config = this.config;
        const bugsnag_context = {
            severity: (rec && rec.stack) ? LogLevels.ERROR : LogLevels.INFO,
            context: logged_context,
            userId: os.hostname(),
            metaData: {
                log: logged_object,
                config: this.config,
                errorData: logged_object.error_data || ((_.isObject(rec) && rec.data) ? rec.data : undefined),
            },
        };

        // chaining forward
        return {
            report: (options) => report(rec, bugsnag_context, options),
            rec: logged_object,
            msg: logged_message
        };
    }

    /**
     * Builds a logged object, carefully selecting fields from the supplied input
     * Applies a serialiser if provided (see `request_logger_serialiser`)
     * @returns {Object} logged object
     */
    buildRecord() {
        const logged_object = {};
        const logged_messages = [];

        for (let i = 0; i < arguments.length; i += 1) {
            const param = arguments[i] || {};
            if (param instanceof Error) {
                logged_object.err = param;
            } else if (_.isString(param) && param.length) {
                logged_messages.push(param);
            } else if (_.isArray(param)) {
                _.assign(logged_object, { array_data: param });
            } else if (_.isObject(param)) {
                _.assign(logged_object, param);
            }

            if (param && _.isString(param.message) && param.message.length) {
                logged_messages.push(param.message);
            }
        }
        if (_.isString(logged_object.msg)) {
            logged_messages.push(logged_object.msg);
        }
        logged_object.msg = logged_messages.join('; ');
        _.assign(logged_object, _.pick(this.config, ['name', 'instance', 'logger-filename']));
        return MaskFields.applyDeep(logged_object);
    }

    setConfig(config) {
        this.config = _.defaults(config || {}, LOGGER_DEFAULTS);
        this.context = _.clone(this.config.defaultContext);
        return this.config;
    }

    /**
     * Merge arguments into a single object using _.defaults
     * @returns {{}}
     */
    fold() {
        let result = {};
        try {
            const objects = _.filter(arguments, (obj) => {
                return _.isObject(obj) && !(obj instanceof Error);
            });
            result = objects.reduce((sum, next) => _.defaults({}, sum, next), {});
        } catch (e) {
            console.error(e);
        }
        return result;
    }

    /**
     * output current `status`
     * @param status
     * @returns {*}
     */
    status(status) {
        const ctx = this.context || {};
        if (!status) {
            return ctx.status;
        }
        ctx.status = status;
        this.info(status);
        return ctx.status;
    }

    /**
     * set logger's context to an empty object
     */
    resetContext() {
        this.setContext({});
    }

    /**
     * assign logger's context
     * Warning: does not respect `this.config.defaultContext`
     */
    setContext(obj) {
        this.context = obj || {};
    }
}

module.exports = Logger;
