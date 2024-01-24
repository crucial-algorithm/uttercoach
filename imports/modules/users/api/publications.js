import {Meteor} from "meteor/meteor";
import {requireAuth, currentUser} from "../../../utils/globals";
import {InviteToJoinGoPaddler, RecoverAccount} from './collections'
import {Coach} from "../../coaches/api/collections";
import {Athlete} from "../../athletes/api/collections";

Meteor.publish(null, function () {
    let user = Meteor.users.find({_id: this.userId}, {
        fields: {
            'services.facebook.id': 1
        }
    });
    return [ user
        , Coach.cursorFind(this.userId)
        , Athlete.cursorFindAthlete(this.userId)
    ];
});


/**
 * Search users by name.
 *
 * @param {string} name
 *
 * @returns {Cursor}
 */
Meteor.publish('users.search', requireAuth(function (name) {

    // only search users if search term has 3 or more characters
    if (!name || name.length < 3) {
        return this.ready();
    }

    return Meteor.users.find({
        'profile.name': {$regex: new RegExp(name, "i")},
        _id: {$ne: this.userId}
    }, {
        fields: {
            _id: 1,
            'profile.name': 1,
            'services.facebook.id': 1
        }
    });

}, ['coach']));

Meteor.publish('account.recovery.token', function (token) {
    return RecoverAccount.cursorFindByToken(token)
});

Meteor.publish('joinGoPaddlerToken', function (token) {
    const invite = InviteToJoinGoPaddler.findByToken(token);
    if (!invite) {
        return [];
    }

    if (invite.isCoachToAthlete())     return [InviteToJoinGoPaddler.cursorFindByToken(token), Coach.cursorFind(invite.from)];

    return [InviteToJoinGoPaddler.cursorFindByToken(token), Athlete.cursorFindAthlete(invite.from)]
});