import { Router }             from 'meteor/iron:router';
import i18n from '../../utils/i18n';

import './ui/athlete.js';
import {CoachAthleteGroup} from "../coaches/api/collections";
import {Athlete} from "./api/collections";

/**
 * Athlete setup view controller.
 */
Router.route('/athlete/:_id', {
    name: 'athlete',
    title: function() {
        const title = i18n.translate("main_sidebar_menu_athlete_progress");
        const data = this.data();
        if (!data)
            return title;
        /**@Type Athlete */
        const athlete = data.athlete;
        if (!athlete)
            return title;
        return athlete.name || title;
    },
    template: 'athlete',
    parent: "coach-team",
    waitOn: function () {

        if (!Meteor.userId()) {
            return;
        }

        return [
            Meteor.subscribe('coachAthleteGroups.forAthlete', this.params._id),
            Meteor.subscribe('coachAthleteGroups.allAthletesGroups', this.params._id),
            Meteor.subscribe('athlete', this.params._id)
        ];
    },
    data: function () {
        let athleteId = this.params._id;
        let user = Meteor.user(), name = "", athleteGroups;

        if (!user) {
            return {
                athleteId: athleteId,
                athleteGroup: "-"
            };
        }

        if (user.roles && user.roles.indexOf('coach') >= 0) {
            let instance = CoachAthleteGroup.findCoachGroupForAthlete(athleteId, Meteor.userId());
            if (instance) name = instance.name;
        } else {
            athleteGroups = CoachAthleteGroup.findAllAthleteGroups(athleteId);
            if (athleteGroups.length > 0)
                name = athleteGroups[0].name;
        }

        return {
            athlete: Athlete.find(athleteId),
            athleteId: athleteId,
            athleteGroup: name
        };
    }
});
