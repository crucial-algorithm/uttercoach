import {Expression} from "../../expressions/expression";


var workSPMs = [
    [65, 63, 65, 66, 64, 65, 65, 66, 66, 65],
    [78, 77, 76, 76, 75, 77, 77, 79, 76, 78],
    [85, 83, 85, 86, 84, 85, 85, 86, 86, 85],
    [88, 87, 86, 86, 85, 87, 87, 89, 86, 88],
    [96, 98, 97, 97, 99, 95, 97, 97, 99, 98]
];


var recoverySPMs = [
    [0, 0, 0, 60, 61, 63, 60, 62, 62, 60],
    [55, 53, 55, 56, 54, 55, 55, 56, 56, 55],
    [58, 57, 56, 56, 55, 57, 57, 59, 56, 58]
];


/**
 * Generate session
 * @param {Expression}  expression
 * @param {number}      start - start date in miliseconds
 */
function session(expression, start) {
    var list = expression.flatten();
    var interval;
    var distance = 0;
    var session = {
        description: expression.getRawExpr(),
        date: new Date(start),
        angleZ: 0,
        noiseX: 0,
        noiseZ: 0,
        factorX: 0,
        factorZ: 0,
        axis: 0,
        data: [],
        splits: []
    };

    var iterator, metric;
    for (var i = 0; i < list.length; i++) {
        interval = list[i];

        iterator = new Iterator(start, distance, interval);
        while(iterator.hasNext()) {
            metric = iterator.next();
            metric.split = i;
            session.data.push(metric);
        }

        start = metric.timestamp;
        distance = metric.distance;
    }

    return session;
}

function random(min, max) {
    return parseInt(Math.random() * (max - min) + min);
}

function round(value, decimalPlaces) {
    if (decimalPlaces === 0) return Math.round(value);

    var precision = Math.pow(10, decimalPlaces);
    return Math.round(value * precision) / precision;
}

function calculateEfficiency(spm, speed) {
    if (spm === 0)
        return 0;

    let efficiency = (speed * 1000 / 3600) / (spm / 60);
    return Math.round( efficiency * 10000) / 10000;
}

/**
 *
 * @param start       timestamp
 * @param startAt     km (distance of start)
 * @param interval
 * @constructor
 */
function Iterator(start, startAt, interval) {
    this.interval = interval;
    this.duration = interval.getDuration();
    this.unit = interval.getUnit();
    this.start = start;
    this.startAt = startAt;

    this.speed = {};
    this.spm = {};
    if (this.interval.isRecovery()) {
        this.speed.min = 8;
        this.speed.max = 10;
        this.spm.rulers = recoverySPMs;
    } else {
        this.speed.min = 12;
        this.speed.max = 15;
        this.spm.rulers = workSPMs;
    }

    this.spm.ruler = [];
    this.position = 1;
    this.timestamp = start;
    this.distance = startAt;
}

Iterator.prototype.hasNext = function () {

    if (this.unit === Expression.Units.minutes) {
        return this.timestamp < (this.start + this.duration * 60000);
    }

    if (this.unit === Expression.Units.seconds) {
        return this.timestamp < (this.start + this.duration * 1000);
    }

    if (this.unit === Expression.Units.km) {
        return this.distance < (this.startAt + this.duration);
    }

    if (this.unit === Expression.Units.meters) {
        return this.distance < (this.startAt + this.duration/1000);
    }

    throw 'unknown unit type - ' + this.unit;
};

Iterator.prototype.next = function () {

    if (this.spm.ruler.length === 0)
        this.spm.ruler = this.spm.rulers[random(0, this.spm.rulers.length - 1)].slice();

    var speed = random(this.speed.min, this.speed.max);
    var spm = this.spm.ruler.shift();
    var efficiency = calculateEfficiency(spm, speed);

    this.distance = round(this.distance + (speed/60/60), 4);
    this.timestamp = this.position * 1000 + this.start;
    this.position++;

    return {
        timestamp: this.timestamp,
        spm: spm,
        speed: speed,
        distance: this.distance,
        spmEfficiency: efficiency,
        latitude: 0,
        longitude: 0,
        heartRate: 0
    }
};



var Generator = {
    session: session
};

export {Generator}
