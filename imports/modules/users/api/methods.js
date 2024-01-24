import {Meteor} from "meteor/meteor";
import { Random } from 'meteor/random';
import Notifier from "../../../utils/notifier";
import { Accounts } from 'meteor/accounts-base'
import ProfileSchema from "./schemas";
import {currentUser} from "../../../utils/globals";
import {ROLES} from "../../../../server/security";
import {Utils} from "../../../utils/utils";
import {logger} from "../../../utils/logger";
import {Coach, CoachAthleteGroup, Team} from "../../coaches/api/collections";
import EmailGenerationUtils from "../../../utils/email-generation-utils";
import i18n from "../../../utils/i18n";
import {
    Athlete,
    DEFAULT_HEART_RATE_ZONES, DEFAULT_HR_RANGE, DEFAULT_SPEED_ZONES_C1,
    DEFAULT_SPEED_ZONES_K1, DEFAULT_SPM_ZONES_C1,
    DEFAULT_SPM_ZONES_K1
} from "../../athletes/api/collections";
import {AppAuthToken, InviteToJoinGoPaddler, RecoverAccount} from "./collections";
import {TrainingSession} from "../../training-sessions/api/collections";
import {ServerPaymentTools} from "../../../utils/payments/server-payments";
import {UserUtils} from "./utils";
import {Geteor} from "../../../../server/core";

class UserMethods {
    /**
     *
     * @param {User} athlete
     * @return {Array}
     */
    static listAthleteCoaches(athlete) {
        let coaches = Team.athleteCoaches(athlete._id, false);
        let result = [], exclude = {};
        for (let coach of coaches) {
            exclude[coach.id]  = true;
            result.push({id: coach.id, name: coach.name, pending: false
                , code: coach.invitationCode})
        }

        coaches = Team.athleteCoaches(athlete._id, true);
        for (let coach of coaches) {
            if (exclude[coach.id]) continue;
            result.push({id: coach.id, name: coach.name, pending: true
                , code: coach.invitationCode})
        }
        return result;
    }

    static athleteHasCoach(athleteId) {
        return Team.athleteCoaches(athleteId, false).length > 0;
    }
}

Geteor.methods({

    /**
     * Save the profile for the current user.
     *
     * @param {Profile} data
     */
    saveProfile: function (data) {
        logger.info(`UserMethods: SaveProfile ${this.userId}`);

        // make sure we only keep the accepted profile attributes
        const profile = ProfileSchema.clean(data);

        // validate the profile values
        ProfileSchema.validate(profile);

        // update the user profile
        Meteor.users.update({_id: this.userId}, {$set: {profile: profile}});
    },

    /**
     * Activate / deactivate debug mode for a given user.
     *
     * @param {string} userId
     * @param {boolean} debug
     */
    setUserDebug: function (userId, debug) {
        logger.info(`UserMethods: setUserDebug ${this.userId}`);

        Meteor.users.update({_id: userId}, {$set: {'profile.debug': debug}});

    },

    /**
     * Set the user device model.
     *
     * @param {string} device
     */
    saveUserDevice: function (device) {
        logger.info(`UserMethods: saveUserDevice ${this.userId}`);
        Meteor.users.update({_id: this.userId}, {$set: {'profile.device': device}});
    },

    /**
     * Check if the current user has an associated coach.
     *
     * @returns {boolean}
     */
    hasCoach: function () {
        logger.info(`UserMethods: hasCoach ${this.userId}`);
        const user = currentUser(this);
        return UserMethods.athleteHasCoach(user._id)
    },

    getAthleteInfoPostLogin: function () {
        logger.info(`UserMethods: getAthleteInfoPostLogin ${this.userId}`);
        const user = currentUser(this);

        const athleteHasCoach = UserMethods.athleteHasCoach(this.userId);

        const athlete = Athlete.find(user._id);

        return {
            hasCoach: athleteHasCoach,
            boat: athlete.boat,
            heartRate: {resting: athlete.restingHeartRate, max: athlete.maxHeartRate},
            heartRateZones: athlete.heartRateZones,
            speedZones: athlete.speedZones,
            strokeRateZones: athlete.strokeRateZones,
            gender: athlete.gender,
            birthDate: athlete.birthDate,
            roles: user.roles,
            hasStrava: athlete.hasStrava(),
            stravaAthleteName: athlete.stravaAthleteName
        }
    },

    saveUserBoat: function (choice) {
        logger.info(`UserMethods: saveUserBoat ${this.userId}`);

        if (choice !== "K" && choice !== "C") {
            throw new Meteor.Error("400", "Invalid boat type");
        }


        let speedZones = choice === "K" ? DEFAULT_SPEED_ZONES_K1 : DEFAULT_SPEED_ZONES_C1
            , spmZones = choice === "K" ? DEFAULT_SPM_ZONES_K1 : DEFAULT_SPM_ZONES_C1;

        /**
         * @type {Athlete}
         */
        let athlete = Athlete.find(this.userId);

        if (athlete.boat === choice) return;

        athlete.boat = choice;

        let areZonesEqual = function (a, b) {
            if (a.length !== b.length) return false;
            for (let i = 0, l = a.length; i < l; i++) {
                if (a[i].start !== b[i].start || a[i].end !== b[i].end) {
                    return false;
                }
            }
            return true;
        };

        if (areZonesEqual(athlete.speedZones, athlete.boat === "K" ? DEFAULT_SPEED_ZONES_K1 : DEFAULT_SPEED_ZONES_C1)) {
            athlete.speedZones = speedZones;
        }

        if (areZonesEqual(athlete.strokeRateZones, athlete.boat === "K" ? DEFAULT_SPM_ZONES_K1 : DEFAULT_SPM_ZONES_C1)) {
            athlete.strokeRateZones = spmZones;
        }

        athlete.update();
    },

    saveUserLang: function (choice) {
        logger.info(`UserMethods: saveUserLang ${this.userId} to ${choice}`);
        Meteor.users.update({_id: this.userId}, {$set: {"profile.language": choice}});
    },

    saveMaxHeartRate: function (choice) {
        logger.info(`UserMethods: saveMaxHeartRate ${this.userId}`);
        let max = parseInt(choice);
        if (isNaN(max)) {
            throw new Meteor.Error("400", "Invalid max heart rate");
        }
        const athlete = Athlete.find(this.userId);

        Athlete.updateHeartRateInfo(this.userId, athlete.restingHeartRate, max);
    },

    saveHeartRate: function (resting, max) {
        logger.info(`UserMethods: saveHeartRate ${this.userId}`);
        resting = parseInt(resting);
        if (isNaN(resting)) {
            throw new Meteor.Error("400", "Invalid resting heart rate");
        }

        max = parseInt(max);
        if (isNaN(max)) {
            throw new Meteor.Error("400", "Invalid max heart rate");
        }

        Athlete.updateHeartRateInfo(this.userId, resting, max);
    },

    hideOnboardTutorial: function () {
        logger.info(`UserMethods: hideOnboardTutorial ${this.userId}`);
        Meteor.users.update({_id: this.userId}, {$set: {"profile.hideOnboardTutorial": true}});
    },

    listAthleteCoaches: function () {
        logger.info(`UserMethods: listAthleteCoaches ${this.userId}`);
        const athlete = currentUser(this);
        return UserMethods.listAthleteCoaches(athlete);
    },

    getCoachInfo: function (code) {
        logger.info(`UserMethods: getCoachInfo; Trying to find coach before sending invite to join team: #${code}`);
        let invitationCode = parseInt(code), /**@type Coach */ coach = null, inviteCoach = false;

        if ((code + "").indexOf("@") >= 0) { // it's an e-mail
            logger.debug(`Using e-mail ${code}`);
            coach = Coach.findByEmail(code);
            inviteCoach = !coach;
        } else if (!isNaN(invitationCode)) {
            logger.debug(`Using invitation code ${invitationCode}`);
            coach = Coach.findByInvitationCode(invitationCode);
        }

        if (coach) {
            logger.info(`coach found ${coach.id}`);
            return {
                id: coach.id,
                name: coach.name
            }
        }

        if (inviteCoach === true) {
            logger.debug(`Coach not found, but e-mail given back`);
            // if athlete call joinCoachTeam with an e-mail (confirming request) it will trigger an e-mail
            // notification for the coach to join GoPaddler
            return {
                id: code,
                name: code
            }
        }

        logger.debug(`Coach not found`);
        return null;
    },

    /**
     * Method used when athlete gets a link to join coach team...
     */
    acceptCoachInvite: function (athleteId, token) {
        logger.info(`UserMethods: acceptCoachInvite; Handling coach invite with token ${token}`);
        let invite = InviteToJoinGoPaddler.findByToken(token);
        if (!invite) {
            logger.info(`Coach invite with token ${token} requested but not found`);
            throw new Meteor.Error('no-token', "Token not found");
        }

        let coach = Coach.find(invite.from);
        coach.addAthleteToTeam(athleteId);

        logger.info(`Coach invite with ${token} generated response... ${coach.name}`);
        return {
            coachName: coach.name,
            createdAt: invite.createdAt
        }
    },

    /**
     * Due to an hack for version 1.5.0, coachId can actually be an e-mail: in that case, send an invite to that e-mail
     * to join GoPaddler
     */
    joinCoachTeam: function (coachId) {
        const athleteUser = currentUser(this);
        if (!athleteUser) return null;

        logger.info(`UserMethods: joinCoachTeam; Athlete ${this.userId} wants to join coach ${coachId} team`);

        if (coachId.indexOf("@") >= 0) { // non existing coach: send him an invite to the platform
            logger.debug(`Athlete used coach email, so it's a non existing coach that it's going to get an invite`);
            InviteToJoinGoPaddler.inviteCoach(this.userId, coachId);
            let language = "en";
            const link = Meteor.absoluteUrl(`join?email=${coachId}`);
            EmailGenerationUtils.generateAndSend(coachId
                , /* subject  = */ i18n.translate("email_coach_invite_subject", [athleteUser.profile.name], language)
                , /* text     = */ i18n.translate("email_coach_invite_text", [athleteUser.profile.name], language) + ": " + Meteor.absoluteUrl('coach-team')
                , /* template = */ "invite-coach-to-gopaddler"
                , /* values   = */ {
                    athlete: athleteUser.profile.name,
                    link: link
                }
                , /* language = */ language
            );
            return UserMethods.listAthleteCoaches(athleteUser);
        }

        let athlete = Athlete.find(athleteUser._id);
        if (!athlete) {
            return null;
        }

        let added = athlete.requestToJoinTeam(coachId);

        // don't send any message if the user duplicates an "join team request"
        if (!added) {
            logger.debug(`Athlete ${athlete.id} request is duplicate (${coachId})`);
            return UserMethods.listAthleteCoaches(athleteUser);
        }

        let coachUser = Meteor.users.findOne({_id: coachId});
        const language = i18n.language(coachUser);
        EmailGenerationUtils.generateAndSend(coachUser.profile.email
            , /* subject  = */ i18n.translate("email_athlete_invite_subject", [athleteUser.profile.name], language)
            , /* text     = */ i18n.translate("email_athlete_invite_action", [athleteUser.profile.name], language) + ": " + Meteor.absoluteUrl('coach-team')
            , /* template = */ "athlete-wants-to-join-team"
            , /* values   = */ {
                hello: i18n.translate("email_athlete_invite_hello", [coachUser.profile.name], language),
                callToAction: i18n.translate("email_athlete_invite_action", [athleteUser.profile.name], language)
            }
            , /* language = */ language
        );

        logger.debug(`Coach ${coachId} will get a request from (${athlete.id})`);
        return UserMethods.listAthleteCoaches(athleteUser);
    },

    leaveCoachTeam: async function (coachId) {
        const user = currentUser(this);

        logger.info(`UserMethods: leaveCoachTeam; Athlete ${this.userId} wants to leave ${coachId} team`);
        const athlete = Athlete.find(user._id);
        if (!athlete) return null;

        if (!athlete.leaveTeam(coachId)) {
            return null;
        }

        const coach = Coach.find(coachId);
        if (!coach) return null;

        if (coach.isTollFree()) return;

        try {
            const athletes = coach.nbrOfAthletes();
            let qty = athletes === 0 ? 1 : athletes;
            await ServerPaymentTools.updateSubscription(coach, qty);
        } catch (err) {
            throw err;
        }

        return UserMethods.listAthleteCoaches(user);
    },

    /**
     * Return the login status of the current user.
     *
     * @returns {boolean}
     */
    loginStatus: function () {
        logger.info(`UserMethods: loginStatus; checking for user ${this.userId}`);
        let user = Meteor.users.findOne({_id: this.userId});
        if (user.profile.deprecated !== true) {
            logger.debug(`Login status is ok ${this.userId}`);
            return {
                _id: user._id,
                profile: user.profile,
                roles: user.roles,
            }
        }

        const deprecatedUserId = this.userId, migrateToUserId = user.profile.migratedTo, salt = user.profile.salt;
        user = Meteor.users.findOne({_id: migrateToUserId});

        logger.info(`User is deprecated - migration requested by user ${this.userId} to user ${migrateToUserId}`);

        // TODO: make this async, because in users with a large amount of sessions, it will block response until timeout
        Meteor.setTimeout(function () {
            if (TrainingSession.migrateSessions(deprecatedUserId, migrateToUserId) > 0) {
                TrainingSession.reprocess(migrateToUserId);
            }
        }, 1000);

        return {
            swapped: true,
            token: Utils.SHA1(`${deprecatedUserId}+${salt}`),
            _id: user._id,
            profile: user.profile,
            roles: user.roles,
        }
    },

    /**
     * Create a new user with password (no Facebook auth).
     *
     * @param {SimpleUser} data
     * @deprecated
     *
     * @returns {any}
     */
    gpCreateUser: {
        method: function (data) {
            logger.info(`UserMethods: gpCreateUser; Creating a new user`);
            if (!Utils.isValidEmail(data.email))
                throw new Meteor.Error('invalid-email', "Invalid e-mail address");

            if (!Utils.isStrongPassword(data.password))
                throw new Meteor.Error('invalid-password', "Password must contain upper case letters and numbers");
            let profile = data.profile;
            profile.origin = UserUtils.ORIGINS.GOPADDLER;

            logger.debug(`UserMethods: gpCreateUser; email: ${data.email}`);

            return Accounts.createUser({
                email: data.email,
                password: data.password,
                profile: profile
            });
        },
        noAuth: true
    },

    gpCreateImplicitUser: {
        method: function (app) {
            logger.info(`UserMethods: gpCreateImplicitUser; Creating a new user from app ${app}`);
            const salt = Random.id();
            let token = Utils.SHA1(`${Random.id()}+${salt}`);
            const userId = Accounts.createUser({
                username: salt,
                password: token,
                profile: {
                    origin: app
                }
            });
            logger.debug(`UserMethods: gpCreateImplicitUser; User ${userId} created`);
            Accounts.setUsername(userId, userId);
            return {id: userId, token: token};
        },
        noAuth: true
    },

    migrateFacebookUser: function () {
        const user = currentUser(this);
        logger.info(`UserMethods: migrateFacebookUser; migrating facebook user with id = ${user._id}`);
        const salt = Random.id();
        const token = Utils.SHA1(`${user._id}+${salt}`);
        let hasEmail = !!user.profile.email, username = hasEmail ? user.profile.email : user._id + '@dummy.com';
        try {
            Accounts.setUsername(user._id, username);
            Accounts.setPassword(user._id, token, {logout: false});
            Accounts.addEmail(user._id, username);
        } catch(err) {
            logger.error(`failed to migrate user account with error ${err.reason}`);
            throw err
        }
        logger.info(`facebook user migrated = ${username}`);
        return token;
    },

    /**
     * Method called in the app when user updates his profile in the profile screen
     */
    updateUserProfile: function (name, email) {
        logger.info(`UserMethods: updateUserProfile; user ${this.userId} requested profile update`);

        let anUserWithSameEmail = Meteor.users.findOne({$or: [{"emails.address": email}, {"profile.email": email}]});

        if (anUserWithSameEmail && anUserWithSameEmail._id === this.userId) {
            anUserWithSameEmail = null;
        }

        const isCoach = anUserWithSameEmail && anUserWithSameEmail.roles && anUserWithSameEmail.roles.indexOf(ROLES.COACH) >= 0;
        let language = i18n.languageByUserId(this.userId);

        if (anUserWithSameEmail && isCoach === false) {
            logger.debug(`UserMethods: updateUserProfile; ${this.userId} an user with the same email already exists - send email to recover account`);
            const recoverAccount = RecoverAccount.create(anUserWithSameEmail._id, this.userId, email);
            const link = Meteor.absoluteUrl(`account-recovery/${recoverAccount.token}`);
            EmailGenerationUtils.generateAndSend(email
                , /* Subject = */ i18n.translate("email_recover_account_subject", [], language)
                , /* Text    = */i18n.translate("email_recover_account_text", [link], language)
                , "recover-account"
                , {
                    footerBackgroundColor: "#cccccc",
                    greeting: i18n.translate("email_recover_account_greeting", [anUserWithSameEmail.profile.name || ""], language),
                    link_reuse_account: link,
                    message_reuse_account: i18n.translate("email_recover_account_message", [], language),
                    warning: i18n.translate("email_recover_account_warning", [], language)
                }
                , language);

            Meteor.users.update({_id: this.userId}, {$set: {"profile.name": name}});
            Athlete.updateAthleteBasicInfo(this.userId, name);
            return 1;
        }

        if (anUserWithSameEmail && isCoach === true) {
            logger.error(`UserMethods: updateUserProfile; ${this.userId} an user with the same email already exists, but it's a coach... failing`);
            throw new Meteor.Error('coach_account_exists', 'There is an coach account with that e-mail already in the system');
        }

        const user = Meteor.users.findOne({_id: this.userId});
        if (user.profile.email !== email) {
            Accounts.addEmail(this.userId, email);
            Accounts.sendVerificationEmail(this.userId);
        }
        Meteor.users.update({_id: this.userId}, {$set: {"profile.name": name, "profile.email": email}});
        let athlete = Athlete.find(this.userId);
        if (athlete) {
            athlete.name = name;
            athlete.update();
        }
        logger.info(`UserMethods: updateUserProfile; user ${this.userId} profile updated`);
        return 1;


    },

    saveUserSport: function (option) {
        logger.info(`UserMethods: saveUserSport for user ${this.userId}`);
        Meteor.users.update({_id: this.userId}, {$set: {"profile.sport": option}});
    },

    /**
     * Method created only for creating accounts for letters to send to clubs;
     * NOT TO BE USED DIRECTLY BY THE SYSTEM
     *
     * @param {String} name
     * @param {String} coachUserName
     * @param {String} coachPassword
     * @param {String} athleteUserName
     * @param {String} athletePassword
     *
     * @returns {any}
     */
    createCoachForMail: function (name, coachUserName, coachPassword, athleteUserName, athletePassword) {

        if (!Roles.userIsInRole(this.userId, ['admin']))
            throw new Meteor.Error('not-allowed', "User not allowed to perform this action");

        let profile = {name: name + " athlete", origin: UserUtils.ORIGINS.GOPADDLER};

        Accounts.createUser({
            email: athleteUserName,
            password: athletePassword,
            profile: profile
        });

        profile = {name: name + " coach", origin: undefined};

        Accounts.createUser({
            email: coachUserName,
            password: coachPassword,
            profile: profile
        });

        return 2;
    },

    /**
     * Method created only for creating accounts for letters to send to clubs;
     * NOT TO BE USED DIRECTLY BY THE SYSTEM
     *
     * @returns {any}
     */
    buildTeamForCoachLetter: function (coachUserName, athleteUserName) {

        if (!Roles.userIsInRole(this.userId, ['admin']))
            throw new Meteor.Error('not-allowed', "User not allowed to perform this action");

        const coach = Meteor.users.findOne({"emails.address": coachUserName});
        const athlete = Meteor.users.findOne({"emails.address": athleteUserName});

        if (CoachAthleteGroup.findCoachGroups(coach._id).length > 0) {
            return new Meteor.error('setup-already-done', 'Duplicate attempt to create groups');
        }

        // CREATE GROUPS AND ADD ATHLETE TO GROUP
        new CoachAthleteGroup(coach._id, "Men K1's", [athlete._id], null).save();
        new CoachAthleteGroup(coach._id, "Women K1's", [], null).save();
        new CoachAthleteGroup(coach._id, "Men C1's", [], null).save();
        new CoachAthleteGroup(coach._id, "Women C1's", [], null).save();


        Team.joinCoachTeam(athlete._id, coach._id, true);
        return 2;
    },

    /**
     * Recover an existing user password.
     * @deprecated
     * @param {{email: string}} options
     */
    gpRecoverPassword: {
        method: function (options) {
            logger.info(`UserMethods: gpRecoverPassword for user ${this.userId} (request from app)`);

            const email = options.email;

            logger.info('Reset password for ' + email);

            const user = Accounts.findUserByEmail(email);

            if (!user) {
                handleError('User not found');
            }

            const userEmails = _.pluck(user.emails || [], 'address');

            const caseSensitiveEmail = _.find(userEmails, userEmail => {
                return userEmail.toLowerCase() === email.toLowerCase();
            });

            this.unblock();

            Accounts.sendResetPasswordEmail(user._id, caseSensitiveEmail);
        },
        noAuth: true
    },

    notify: {
        method: function (message) {
            Notifier.info(message);
        },
        noAuth: true
    },

    /**
     * @deprecated
     * @param requestId
     * @param {boolean} accepted
     */
    respondToCoachRequest: {
        method: function (requestId, accepted) {
            logger.info(`UserMethods: respondToCoachRequest for user ${this.userId} (request from app)`);
            // TODO: change this method to use Team methods
            const request = Meteor.requests.findOne({_id: requestId});
            if (!request) {
                return false;
            }

            if (accepted)
                request.accept();
            else
                request.cancel();

            return true;
        },
        noAuth: true
    },

    getUserName: {
        method: function (id) {
            const user = Meteor.users.findOne(id);
            return user ? user.profile.name : null;
        },
        noAuth: true
    },

    'Asteroid.loginWithGoPaddler': {
        method: function(loginInfo) {
            const user = Meteor.users.findOne({_id: loginInfo._id});
            if (!user) {
                throw new Meteor.Error("user-not-found");
            }

            logger.info(`UserMethods: User got to Asteroid.loginWithGoPaddler when nobody was supposed to get here: ${user._id}`);

            let profile = (loginInfo || {}).profile;
            if (profile.email !== user.profile.email
                || profile.boat !== user.profile.boat
                || profile.device.paddler !== user.profile.device.paddler
                || profile.language !== user.profile.language
                || loginInfo.roles.length !== user.roles.length
            ) {
                logger.error(`couldn't reconnect app because profiles don't match for ${user._id}: ${profile.email} | ${profile.boat} | ${profile.language} | ${profile.roles ? profile.roles.length : 'no roles'} | ${profile.device.paddler}`);
                throw new Meteor.Error("user-not-found");
            }

            let stampedToken = Accounts._generateStampedLoginToken();
            //hashing is something added with Meteor 0.7.x,
            //you don't need to do hashing in previous versions
            let hashStampedToken = Accounts._hashStampedToken(stampedToken);

            let update;
            // update user
            if (user.services.resume && user.services.resume.loginTokens) {
                update = {
                    $push: {'services.resume.loginTokens': hashStampedToken}
                }
            } else {
                update = {
                    $set: {'services.resume.loginTokens': [hashStampedToken]}
                }
            }
            Meteor.users.update(user._id, update);

            this.setUserId(user._id);

            return {
                userId: user._id,
                token: stampedToken.token,
                user: user
            };
        },
        noAuth: true
    },

    /**
     * Used in website, trying to prevent athletes to change their password because it would lead to
     * loosing their session in the app
     * @param email
     */
    nbResetPassword: {
        method: function (email) {
            logger.info(`UserMethods: nbResetPassword for user ${this.userId}`);
            const coach = Coach.findByEmail(email);
            if (!coach) {
                logger.info(`UserMethods: nbResetPassword user is an athlete ${this.userId}`);
                throw new Meteor.Error('user-is-athlete', "cannot change password for athlete");
            }

            Accounts.sendResetPasswordEmail(coach.id);
        },
        noAuth: true
    },

    sendEmailFromClient: function(to, subject, text, template, values, language) {
        EmailGenerationUtils.generateAndSend(to, subject, text, template, values, language);
    },

    createAppAuthToken: function() {
        const token = AppAuthToken.create(this.userId);
        return token.token;
    },

    /**
     * Intentionally not declared in security
     * @return {boolean}
     */
    dummyMethodForUnitTesting: function () {
        return false;
    }
});

/**
 * Set default values in user profile.
 */
Accounts.onCreateUser(function (options, user) {

    logger.debug(`UserMethods: onCreateUser; User ${user._id}`);

    if (user.services.facebook) {
        user.profile = loadFromFacebook(options, user);
    } else if (user.services.password) {
        user.profile = loadFromLocalAccount(options, user);
    }

    user.profile = ProfileSchema.clean(user.profile || {});

    logger.debug(`UserMethods: dir of profile; User ${user._id}`);

    user.roles = user.roles || [];
    user.roles.push(ROLES.ATHLETE);

    if (user.profile.origin === UserUtils.ORIGINS.WEB) {
        user.roles.push(ROLES.COACH);
        user.roles.push(ROLES.FF_LIVE_SESSIONS);
        user.profile.hideOnboardTutorial = false;

        let isDuplicate = true, code = null;
        do {
            code = Math.floor(Math.random() * 899999) + 100000;
            let coach = Coach.findByInvitationCode(code);
            if (!coach) {
                isDuplicate = false;
            }
        } while (isDuplicate);

        // create coach instance
        /**@type Coach */
        const coach = new Coach(user._id, user.profile.name, user.profile.email, Date.now(), code);
        coach.insert();

        // Create demo data
        CoachAthleteGroup.createInitialGroups(user._id);
        Coach.createDemoExpressions(user._id);
    }
    else {
        user.profile.welcomeEmailSent = false;
        new Athlete(user._id, user.profile.name, [], DEFAULT_HEART_RATE_ZONES
            , DEFAULT_SPM_ZONES_K1, DEFAULT_SPEED_ZONES_K1
            , null, null
            , {max: DEFAULT_HR_RANGE.MAX, resting: DEFAULT_HR_RANGE.RESTING}, null).insert();
    }

    Notifier.infoWithoutUser('Account created for user ' + user.profile.name + "; Source: " + user.profile.origin);
    logger.debug(`UserMethods: Account created for user ${user._id}; Source: ${user.profile.origin}`);

    return user;
});

let loadFromFacebook = function (options, user) {
    let service = user.services.facebook;
    return {
        email: service.email,
        name: service.name,
        gender: service.gender,
        origin: options.profile.origin || UserUtils.ORIGINS.WEB
    }
};

let loadFromLocalAccount = function (options, user) {
    return {
        email: options.email,
        name: options.profile.name,
        origin: options.profile.origin || UserUtils.ORIGINS.WEB
    }
};

/**
 * Notify new login actions on Slack.
 */
Accounts.onLogin(function (info) {

    if (info.type !== 'resume') {
        Notifier.info('New login');
    }

    const user = info.user;
    const coach = Coach.find(user._id);
    if (coach) {
        coach.justLoggedIn();

        // check if there was an invite for this coach
        let invites = InviteToJoinGoPaddler.findByEmail(user.profile.email);
        for (let invite of invites) {
            if (invite.used === true) continue;

            coach.addAthleteToTeam(invite.from);
            invite.markAsUsed();
        }
    }
});

