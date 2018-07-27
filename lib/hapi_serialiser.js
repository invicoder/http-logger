const _ = require('lodash'),
    moment = require('moment'),
    MaskFields = require('./mask_fields');


/**
 * https://momentjs.com/docs/#/displaying/format/
 * @type {Object}
 */
const DATE_FORMAT = {
    date: 'YYYY-MM-DD',
    time: 'HH:mm:ssZ',
};

const DEFAULT_ERROR_MESSAGE = 'Oops, something unexpected happened';

const minified_fields = ['req_id', 'status_code', 'method', 'url', 'req_body', 'err', 'error_data', 'msg', 'data'];

module.exports = {

    full(request) {
        request = _.defaults(request || {}, {
            raw: {},
            response: {},
            payload: {},
            id: null,
            url: {},
            auth: {},
            info: {}
        });
        const { raw, response, payload, id, url, auth, info } = request;
        const req = raw.req || {};
        let entry = {};
        const timestamp = moment();

        try {
            entry = _.assign(entry, {
                msg: 'onPreResponse',
                req_id: id,
                status_code: 200,
                method: req.method,
                url: url.path, // the path the person requested,
                user: auth.credentials,
                info,
                req_body: payload,
                res_body: (response && response.source) ? response.source : null,
                ip: info.remoteAddress,
                referrer: info.referrer,
                headers: req.headers, // all HTTP Headers
                err: null,
                req_date: timestamp.format(DATE_FORMAT.date),
                req_time: timestamp.format(DATE_FORMAT.time),
            });

            if (response.isBoom) {
                const error_info = response.output.payload;
                entry.err = new Error(error_info.message || DEFAULT_ERROR_MESSAGE);
                entry.err.name = error_info.error;
                entry.err.code = error_info.statusCode;
                entry.err.statusCode = error_info.statusCode;
                entry.err.stack = response.stack;
                entry.status_code = error_info.statusCode || error_info.code;
                if (response.data) {
                    entry.error_data = response.data;
                }
            }

            entry = _.assign(entry, request.context);
            entry = _.omitBy(entry, (_v) => {
                return _.isNil(_v) || _.isFunction(_v);
            });
            entry = MaskFields.applyDeep(entry);
        } catch (e) {
            entry.error = e;
        }
        return entry;
    },

    minified(request) {
        return _.pick(this.full(request), minified_fields);
    }

};
