'use strict';
import {Geteor} from "../../../../server/core";
import {
    Athlete
} from "./collections";
import {TrainingSession} from "../../training-sessions/api/collections";
import {ROLES} from "../../../../server/security";
import {Coach} from "../../coaches/api/collections";

Geteor.publish('athlete', function (id) {
    let user = Meteor.user();
    if (user.roles && user.roles.includes(ROLES.COACH)
        && !Coach.isCoachAthlete(this.userId, id))
        return this.ready();

    return Athlete.cursorFindAthlete(id);
});


Geteor.publish('athlete.progress', function (athleteId, from, to) {
    return [
        TrainingSession.cursorFindSessionsBetween(athleteId, from, to)
    ]
});