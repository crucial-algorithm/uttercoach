import {logger} from "../imports/utils/logger";

/**
* TODO: put permission into database, to allow permissions to be edit without
* the need for a new deployment
*/

const ROLES = {
    ATHLETE: "athlete",
    COACH: "coach",
    ADMIN: "admin",
    FF_LIVE_SESSIONS: "x-live-sessions",
    FF_SPLIT_SESSIONS: "x-coach-split-session"
};

const permissions = {
    "saveProfile":[ROLES.ATHLETE, ROLES.COACH],
    "setUserDebug": [ROLES.ADMIN],
    "saveUserDevice": [ROLES.ATHLETE],
    "hasCoach": [ROLES.ATHLETE],
    "getAthleteInfoPostLogin": [ROLES.ATHLETE],
    "saveUserBoat": [ROLES.ATHLETE],
    "saveUserLang": [ROLES.ATHLETE],
    "saveMaxHeartRate": [ROLES.ATHLETE],
    "saveHeartRate": [ROLES.ATHLETE],
    "hideOnboardTutorial": [ROLES.ATHLETE],
    "listAthleteCoaches": [ROLES.ATHLETE],
    "getCoachInfo": [ROLES.ATHLETE],
    "acceptCoachInvite": [ROLES.ATHLETE],
    "joinCoachTeam": [ROLES.ATHLETE],
    "leaveCoachTeam": [ROLES.ATHLETE],
    "loginStatus": [ROLES.ATHLETE],
    "gpCreateUser": [],
    "gpCreateImplicitUser": [],
    "migrateFacebookUser": [ROLES.ATHLETE],
    "updateUserProfile": [ROLES.ATHLETE],
    "saveUserSport": [ROLES.ATHLETE],
    "createCoachForMail": [ROLES.ATHLETE],
    "buildTeamForCoachLetter": [ROLES.ATHLETE],
    "gpRecoverPassword": [],
    "notify": [],
    "getUserName": [],
    "Asteroid.loginWithGoPaddler": [ROLES.ATHLETE],
    "nbResetPassword": [],
    "sendEmailFromClient": [ROLES.ATHLETE],
    "createAppAuthToken": [ROLES.ATHLETE],




    // public
    "joinGoPaddlerToken": [],
    "strava.authUrl": [],

    // coach methods
    "saveCoachTrainingSession": [ROLES.COACH],
    "deleteCoachTrainingSession": [ROLES.COACH],
    "saveCoachAthleteGroup": [ROLES.COACH],
    "swapAthlete": [ROLES.COACH],
    "deleteCoachAthleteGroup": [ROLES.COACH],
    "saveCoachTrainingExpression": [ROLES.COACH],
    "deleteCoachTrainingExpression": [ROLES.COACH],
    "deviceSpotted": [ROLES.COACH],
    "pushStartSessionToLiveDevices": [ROLES.COACH],
    "pushFinishToLiveDevices": [ROLES.COACH],
    "pushPingLiveDevices": [ROLES.COACH],
    "pushFinishWarmUpToLiveDevices": [ROLES.COACH],
    "pushStartSplitToLiveDevices": [ROLES.COACH],
    "pushStopSplitToLiveDevices": [ROLES.COACH],
    "pushNextSplitToLiveDevices": [ROLES.COACH],
    "createPartialInSplit": [ROLES.COACH],
    "syncDevicesClock": [ROLES.COACH],
    "getServerTime": [ROLES.COACH],
    "storeCoachLatency": [ROLES.COACH],
    "coachLiveSessionRoute": [ROLES.COACH],
    "debugScheduledSessions": [ROLES.COACH],
    "pushStopSplitInDevice": [ROLES.COACH],
    "listAllDevices": [ROLES.COACH],
    "acceptAthleteRequestToJoinTeam": [ROLES.COACH],
    "removeAthleteFromTeam": [ROLES.COACH],
    "coachAthletesInfo": [ROLES.COACH],
    "updateLiveSessionNotes": [ROLES.COACH],
    "listCoachDevices": [ROLES.COACH],
    "addDeviceToSession": [ROLES.COACH],
    "addAthleteMeasurement": [ROLES.COACH],
    "editAthleteMeasurement": [ROLES.COACH],
    "updateHeartRateZones": [ROLES.COACH],
    "updateStrokeRateZones": [ROLES.COACH],
    "updateSpeedZones": [ROLES.COACH],
    "athlete": [ROLES.COACH, ROLES.ATHLETE],
    "updateAthletesHeartRateZones": [ROLES.COACH],
    "updateAthletesStrokeRateZones": [ROLES.COACH],
    "updateAthletesSpeedZones": [ROLES.COACH],
    "updateAthleteProfile": [ROLES.COACH],
    "createPaymentSession": [ROLES.COACH],
    "updateCoachPaymentMethod": [ROLES.COACH],
    "retrieveStripeCoachPaymentInfo": [ROLES.COACH],
    "startCoachSubscription": [ROLES.COACH],
    "redeemActiveDiscount": [ROLES.COACH],
    "cancelCoachSubscription": [ROLES.COACH],
    "isAddingAnAthleteToTeamGoingToIncreaseCost": [ROLES.COACH],
    "calculateSplitsInFreeSession": [ROLES.COACH, ROLES.FF_SPLIT_SESSIONS],
    "rollbackToFreeSession": [ROLES.COACH, ROLES.FF_SPLIT_SESSIONS],
    "saveCoachPrimarySport": [ROLES.COACH],
    "coachInviteAthletesToJoinTeam": [ROLES.COACH],
    "rejectAthleteRequest": [ROLES.COACH],
    "suppressSession": [ROLES.COACH],


    // Athlete methods
    "listScheduledSessions": [ROLES.ATHLETE],
    "saveTrainingSession": [ROLES.ATHLETE],
    "deleteTrainingSession": [ROLES.ATHLETE, ROLES.COACH],
    "saveTrainingSessionDebug": [ROLES.ATHLETE],
    "getGroupAthletesData": [ROLES.ATHLETE, ROLES.COACH],
    "getCoachAthletesSessionsForAWeek": [ROLES.ATHLETE, ROLES.COACH],
    "deviceReadyToStart": [ROLES.ATHLETE],
    "deviceDisconnected": [ROLES.ATHLETE],
    "deviceStarted": [ROLES.ATHLETE],
    "deviceFinishedWarmUp": [ROLES.ATHLETE],
    "deviceFinished": [ROLES.ATHLETE],
    "liveUpdate": [ROLES.ATHLETE],
    "updateDeviceStatus": [ROLES.ATHLETE],
    "getCoachSession": [ROLES.ATHLETE, ROLES.COACH],
    "commandSyncedInDevice": [ROLES.ATHLETE],
    "syncDeviceClock": [ROLES.COACH, ROLES.ATHLETE],
    "createLiveSessionTriggeredByAthlete": [ROLES.ATHLETE],
    "splitChangedInLiveDevice": [ROLES.ATHLETE],
    "checkApiVersion": [ROLES.ATHLETE],
    "respondToCoachRequest": [ROLES.ATHLETE],
    "coachAthleteGroups.allAthletesGroups": [ROLES.ATHLETE],
    "athlete.progress": [ROLES.ATHLETE, ROLES.COACH],
    "strava.disconnect": [ROLES.ATHLETE],


    // admin methods
    "basicReport": [ROLES.ADMIN],
    "basicReportPositions": [ROLES.ADMIN],


    // coach publications
    "coachTrainingSessions.month": [ROLES.COACH],
    "coachTrainingSessions.interval": [ROLES.COACH],
    "coachTrainingSessions.detail": [ROLES.COACH],
    "coachAthleteGroups.all": [ROLES.COACH],
    "coachAthleteGroups.forAthlete": [ROLES.COACH, ROLES.ATHLETE],
    "coachTrainingExpressions.all": [ROLES.COACH],
    "coachTrainingExpressions.forSession": [ROLES.COACH],
    "coachLiveDevicesForSession": [ROLES.COACH, ROLES.FF_LIVE_SESSIONS],
    "coachLiveSessions": [ROLES.COACH, ROLES.FF_LIVE_SESSIONS],
    "coachLiveSession": [ROLES.COACH, ROLES.FF_LIVE_SESSIONS],
    "coachLiveDevicesData": [ROLES.COACH, ROLES.FF_LIVE_SESSIONS],
    "coachLiveSessionAthletes": [ROLES.COACH, ROLES.FF_LIVE_SESSIONS],
    "coachLiveDevicesDataHist": [ROLES.COACH, ROLES.FF_LIVE_SESSIONS],
    "coachLiveSessionSplits": [ROLES.COACH, ROLES.FF_LIVE_SESSIONS],
    "trainingSessions.forCoachAthletes": [ROLES.COACH],
    "coach.team": [ROLES.COACH],
    "dashboard": [ROLES.COACH],
    "removeDeviceFromSession": [ROLES.COACH],
    "coachLiveActiveSessionsRoute": [ROLES.COACH],
    "pushHardResetToDevice": [ROLES.COACH, ROLES.ADMIN],
    "coach.info": [ROLES.COACH, ROLES.ADMIN],
    "coachLiveTeamInfo": [ROLES.COACH, ROLES.ADMIN],
    "coach.basic": [ROLES.COACH],
    "coach.trainingSessions": [ROLES.COACH],
    "coach.schedule": [ROLES.COACH],
    "coach.live": [ROLES.COACH],


    // athlete publications
    "trainingSessions.for.day": [ROLES.ATHLETE],


    //
    "debug.live.sessions": [ROLES.ADMIN],
    "users.latest": [ROLES.ADMIN],
    "coach.all": [ROLES.ADMIN],
    "debug.live.sessions.athletes": [ROLES.ADMIN],
    "migrateToNewTeamStructure": [ROLES.ADMIN],
    "migrateCoachInvitationCode": [ROLES.ADMIN],
    "copyAthleteName": [ROLES.ADMIN],
    "debug.live.sessions.athlete.commands.log": [ROLES.ADMIN]

};


let Authorization = {
    isAuthorized: function (userId, permission) {
        if (!permissions[permission]) {
            logger.debug(`No permissions found for ${permission}`);
            return false;
        }
        let perms = permissions[permission];

        if (perms.length === 0) {
            logger.debug(`${permission} does not require any role`);
            return true;
        }

        if (!userId) return false;

        if (!Roles.userIsInRole(userId, perms)) {
            logger.debug(`User ${userId} does not have authorization for ${permission}`);
            return false;
        }
        return true;
    }
};

export {
    Authorization,
    ROLES
}
