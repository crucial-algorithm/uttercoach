import {Meteor} from "meteor/meteor";
const SESSION_TYPES = ['canoeing', 'cycling'];


let MotionDataSchema = new SimpleSchema({
    duration: {
        type: Number
    },
    value: {
        type: Number
    }
});
let SessionDataSchema = new SimpleSchema({
    timestamp: {
        type: Number,
        label: 'Record timestamp'
    },
    distance: {
        type: Number,
        label: 'Record distance',
        decimal: true
    },
    speed: {
        type: Number,
        label: 'Record speed',
        decimal: true
    },
    spm: {
        type: Number,
        label: 'Record spm',
        decimal: true
    },
    spmEfficiency: {
        type: Number,
        label: 'Record spmEfficiency',
        decimal: true
    },
    latitude: {
        type: Number,
        label: 'Record latitude',
        decimal: true,
        optional: true
    },
    longitude: {
        type: Number,
        label: 'Record longitude',
        decimal: true,
        optional: true
    },
    altitude: {
        type: Number,
        label: 'Record altitude',
        decimal: true,
        optional: true
    },
    heartRate: {
        type: Number,
        label: 'Record heartRate',
        optional: true
    },
    recovery: {
        type: Boolean,
        label: 'is athlete in recovery?'
    },
    strokes: {
        type: Number,
        label: 'Stroke number in session',
        optional: true
    },
    magnitude: {
        type: Number,
        label: 'Acceleration magnitude',
        optional: true
    },
    split: {
        type: Number,
        label: 'Split number, per app',
        optional: false
    },
    leftToRight: {
        type: [MotionDataSchema],
        label: 'Boat movement left to right'
    },
    frontToBack: {
        type: [MotionDataSchema],
        label: 'Boat movement front to back'
    },
    rotation: {
        type: [MotionDataSchema],
        label: 'Boat rotation'
    },
    virtual: {
        type: Boolean,
        label: 'Was added when processing',
        optional: true
    }

});
let SplitPositionSchema = new SimpleSchema({
    start: {type: Number, label: 'Start index in session data'},
    end: {type: Number, label: 'End index, in session data'}
});
let SplitSchema = new SimpleSchema({
    duration: {
        type: String,
        label: 'Split duration, according to initial setup'
    },
    start: {
        type: Number,
        label: 'Split start'
    },
    end: {
        type: Number,
        label: 'Split end'
    },
    distanceStart: {
        type: Number,
        label: 'Split distance start',
        decimal: true
    },
    distanceEnd: {
        type: Number,
        label: 'Split distance end',
        decimal: true
    },
    basedInDistance: {
        type: Boolean,
        label:'Split Is based in distance or time'
    },
    recovery: {
        type: Boolean,
        label: 'Split in recovery'
    },
    avgSpm: {
        type: Number,
        label: 'Split Avg SPM',
        decimal: true
    },
    avgSpmEfficiency: {
        type: Number,
        label: 'Split Avg stroke length',
        decimal: true
    },
    avgSpeed: {
        type: Number,
        label: 'Split Avg speed',
        decimal: true
    },
    avgHeartRate: {
        type: Number,
        label: 'Split Avg Heart Rate',
        decimal: true
    },
    position: {
        type: SplitPositionSchema,
        label: 'Split index, in session data'
    },
    avgBoatBounce: {
        type: Number,
        label: 'Front to back movement, in degrees',
        optional: true,
        decimal: true
    },
    avgBoatLeftIncline: {
        type: Number,
        label: 'Average degree of left inclination of the boat',
        optional: true,
        decimal: true
    },
    avgBoatRightIncline: {
        type: Number,
        label: 'Average degree of right inclination of the boat',
        optional: true,
        decimal: true
    }
});
let SpmZonesToSpeedSchema = new SimpleSchema({
    total: {
        type: Number,
        label: 'sum of all speeds',
        decimal: true
    },
    count: {
        type: Number,
        label: 'Number of speeds'
    }
});
let TrainingSessionAggregateSchema = new SimpleSchema({
    sumMetrics: {
        type: Number,
        label: 'Number of metrics stored in session (without recovery)'
    },
    sumFullMetrics: {
        type: Number,
        label: 'Number of metrics stored in session'
    },
    sumSpm: {
        type: Number,
        label: 'Total SPM (without recovery)'
    },
    sumFullSpm: {
        type: Number,
        label: 'Total SPM'
    },
    sumHeartRate: {
        type: Number,
        label: 'Total Heart Rate (without recovery)'
    },
    sumFullHeartRate: {
        type: Number,
        label: 'Total Heart Rate'
    },
    spmZones: {
        type: [Number],
        label: 'SPM zones (without recovery)'
    },
    spmFullZones: {
        type: [Number],
        label: 'SPM zones'
    },
    speedZones: {
        type: [Number],
        label: 'Speed zones (without recovery)'
    },
    speedFullZones: {
        type: [Number],
        label: 'Speed zones'
    },
    heartRateZones: {
        type: [Number],
        label: 'Heart rate zones (without recovery)'
    },
    heartRateFullZones: {
        type: [Number],
        label: 'Heart rate zones'
    },
    spmZonesToSpeed: {
        type: [SpmZonesToSpeedSchema],
        label: 'Speed at each spm zones'
    }
});
let UserHeartRateSchema = new SimpleSchema({
    max: {
        type: Number,
        label: "User max heart rate at the time of session",
        min: 0,
        max: 300
    },
    resting: {
        type: Number,
        label: "User resting heart rate at the time of session",
        min: 0,
        max: 300,
        optional: true
    }
});
let SessionLocationSchema = new SimpleSchema({
    processedAt: {
        type: Number,
        label: "When was processed"
    },
    found: {
        type: Boolean,
        label: "was location info found"
    },
    country: {
        type: String,
        label: "country",
        optional: true
    },
    city: {
        type: String,
        label: "city",
        optional: true
    }
});

/**
 * Training sessions collection.
 */
let TrainingSessionCollection = new Meteor.Collection('trainingSessions', {idGeneration: 'STRING'});
TrainingSessionCollection.attachSchema(new SimpleSchema({
    user: {
        type: String,
        label: 'User UUID'
    },
    type: {
        type: String,
        label: "session type",
        allowedValues: SESSION_TYPES
    },
    date: {
        type: Date,
        label: 'Session Date'
    },
    createdAt: {
        type: Number,
        label: 'Milis when the session was uploaded to the server'
    },
    serverClockGap: {
        type: Number,
        label: "Gap between device and server at the time of the creation of the session",
        defaultValue: 0
    },
    data: {
        type: [SessionDataSchema],
        label: 'session Data'
    },
    expression: {
        type: 'String',
        label: 'Session definition',
        optional: true
    },
    splits: {
        type: [SplitSchema],
        label: 'Session splits, if any',
        optional: true
    },
    angleZ: {
        type: Number,
        label: 'Device angle',
        decimal: true
    },
    noiseX: {
        type: Number,
        label: 'Device noise x',
        decimal: true
    },
    noiseZ: {
        type: Number,
        label: 'Device noise z',
        decimal: true
    },
    factorX: {
        type: Number,
        label: 'Device factor x',
        decimal: true
    },
    factorZ: {
        type: Number,
        label: 'Device factor z',
        decimal: true
    },
    axis: {
        type: Number,
        label: 'Device noise x'
    },
    coachTrainingSessionStart: {
        type: Number,
        label: 'coach training session start timestamp',
        optional: true
    },
    coachTrainingSessionId: {
        type: String,
        label: 'coach scheduled session UUID',
        optional: true
    },
    duration: {
        type: Number,
        label: 'Session working duration'
    },
    fullDuration: {
        type: Number,
        label: 'Session full duration'
    },
    distance: {
        type: Number,
        label: 'Session working distance',
        decimal: true
    },
    fullDistance: {
        type: Number,
        label: 'Session full distance',
        decimal: true
    },
    avgSpeed: {
        type: Number,
        label: 'Session working average speed',
        decimal: true
    },
    minSpeed: {
        type: Number,
        label: 'Session working min speed',
        decimal: true
    },
    maxSpeed: {
        type: Number,
        label: 'Session working max speed',
        decimal: true
    },
    avgSpm: {
        type: Number,
        label: 'Session working average SPM',
        decimal: true
    },
    minSpm: {
        type: Number,
        label: 'Session working min SPM'
    },
    maxSpm: {
        type: Number,
        label: 'Session working max speed'
    },
    avgSpmEfficiency: {
        type: Number,
        label: 'Session working average stroke length',
        decimal: true
    },
    minSpmEfficiency: {
        type: Number,
        label: 'Session working min stroke length',
        decimal: true
    },
    maxSpmEfficiency: {
        type: Number,
        label: 'Session working max stroke length',
        decimal: true
    },
    avgHeartRate: {
        type: Number,
        label: 'Session working average HR',
        decimal: true
    },
    minHeartRate: {
        type: Number,
        label: 'Session working min HR'
    },
    maxHeartRate: {
        type: Number,
        label: 'Session working max HR'
    },
    version: {
        type: Number,
        label: 'Record format version'
    },
    aggregates: {
        type: TrainingSessionAggregateSchema,
        optional: true
    },
    userHeartRate: {
        type: UserHeartRateSchema,
        optional: false
    },
    boat: {
        type: String,
        label: "type of boat session was performed in (gopaddler)",
        optional: true, // -> needs to be true because this options doesn't apply to cycling
        allowedValues: ["K", "C", "k1", "K2", "k4", "K1", "C2", "C4"]
    },
    processed: {
        type: Boolean,
        label: "Was it processed by the batch job?",
        defaultValue: false,
        optional: false
    },
    processedAt: {
        type: Date,
        label: 'Date when batch processed aggregations',
        optional: true
    },
    location: {
        type: SessionLocationSchema,
        label: 'session location',
        optional: true
    },
    edited: {
        type: Boolean,
        label: 'Was session edited',
        optional: true
    },
    pausedDuration: {
        type: Number,
        label: 'Paused duration in milis',
        optional: true,
        defaultValue: 0
    },
    inStrava: {
        type: Boolean,
        label: 'is in strava',
        optional: true
    },
    uploadedToStravaAt: {
        type: Date,
        label: 'upload date',
        optional: true
    },
    elevation: {
        type: Number,
        label: 'elevation in meters',
        optional: true,
        defaultValue: 0
    },
}));

let TrainingSessionProcessFailuresCollection = new Meteor.Collection('trainingSessionProcessFailures', {idGeneration: 'STRING'});

export {TrainingSessionCollection, TrainingSessionProcessFailuresCollection}