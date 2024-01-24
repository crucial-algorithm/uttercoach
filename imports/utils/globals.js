/**
 * Wrap functions to be executed if in the context of an authenticated user.
 *
 * @param {Function} f
 * @param {string[]} [roles]
 *
 * @returns {Function}
 */
function requireAuth(f, roles) {

    return function () {

        const hasUser = !!this.userId;
        const hasRoles = (!roles || roles.length === 0 || Roles.userIsInRole(this.userId, roles));

        if (!hasUser || !hasRoles) {
            throw new Meteor.Error("not-authorized");
        }

        return f.apply(this, arguments);
    }
}


/**
 * Retrieve the current User object from the specified context.
 *
 * @param context
 *
 * @returns {null|User}
 */
function currentUser(context) {

    if (!context.userId) {
        return null;
    }

    return Meteor.users.findOne(context.userId);
}


export {requireAuth, currentUser}