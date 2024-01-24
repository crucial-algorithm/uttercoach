import {Meteor} from "meteor/meteor";
import {Template} from "meteor/templating";
import {Utils} from "../utils/utils.js";
import i18n from "../utils/i18n";
import {Athlete} from "../modules/athletes/api/collections";
import {Coach} from "../modules/coaches/api/collections";
import numbro from "numbro";


Template.registerHelper('distanceToString', function (distance) {

    return Utils.formatNumber(distance);
});

Template.registerHelper('durationToString', function (input) {

    input = parseInt((input === null || input === undefined || isNaN(input) ? 0 : input), 10);

    return moment.duration(input).format('hh:mm:ss', {trim: false});
});

Template.registerHelper('friends', function () {

    var currentUser = Meteor.user();

    if (!currentUser) {
        return;
    }

    return currentUser.friends();
});

Template.registerHelper('userId', function () {
    return Meteor.userId();
});

Template.registerHelper('number', Utils.formatNumber);
Template.registerHelper('formatDate', Utils.formatDate);
Template.registerHelper('formatDurationInTimeShort', Utils.formatDurationInTimeShort);
Template.registerHelper('dateToString', Utils.displayDate);
Template.registerHelper('trainingSessionTitle', Utils.trainingSessionTitle);
Template.registerHelper('userName', function (id) {
    let user = Meteor.users.findOne(id);
    return (user && user.profile ? user.profile.name : '');
});
Template.registerHelper('firstName', function (id) {
    let user = Meteor.users.findOne(id);
    let name = (user && user.profile ? user.profile.name : '');

    return name.split(" ")[0];
});
Template.registerHelper('currentYear', function () {
    return new Date().getFullYear();
});

Template.registerHelper('translate', function (key) {
    let args = Array.from(arguments);
    const placeholders = args.splice(1);
    return i18n.translate(key, placeholders);
});

Template.registerHelper('getLanguage', function () {
    return i18n.language();
});

Template.registerHelper('coachInvitationCode', function () {
    let user = Meteor.user();
    if (!user) return '';
    const coach = Coach.find(user._id);
    if (!coach) {
        return '';
    }
    return coach.invitationCode;
});

Template.registerHelper('isProduction', function () {
    return Meteor.isProduction === true;
});

Template.registerHelper('selected', function(key, value) {
    return key === value ? 'selected' : '';
});

Template.registerHelper('checked', function(key, value) {
    return key === value ? 'checked' : '';
});

Template.registerHelper('active', function(key, value) {
    return key === value ? 'active' : '';
});

Template.registerHelper('disabled', function(value) {
    return value === true ? 'disabled' : '';
});

Template.registerHelper('athleteName', function (id) {
    let athlete = Athlete.find(id);
    return athlete ? athlete.name : '';
});

Template.registerHelper('formatDistance', function (distance) {
    return numbro(distance).format('0.00');
});

Template.registerHelper('formatAvgSpm', function (value) {
    if (isNaN(value)) value = 0;
    return numbro(value).format('0');
});

Template.registerHelper('formatAvgHeartRate', function (value) {
    return numbro(value || 0).format('0');
});

Template.registerHelper('formatSessionDate',
    /**
     * @param {Date} value
     * @param hourOnly
     * @param dateFormat
     * */ function (value, hourOnly = false, dateFormat = "dddd, HH:mm") {
    if (hourOnly)
        return moment(value).format("HH:mm");

    return moment(value).format(dateFormat);
});

/**
 *
 * @param {SessionUI} session
 */
function calculateAverageSpeed(session) {
    let speed = Utils.calculateAverageSpeed(session.fullDistance, session.fullDuration);
    if (session.distance > 0) {
        speed = Utils.calculateAverageSpeed(session.distance, session.duration);
    }
    return speed;
}

Template.registerHelper('calcAvgSpeed', /**@param {SessionUI} session */function (session) {
    if (!session) throw 'helper requires a session';
    return numbro(calculateAverageSpeed(session)).format('0.00');
});

Template.registerHelper('calcAvgDPS', /**@param {SessionUI} session */ function (session) {
    let value = Utils.calculateStrokeLength(session.avgSpm, calculateAverageSpeed(session));
    return numbro(value).format('0.00');
});


