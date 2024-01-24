import './summary.html';
import './summary.scss';


Template.genericPerformanceSummary.onCreated(function(){});

Template.genericPerformanceSummary.onRendered(function(){});

Template.genericPerformanceSummary.helpers({
    athleteId: function () {
        /**@type {SessionUI} */
        let session = this.session;
        return session.athleteId;
    },

    date: function () {
        /**@type {SessionUI} */
        let session = this.session;
        return session.date;
    },

    showSessionHourOnly: function () {
        return this.showSessionHourOnly === true;
    },

    expression: function () {
        /**@type {SessionUI} */
        let session = this.session;
        return session.expression;
    },

    fullDistance: function(){
        /**@type {SessionUI} */
        let session = this.session;
        return session.fullDistance;
    },
    fullDuration: function(){
        /**@type {SessionUI} */
        let session = this.session;
        return session.fullDuration;
    },
    avgSpm: function(){
        /**@type {SessionUI} */
        let session = this.session;
        return session.avgSpm;
    },

    count: function(){
        /**@type {SessionUI} */
        let session = this.session;
        return session.count;
    },

    sessionId: function () {
        /**@type {SessionUI} */
        let session = this.session;
        return session.sessionId;
    },

    showField: function(field) {
        /**@type Array<string> */
        let fields = this.include;
        return fields.indexOf(field) >= 0;
    },

    momentDateFormat: function () {
        return this.dateFormat || null
    }
});