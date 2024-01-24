import winston from 'winston';
require('winston-daily-rotate-file');

let LOG_FILE = process.env.LOG_FILE || 'prod-%DATE%.log';
let LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

/**
 * Dummy implementation for when file is read in client
 * @type {{debug: _logger.debug, error: _logger.error, info: _logger.info}}
 * @private
 */
let _logger = {
    info: function () {
    },
    error: function () {
    },
    debug: function () {
    }
};

if (Meteor.isServer) {

    _logger = winston.createLogger({
        level: LOG_LEVEL,
        transports: [
            new winston.transports.DailyRotateFile({
                filename: LOG_FILE,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxSize: '20m',
                maxFiles: '14d'
            })
        ]
    });

    if (process.env.NODE_ENV !== 'production') {
        _logger.add(new winston.transports.Console({
            format: winston.format.simple()
        }));
    }
}

class GpLogger {
    constructor(logger) {
        this.logger = logger;
    }

    info(msg) {
        if (Meteor.isTest) return;
        this.logger.info(msg);
    }

    error(msg) {
        if (Meteor.isTest) return;
        this.logger.error(msg)
    }

    debug(msg) {
        if (Meteor.isTest) return;
        this.logger.debug(msg)
    }
}

/**@type GpLogger */
export const logger = new GpLogger(_logger);



