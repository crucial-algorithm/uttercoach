"use strict";

import {Geteor} from "../../../../server/core";
import {Athlete} from "./collections";
import {Coach} from "../../coaches/api/collections";

Geteor.methods({
    checkApiVersion: function() {
        // Never used, zero equates to no API version management
        // return 0;

        // App starts to use meters instead of km to store distance
        // return 1;

        // new methods to ensure that sessions are properly started
        return 2
    },


    addAthleteMeasurement: function (athleteId, weight, height, fat) {
        if (!Coach.isCoachAthlete(this.userId, athleteId))
            throw new Meteor.Error("not-authorized:paddler");

        return Athlete.addMeasurement(athleteId, weight, height, fat, Date.now())
    },

    editAthleteMeasurement: function (athleteId, weight, height, fat, when) {
        if (!Coach.isCoachAthlete(this.userId, athleteId))
            throw new Meteor.Error("not-authorized:paddler");

        console.log(athleteId, weight, height, fat, when);
        return Athlete.editMeasurement(athleteId, weight, height, fat, when)
    },

    updateHeartRateZones: function (athleteId, zones) {
        /**@type Athlete */
        if (!Coach.isCoachAthlete(this.userId, athleteId))
            throw new Meteor.Error("not-authorized:paddler");

        const athlete = Athlete.find(athleteId);
        athlete.heartRateZones = zones;
        athlete.update();
    },

    updateStrokeRateZones: function (athleteId, zones) {
        /**@type Athlete */
        if (!Coach.isCoachAthlete(this.userId, athleteId))
            throw new Meteor.Error("not-authorized:paddler");

        const athlete = Athlete.find(athleteId);
        athlete.strokeRateZones = zones;
        athlete.update();
    },

    updateSpeedZones: function (athleteId, zones) {
        /**@type Athlete */
        if (!Coach.isCoachAthlete(this.userId, athleteId))
            throw new Meteor.Error("not-authorized:paddler");

        const athlete = Athlete.find(athleteId);
        athlete.speedZones = zones;
        athlete.update();
    },

    /**
     *
     * @param {string[]} athletes
     * @param zones
     */
    updateAthletesSpeedZones: function (athletes, zones) {

        for (let id of athletes) {
            /**@type Athlete */
            if (!Coach.isCoachAthlete(this.userId, id))
                throw new Meteor.Error("not-authorized:paddler");

            const athlete = Athlete.find(id);
            athlete.speedZones = zones;
            athlete.update();
        }

    },

    updateAthletesStrokeRateZones: function (athletes, zones) {

        for (let id of athletes) {
            /**@type Athlete */
            if (!Coach.isCoachAthlete(this.userId, id))
                throw new Meteor.Error("not-authorized:paddler");

            const athlete = Athlete.find(id);
            athlete.strokeRateZones = zones;
            athlete.update();
        }

    },

    updateAthletesHeartRateZones: function (athletes, zones) {

        for (let id of athletes) {
            /**@type Athlete */
            if (!Coach.isCoachAthlete(this.userId, id))
                throw new Meteor.Error("not-authorized:paddler");

            const athlete = Athlete.find(id);
            athlete.heartRateZones = zones;
            athlete.update();
        }

    },

    updateAthleteProfile: function (athleteId, gender, boat, restingHeartRate, maxHeartRate, birthDate) {
        if (!Coach.isCoachAthlete(this.userId, athleteId))
            throw new Meteor.Error("not-authorized:paddler");

        return Athlete.updateAthleteProfile(athleteId, gender, boat, restingHeartRate, maxHeartRate, birthDate);
    }

});

