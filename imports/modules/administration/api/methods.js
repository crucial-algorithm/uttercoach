import {Geteor} from "../../../../server/core";
import {
    TrainingSession,
    TrainingSessions,
    TrainingSessionsWeeklySummary
} from "../../training-sessions/api/collections";
import {Team, CoachAthleteGroup, Coach} from "../../coaches/api/collections";
import {Athlete} from "../../athletes/api/collections";

Geteor.methods({
    basicReport: function () {

        let start = moment().subtract(30, 'days').startOf('day');
        let finish = moment().add(1, 'day').startOf('day');

        let day = moment(start);
        let series = {};
        while (finish.diff(day) >= 0) {
            series[day.week()] = {
                users: {
                    active: 0,
                    created: 0
                },
                sessions: {
                    count: 0,
                    distance: 0,
                    duration: 0
                },
                coaches: {
                    created: 0
                },
                athletes: {
                    created: 0
                }
            };

            day = day.add(1, 'day');
        }

        let weeklySummaries = TrainingSessionsWeeklySummary.find({
            $and: [{date: {$gte: start.toDate()}}, {date: {$lt: finish.toDate()}}],
            sumDistance: {$gte: 2}
        }).fetch();

        let keys = {};
        for (let session of weeklySummaries) {
            let record = series[moment(session.date).week()];

            if (!keys[session.user]) {
                record.users.active++;
                keys[session.user] = {
                    user: session.user,
                    distance: 0
                };
            }

            keys[session.user].distance += session.sumDistance;

            record.sessions.count += (session.count || 0);
            record.sessions.distance += session.sumDistance;
            record.sessions.duration += session.sumDuration;
        }

        let mostActiveUsers = Object.values(keys).sort(function (a, b) {
            if (a.distance > b.distance) return -1;
            if (a.distance < b.distance) return +1;
            return 0;
        }).splice(0, 10);

        let users = Meteor.users.find({$and:[{createdAt: {$gte: start.toDate()}}, {createdAt: {$lt: finish.toDate()}}]}).fetch();
        for (let user of users) {
            let record = series[moment(user.createdAt).week()];

            if (user.roles.indexOf('coach') >= 0) {
                record.coaches.created++;
            } else {
                record.athletes.created++;
            }
        }
        return {series: series, mostActiveUsers: mostActiveUsers};

    },

    basicReportPositions: function() {
        let start = moment().subtract(30, 'days').startOf('day');
        let finish = moment().subtract(1, 'day').startOf('day');

        let sessions = TrainingSession.findAllSessionsBetween(start.toDate(), finish.toDate());

        let positions = [];
        for (let s of sessions) {
            if (s.distance < 2) continue;
            let data = s.randomLatLng();
            positions.push({distance: s.distance, lat: data.lat, lng: data.lng, country: null});
        }


        return new Promise(function (resolve, reject) {
            let app = 'gopaddler';

            // loop all documents, asynchronously
            (function loop(coords) {

                if (coords.length === 0) {

                    resolve(positions);
                    return;
                }

                let doc = coords.shift();

                HTTP.call('get', `http://api.geonames.org/countryCodeJSON?lat=${doc.lat}&lng=${doc.lng}&username=${app}`
                    , {}, function (error, response) {
                        if (error) {
                            console.err(error);
                        } else {
                            doc.country = JSON.parse(response.content).countryCode;
                        }
                        loop(coords);
                    });
            })(positions.slice(0));
        });
    },

    migrateToNewTeamStructure: function () {
        const groups = CoachAthleteGroup.all();
        for (let group of groups) {
            for (let athleteId of group.athletes) {
                console.log(`${group.coachId} -> ${athleteId}`);
                Team.joinCoachTeam(athleteId, group.coachId, true);
            }
        }
    },

    migrateCoachInvitationCode: function() {
        let users = Meteor.users.find({roles:"coach"});
        for (let user of users) {
            const coach = Coach.find(user._id);
            if (!coach) {
                console.log('no coach found for ', user._id);
            }

            coach.invitationCode = user.profile.invitationCode;
            coach.email = user.profile.email;

            coach.save();
        }
    },

    copyAthleteName: function() {
        let users = Meteor.users.find({roles: {$ne: "coach"}}).fetch();
        for (let user of users) {
            /**@type Athlete */
            const athlete = Athlete.find(user._id);
            if (!athlete) {
                console.log('no athlete found for ', user._id);
                continue;
            }
            if (athlete.name) continue;

            if (!user.profile) {
                console.log('wtf', user._id);
                continue;
            }

            athlete.name = user.profile.name;
            athlete.update(false);
        }
    }

});
