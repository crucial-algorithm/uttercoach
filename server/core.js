import {Authorization} from './security';

let Geteor = {
    publish: function (name, callback) {
        Meteor.publish(name, function () {
            let args = Array.prototype.slice.call(arguments);
            if (!Authorization.isAuthorized(this.userId, name)) {
                return this.ready();
            }

            return callback.apply(this, args);
        });
    },

    methods: function (mtds, filename = null) {

        let methods = {};
        for (const [name, method] of Object.entries(mtds)) {
            if (filename) console.log(`[---]\t${filename}\t${name}`)

            methods[name] = (function (method, requiresAuth = true) {
                return function () {
                    let args = Array.prototype.slice.call(arguments);
                    if (requiresAuth === true && !Authorization.isAuthorized(this.userId, name)) {
                        throw new Meteor.Error("not-authorized:paddler");
                    }
                    return method.apply(this, args);
                }
            })(typeof method === 'function' ? method : method.method,
                typeof method === 'function' ? true : !(method.noAuth === true));
        }

        Meteor.methods(methods);

    }
};


export {
    Geteor
}
