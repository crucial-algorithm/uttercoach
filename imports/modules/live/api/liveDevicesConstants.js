const LiveDevicesStatus = {
    READY: "Ready",
    RUNNING: "Running",
    FINISHED: "Finished",
    OFFLINE: "Offline"
};

const LiveDeviceCommands = {
    SYNC_CLOCK: 'syncClock',
    CLOCK_SYNCED: 'clockSynced',
    PUSH_EXPRESSION: 'pushExpression',
    START_SESSION: "start",
    FINISH_SESSION: "finish",
    PING: "ping",
    START: "startSplit",
    RESUME: "resumeSplits",
    PAUSE: "pause",
    STOP: "stopSplit",
    FINISH_WARMUP: "finishWarmup",
    HARD_RESET: "hardReset",
    APPEND_TO_SESSION: "appendToSession",
    COACH_ACCEPTED_TEAM_REQUEST: "coachAcceptedTeamRequest",
    USER_CONNECTED_TO_STRAVA: "userConnectedToStrava",
};

const LiveSessionType = {
    FREE: 'F',
    DISTANCE: 'D',
    TIME: 'T'
};

const IntervalType = {
    FREE: 'F',
    DISTANCE: 'D',
    TIME: 'T'
};

const LiveSessionDistanceHandling = {
    SERVER_TIME_OFFSET: 'server_offset',
    DISTANCE_STEP_IN_METERS: 10,
    DISTANCE_FORMAT_WITH_DECIMALS: '0.00',
    DELAY_UNTIL_CACHED_LOCATION: 990
};

const LiveSessionDelays = {
    DELAY_TO_CONSIDER_ATHLETE_VISIBLE: 4 * 1000,
    DELAY_TO_FORCE_SYNC_CLOCK: 5 * 60 * 1000,
    DELAY_TO_CONSIDER_ATHLETE_VISIBLE_WHILE_RUNNING: 60 * 1000
};

export {
    LiveDevicesStatus,
    LiveDeviceCommands,
    LiveSessionType,
    LiveSessionDistanceHandling,
    IntervalType,
    LiveSessionDelays
}
