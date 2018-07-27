const _ = require('lodash'),
    MASK_STRING = '*******',
    MAX_DEPTH = 4;


module.exports = {

    maskString: MASK_STRING,

    masks: {
        password: MASK_STRING,
        password_hash: MASK_STRING,
        email: MASK_STRING,
        authentication_token: MASK_STRING,
        encrypted_password: MASK_STRING,
        access_token: MASK_STRING,
        authorization: MASK_STRING,
        accessKeyId: MASK_STRING,
        secretAccessKey: MASK_STRING,
        api_key: MASK_STRING,
        api_secret: MASK_STRING,
        API_KEY: MASK_STRING,
        API_SECRET: MASK_STRING,
    },

    /**
     * Deep search and replace values in "obj" with those defined in mask
     * @param obj
     * @param mask
     * @return {object|array} the new object or array
     */
    applyDeep(obj, mask) {
        if (!obj) return obj;// returning as received, undefined or null
        mask = _.defaults(mask || {}, this.masks);
        return this.deepReplaceUsingMask(obj, mask);
    },

    /**
     * Deep search and replaces value at the given "key" with "newVal". Warning: modifies the original object
     * @param  {string} key
     * @param  {any} newVal
     * @param  {object} object - the original object in which the values should be replaced
     * @return {object} the modified object
     */
    deepReplaceKey(key, newVal, object) {
        if (!object) return object;

        let currentLevel = 0;

        const deepMap = (obj, iterator, context) => {
            // special case when copying Date:
            if (_.isDate(obj)) {
                return new Date(obj);
            }

            if (obj instanceof Error) {
                return obj;
            }

            if (currentLevel > MAX_DEPTH) {
                return obj;
            }

            currentLevel += 1;
            return _.transform(obj, (result, _v, _k) => {
                result[_k] = (_.isObject(_v) && _k !== key)
                    ? deepMap(_v, iterator, context)
                    : iterator.call(context, _v, _k, obj);
            });
        };
        object = deepMap(object, (_v, _k) => {
            return _k === key ? newVal : _v;
        });
        return object;
    },

    /**
     * Deep search and replace values in "obj" with those defined in "mask". Returns new object.
     * @param obj
     * @param mask
     * @returns {object} the new object
     */
    deepReplaceUsingMask(obj, mask) {
        if (!obj) return obj;// returning as received, undefined or null
        mask = mask || {};
        let clone = _.cloneDeep(obj);
        _.forEach(mask, (v, k) => {
            clone = this.deepReplaceKey(k, v, clone);
        });
        return clone;
    }

};
