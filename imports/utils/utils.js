"use strict";

import numbro from "numbro";
import i18n from "./i18n";
import { Random } from 'meteor/random';
import {Meteor} from "meteor/meteor";
import {Coach} from "../modules/coaches/api/collections";
import SessionUI from "../modules/coaches/ui/dashboard-session";


const ZONE_GENERIC_COLORS_12 = ["rgba(239, 97, 85, 1)", "rgba(239, 97, 85, .95)", "rgba(239, 97, 85, .9)"
    , "rgba(255, 174, 3, 1)", "rgba(255, 174, 3, .7)", "rgba(255, 174, 3, .5)"
    , "rgba(156, 179, 128, 1)", "rgba(156, 179, 128, .7)", "rgba(156, 179, 128, .5)"
    , "rgba(105, 163, 221, 1)", "rgba(105, 163, 221, .7)", "rgba(105, 163, 221, .5)"];

const ZONE_GENERIC_COLORS_11 = ["rgba(239, 97, 85, 1)", "rgba(239, 97, 85, .95)", "rgba(239, 97, 85, .9)"
    , "rgba(255, 174, 3, 1)", "rgba(255, 174, 3, .7)", "rgba(255, 174, 3, .5)"
    , "rgba(156, 179, 128, 1)", "rgba(156, 179, 128, .7)", "rgba(156, 179, 128, .5)"
    , "rgba(105, 163, 221, 1)", "rgba(105, 163, 221, .7)"];

const ZONE_GENERIC_COLORS_10 = ["rgba(239, 97, 85, 1)", "rgba(239, 97, 85, .95)", "rgba(239, 97, 85, .9)"
    , "rgba(255, 174, 3, 1)", "rgba(255, 174, 3, .7)", "rgba(255, 174, 3, .5)"
    , "rgba(156, 179, 128, 1)", "rgba(156, 179, 128, .7)"
    , "rgba(105, 163, 221, 1)", "rgba(105, 163, 221, .7)"];


const ZONE_GENERIC_COLORS_09 = ["rgba(239, 97, 85, 1)", "rgba(239, 97, 85, .95)", "rgba(239, 97, 85, .9)"
    , "rgba(255, 174, 3, 1)", "rgba(255, 174, 3, .7)"
    , "rgba(156, 179, 128, 1)", "rgba(156, 179, 128, .7)"
    , "rgba(105, 163, 221, 1)", "rgba(105, 163, 221, .7)"];

const ZONE_GENERIC_COLORS_08 = ["rgba(239, 97, 85, 1)", "rgba(239, 97, 85, .9)"
    , "rgba(255, 174, 3, 1)", "rgba(255, 174, 3, .7)"
    , "rgba(156, 179, 128, 1)", "rgba(156, 179, 128, .7)"
    , "rgba(105, 163, 221, 1)", "rgba(105, 163, 221, .7)"];

const ZONE_GENERIC_COLORS_07 = ["rgba(239, 97, 85, 1)", "rgba(239, 97, 85, .9)"
    , "rgba(255, 174, 3, 1)", "rgba(255, 174, 3, .7)"
    , "rgba(156, 179, 128, 1)", "rgba(156, 179, 128, .7)"
    , "rgba(105, 163, 221, .7)"];

const ZONE_GENERIC_COLORS_06 = ["rgba(239, 97, 85, 1)", "rgba(239, 97, 85, .9)"
    , "rgba(255, 174, 3, 1)", "rgba(255, 174, 3, .7)"
    , "rgba(156, 179, 128, .7)"
    , "rgba(105, 163, 221, .7)"];

const ZONE_GENERIC_COLORS_05 = ["rgba(239, 97, 85, 1)", "rgba(239, 97, 85, .9)"
    , "rgba(255, 174, 3, .7)"
    , "rgba(156, 179, 128, .7)"
    , "rgba(105, 163, 221, .7)"];

const ZONE_GENERIC_COLORS_04 = ["rgba(239, 97, 85, 1)"
    , "rgba(255, 174, 3, .7)"
    , "rgba(156, 179, 128, .7)"
    , "rgba(105, 163, 221, .7)"];

const ZONE_GENERIC_COLORS_03 = ["rgba(239, 97, 85, 1)"
    , "rgba(255, 174, 3, .7)"
    , "#3CA07D"];

const ZONE_GENERIC_COLORS_02 = ["rgba(239, 97, 85, 1)"
    , "rgba(255, 174, 3, .7)"];

const ZONE_GENERIC_COLORS_01 = ["rgba(239, 97, 85, 1)"];

const ZONE_GENERIC_COLOR_SCHEMES = [
    [],
    ZONE_GENERIC_COLORS_01, ZONE_GENERIC_COLORS_02, ZONE_GENERIC_COLORS_03
    , ZONE_GENERIC_COLORS_04, ZONE_GENERIC_COLORS_05, ZONE_GENERIC_COLORS_06
    , ZONE_GENERIC_COLORS_07, ZONE_GENERIC_COLORS_08, ZONE_GENERIC_COLORS_09
    , ZONE_GENERIC_COLORS_10, ZONE_GENERIC_COLORS_11, ZONE_GENERIC_COLORS_12
];



class Utils {

    /**
     *
     * @param n
     *
     * @returns {boolean}
     */
    static isNumeric(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    static lpad(value, places) {
        let pad = new Array(places + 1).join('0');
        let str = value + "";
        return pad.substring(0, pad.length - str.length) + str;
    }

    /**
     *
     * @param date
     * @returns {{year: number, month: number}}
     */
    static getYearAndMonth(date) {

        var now = date || new Date();

        return {
            year: now.getFullYear(),
            month: now.getMonth()
        };
    }


    /**
     *
     * @param date
     * @param range
     *
     * @returns {{start: Date, end: Date}}
     */
    static getDateRange(date, range) {

        let start = date,
            end = date;

        if (!date) {
            return {start: null, end: null};
        }

        switch (range) {

            case 'day':

                start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                end = new Date(start.getTime() + 86400000);

                break;

            case 'week':
                let mdate = moment(date);
                start = mdate.startOf('isoweek').toDate();
                end = mdate.startOf('isoweek').add(7, 'days').toDate();

                break;

            case 'month':

                start = new Date(date.getFullYear(), date.getMonth(), 1);
                end = new Date(date.getFullYear(), date.getMonth() + 1, 1);

                break;

            case 'year':

                start = new Date(date.getFullYear(), 0);
                end = new Date(date.getFullYear() + 1, 0);

                break;

            default:
            // do nothing
        }

        return {
            start: start,
            end: end
        };
    }


    static displayDate(input, showTime) {

        let mask = 'Do MMM YYYY';

        if (showTime) {
            mask += ' [at] HH:mm';
        }

        return moment(input).format(mask);
    }


    static formatDate(date, mask = "YYYY-MM-DD") {
        return moment(date).format(mask);
    }


    static formatNumber(input) {
        if (isNaN(input)) input = 0;
        return numbro(input).format('0,0.00');
    }


    static trainingSessionTitle(trainingSession) {

        if (!trainingSession) {
            return 'Training Session';
        }

        if (trainingSession.description) {
            return trainingSession.description + ' (' + Utils.displayDate(trainingSession.date, true) + ')';
        }

        return Utils.displayDate(trainingSession.date, true);
    }

    static inMobile() {
        let mobile = false;
        (function (a, b) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
                mobile = true;
            }
        })(navigator.userAgent || navigator.vendor || window.opera);

        return mobile;
    }


    static isValidEmail(email) {
        return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)
    }

    static isStrongPassword(password) {

        if (password.length < 8)
            return false;

        // has uppercase
        if (!/[A-Z]/.test(password))
            return false;

        // has lowercase
        if (!/[a-z]/.test(password))
            return false;

        // has numbers
        if (!/\d/.test(password))
            return false;

        return true;
    }

    static throttle(func, limit) {
        let inThrottle = false;
        return function () {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit)
            }
        }
    }

    /**
     *
     * @param {function}    func        callback
     * @param {number}      wait        period to debounce for
     * @param {boolean}     immediate   if true, call in the beginning
     * @returns {Function}
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        return function () {
            const context = this, args = arguments;
            const later = function () {
                timeout = null;
                if (immediate === false) func.apply(context, args);
            };
            const callNow = immediate === true && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    }

    /**
     *
     * @param {number}  milis
     * @return {string} 75:20.100 (75 minutes, 20 seconds, 100 milis)
     */
    static formatDurationInHundredth(milis) {
        let duration = moment.duration(milis);
        return [numbro(duration.minutes()).format('00')
            , ':', numbro(duration.seconds()).format('00')
            , '.', numbro(duration.milliseconds()).format('000')
        ].join('')
    }

    /**
     *
     * @param {number|null}  milis
     * @return {string} 01:15:20 (1 hour, 15 minutes, 20 seconds)
     */
    static formatDurationInTime(milis) {
        if (milis === null) return '';
        let duration = moment.duration(milis);
        return [numbro(duration.hours()).format('00')
            , ':', numbro(duration.minutes()).format('00')
            , ':', numbro(duration.seconds()).format('00')
        ].join('')
    }

    /**
     *
     * @param {number}  milis
     * @return {string} 01:15 (1 hour, 15 minutes)
     */
    static formatDurationInTimeShort(milis) {
        let duration = moment.duration(milis);
        return [numbro(duration.hours() + duration.days() * 24).format('00')
            , ':', numbro(duration.minutes()).format('00')
        ].join('')
    }

    /**
     *
     * @param {number}  milis
     * @return {string} 75:20 (75 minutes, 20 seconds)
     */
    static formatDurationInMinutes(milis) {
        let duration = moment.duration(milis);
        return [numbro(duration.hours() * 60 + duration.minutes()).format('00')
            , ':', numbro(duration.seconds()).format('00')
        ].join('')
    }

    /**
     *
     * @param {number}  milis
     * @return {string} 75'20'' (75 minutes, 20 seconds)
     */
    static formatDurationInSportsNotation(milis) {
        let duration = moment.duration(milis);
        let parts = [];
        let minutes = duration.hours() * 60 + duration.minutes();
        let seconds = duration.seconds();
        if (minutes > 0) parts.push(numbro(minutes).format('00') + "'");
        if (seconds > 0) parts.push((numbro(seconds).format('00') + (minutes > 0 ? '' : "''")));

        return parts.join('')
    }

    static round(value, decimalPlaces) {
        if (decimalPlaces === 0) {
            return Math.round(value);
        }

        let precision = Math.pow(10, decimalPlaces);
        return Math.round(value * precision) / precision;
    }

    /**
     *
     * @param latency
     * @returns {number}
     */
    static cristianClockSynchronization(latency) {
        if (!latency || latency.count === 0) {
            return 0;
        }
        return Math.round(latency.clock / latency.count)
    }

    /**
     *
     * @param {number} len      the desired number of characters
     * @param {number} radix    the number of allowable values for each character.
     * @returns {string}
     */
    static uuid(len = 16, radix = 0) {
        let chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(''), uuid = [], i;
        radix = radix || chars.length;

        if (len) {
            // Compact form
            for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
        } else {
            // rfc4122, version 4 form
            let r;

            // rfc4122 requires these characters
            uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
            uuid[14] = '4';

            // Fill in random data.  At i==19 set the high bits of clock sequence as
            // per rfc4122, sec. 4.1.5
            for (i = 0; i < 36; i++) {
                if (!uuid[i]) {
                    r = 0 | Math.random()*16;
                    uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
                }
            }
        }

        return uuid.join('');
    }

    /**
     *
     * @param {number} spm
     * @param {number} speed km/h
     */
    static calculateStrokeLength(spm, speed) {
        if (spm === 0 || speed === 0) return 0;
        return (speed * 1000 / 3600) / (spm / 60);
    }

    /**
     *
     * @param distance  km
     * @param duration  milis
     */
    static calculateAverageSpeed(distance, duration) {
        if (distance === 0 || duration === 0) return 0;
        return distance / (duration / 3600000);
    }

    static minMaxAvgStddev(data) {
        let total = 0, min = null, max = null;
        data.map(function (value) {
            total += value;
            if (min === null || value < min) {
                min = value;
            }
            if (max === null || value > max) {
                max = value;
            }
        });
        const avg = total / data.length;
        let diffs = 0;
        data.map(function (value) {
            diffs += (avg - value) * (avg - value);
        });

        let stddev = Math.sqrt(diffs / data.length);
        return {
            min: min,
            max: max,
            avg: avg,
            stddev: stddev
        }
    }

    static calculateHeartZone(hr, max) {
        let ratio = hr / max;

        if (ratio >= 0.9)  return 5;
        if (ratio >= 0.8)  return 4;
        if (ratio >= 0.7)  return 3;
        if (ratio >= 0.6)  return 2;
        if (ratio >= 0.1)  return 1;

        return 0;
    }

    static heartRateReserveCalculation(resting, max, hr) {
        return Math.floor(((resting - hr) / (max - resting)) * -100)
    }

    static getHeartRateLimit(level, max) {
        if (level === 0) return max * 0.1;
        if (level === 1) return max * 0.6;
        if (level === 2) return max * 0.7;
        if (level === 3) return max * 0.8;
        if (level === 4) return max * 0.9;
        if (level === 5) return max;
    }

    static onClick($dom, callback, feedback = false) {
        $dom.off('click').on('click', Utils.debounce(function (event) {
            if (feedback === true && navigator.vibrate && typeof navigator.vibrate === "function") {
                navigator.vibrate(500);
            }
            callback.apply(this, [event])
        }, 1000, true))
    }

    /**
     * Default button handler for calling remote method and validating response
     * @param $dom
     * @param callback
     * @param feedback
     */
    static onClickMethodCall($dom, callback, feedback = false) {
        let running = false;
        const runningCss = 'disabled';
        $dom.off('click').on('click', Utils.debounce(function (event) {
            if (running === true) {
                console.debug('action already running');
                return;
            }

            running = true;
            $dom.addClass(runningCss);

            if (feedback === true && navigator.vibrate && typeof navigator.vibrate === "function") {
                navigator.vibrate(500);
            }

            function failed() {
                const $body = $('body')
                    , $button = $(`<div class="btn btn-secondary unknown-error-reload-button">${i18n.translate("generic_unrecoverable_error_action")}</div>`);
                $body.empty();
                $body.append(`<div class="unknown-error-message">${i18n.translate("generic_unrecoverable_error_message")}</div>`);
                $body.append(`<div class="unknown-error-message-secondary">${i18n.translate("generic_unrecoverable_error_message_secondary")}</div>`);
                $body.append($button);
                $body.addClass('error-500');
                $button.on('click', function () {
                    Router.go('coachLive');
                    setTimeout(function () {
                        location.reload();
                    }, 100);
                });

            }

            let timeout = setTimeout(function () {
                console.debug('confirm that method as ended');
                running = false;
                $dom.removeClass(runningCss);
                if (ok === false) {
                    console.debug('Method failed');
                    failed();
                } else {
                    console.debug('Method finish');
                }
            }, 7000);
            
            let ok = false;
            callback.apply(this, [event, function resolved() {
                ok = true;
                running = false;
                $dom.removeClass(runningCss);
            }, function failed() {
                ok = false;
                running = false;
                $dom.removeClass(runningCss);
                failed();
            }, function abort() {
                running = false;
                clearTimeout(timeout);
            }]);

        }, 1000, true))
    }


    /**
     * Add modal to body before showing to handle display issues in iOS
     * @param $modal
     */
    static dialog($modal) {
        const $body = $('body')
            , $container = $modal.parent();

        $modal.detach().appendTo($body);
        $body.addClass('bootstrap-fs-modal');

        $modal.on('hidden.bs.modal', function () {
            $modal.detach().appendTo($container);
            $body.removeClass('bootstrap-fs-modal');
        });

        $modal.modal({});
    }

    static applyMigrations(migrations, record, from, to) {
        if (!from) from = 0;
        from = Math.round(from);

        for (let i = from + 1, l = to; i <= l; i++) {
            record = migrations[i](record);
        }

        return record;
    }

    static getGradientColorScheme() {
        return ZONE_GENERIC_COLOR_SCHEMES;
    }

    static get12PaletteColorScheme() {
        return ZONE_GENERIC_COLORS_12.slice(0);
    }

    /**
     *
     * @param {Array} list
     * @param callback
     * @param awaitAtLeast      Kind of a throttling mechanism! Don't call function if at least x milis havn't yet passed since last call
     */
    static loopAsync(list, callback, awaitAtLeast = 0) {
        if (!list || list.length === 0) {
            return;
        }

        let calledAt = Date.now();
        let originalList = list.slice(0);
        list = list.slice(0);
        let value = list.pop();

        let iterator = {
            next: function () {
                value = list.pop();
                if (awaitAtLeast === 0) {
                    return callback.apply({}, [iterator]);
                }

                if (Date.now() - calledAt > awaitAtLeast) {
                    calledAt = Date.now();
                    return callback.apply({}, [iterator])
                }

                setTimeout(() => {
                    calledAt = Date.now();
                    callback.apply({}, [iterator])
                }, awaitAtLeast - (Date.now() - calledAt))
            },

            current: function () {
                return value === undefined ? null : value;
            },

            isFinished: function () {
                return list.length === 0;
            },

            finish: function () {
                list = [];
            },

            restart: function () {
                list = originalList.slice(0);
            }
        };


        callback.apply({}, [iterator]);
    }

    static SHA1(msg) {

        function rotate_left(n, s) {
            let t4 = (n << s) | (n >>> (32 - s));
            return t4;
        }

        function lsb_hex(val) {
            let str = "";
            let i;
            let vh;
            let vl;
            for (i = 0; i <= 6; i += 2) {
                vh = (val >>> (i * 4 + 4)) & 0x0f;
                vl = (val >>> (i * 4)) & 0x0f;
                str += vh.toString(16) + vl.toString(16);
            }
            return str;
        }

        function cvt_hex(val) {
            let str = "";
            let i;
            let v;
            for (i = 7; i >= 0; i--) {
                v = (val >>> (i * 4)) & 0x0f;
                str += v.toString(16);
            }
            return str;
        }

        function Utf8Encode(string) {
            string = string.replace(/\r\n/g, "\n");
            let utftext = "";
            for (let n = 0; n < string.length; n++) {
                let c = string.charCodeAt(n);
                if (c < 128) {
                    utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    utftext += String.fromCharCode((c >> 6) | 192);
                    utftext += String.fromCharCode((c & 63) | 128);
                } else {
                    utftext += String.fromCharCode((c >> 12) | 224);
                    utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                    utftext += String.fromCharCode((c & 63) | 128);
                }
            }
            return utftext;
        }

        let blockstart;
        let i, j;
        let W = new Array(80);
        let H0 = 0x67452301;
        let H1 = 0xEFCDAB89;
        let H2 = 0x98BADCFE;
        let H3 = 0x10325476;
        let H4 = 0xC3D2E1F0;
        let A, B, C, D, E;
        let temp;
        msg = Utf8Encode(msg);
        let msg_len = msg.length;
        let word_array = [];

        for (i = 0; i < msg_len - 3; i += 4) {
            j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 |
                msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
            word_array.push(j);
        }

        switch (msg_len % 4) {
            case 0:
                i = 0x080000000;
                break;
            case 1:
                i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
                break;
            case 2:
                i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
                break;
            case 3:
                i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80;
                break;
        }

        word_array.push(i);
        while ((word_array.length % 16) !== 14)
            word_array.push(0);

        word_array.push(msg_len >>> 29);
        word_array.push((msg_len << 3) & 0x0ffffffff);

        for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
            for (i = 0; i < 16; i++)
                W[i] = word_array[blockstart + i];

            for (i = 16; i <= 79; i++)
                W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

            A = H0;
            B = H1;
            C = H2;
            D = H3;
            E = H4;

            for (i = 0; i <= 19; i++) {
                temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }

            for (i = 20; i <= 39; i++) {
                temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }

            for (i = 40; i <= 59; i++) {
                temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }

            for (i = 60; i <= 79; i++) {
                temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
                E = D;
                D = C;
                C = rotate_left(B, 30);
                B = A;
                A = temp;
            }
            H0 = (H0 + A) & 0x0ffffffff;
            H1 = (H1 + B) & 0x0ffffffff;
            H2 = (H2 + C) & 0x0ffffffff;
            H3 = (H3 + D) & 0x0ffffffff;
            H4 = (H4 + E) & 0x0ffffffff;
        }
        temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
        return temp.toLowerCase();
    }

    static async getLoggedInUser() {
        return new Promise((resolve, reject) => {
            if (!Meteor.userId()) return reject('not logged in');
            if (Meteor.user()) return resolve(Meteor.user());

            let attempts = 1, interval = -1;
            interval = setInterval(() => {
                if (Meteor.user()) {
                    clearInterval(interval);
                    return resolve(Meteor.user());
                }
                if (attempts > 10) {
                    clearInterval(interval);
                    return reject('unable to load user');
                }
                attempts++;
            }, 1000);
        });
    }

    static async getCurrentLoggedInCoach() {
        return new Promise(async (resolve, reject) => {
            let userId = Meteor.userId();
            if (!userId) return reject('not logged in');

            try {
                let user = await Utils.getLoggedInUser();
                if (!user.roles) return reject('no roles');
                if (user.roles.indexOf('coach') < 0) return reject('user is not a coach');

                let coach = Coach.find(Meteor.userId());
                if (coach) return resolve(coach);

                Meteor.subscribe("coach.info", {
                    onReady: function () {
                        coach = Coach.find(Meteor.userId());
                        if (!coach) return reject('no coach found');
                        resolve(coach);
                    }
                });

            } catch(err) {
                reject(err);
            }
        })
    }

    static generateRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     *
     * @param email
     * @return {boolean}
     */
    static validateEmail(email) {
        return /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
    }

    /**
     *
     * @param name
     * @return {string|null}
     */
    static getInitials(name) {
        if (!name || typeof name !== "string") return 'JD';
        let parts = name.split(/\s+/);
        if (parts.length === 1) {
            return parts[0][0].toUpperCase();
        }

        return `${parts[0][0].toUpperCase()}${parts[parts.length - 1][0].toUpperCase()}`;
    }

    /**
     *
     * @param {TrainingSession} session
     * @return SessionUI
     */
    static trainingSessionToSessionUI(session) {
        return new SessionUI(session.date, session.user, session.id, session.expression
            , session.distance, session.duration, session.fullDistance, session.fullDuration
            , session.avgSpm, session.avgHeartRate, 1, false)
    }
}


const MODAL_TYPES = {

    /**
     *
     * @param $elem
     * @param options {{id: string, title: string, primary: {labelDesktop: string, labelMobile: string, callback: function}, secondary: {label: string, callback: function}}}
     * @returns {jQuery|HTMLElement}
     */
    confirm: function ($elem, options) {
        options.id = options.id || Random.id();
        if (options.primary.label) {
            options.primary.labelDesktop = options.primary.label;
            options.primary.labelMobile = options.primary.label;

        }
        options.secondary = options.secondary || {label: ''};
        const $modal = $([
            `    <div class="modal modal-fullscreen ${options.extraCss || ''}" id="${options.id}" tabindex="-1" role="dialog" aria-labelledby="${options.id}-label" aria-hidden="true">`,
            `        <div class="modal-dialog" role="document">`,
            `            <div class="modal-content">`,
            `                <div class="modal-header">`,
            `                    <h5 class="modal-title" id="${options.id}-label">${options.title}</h5>`,
            `                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">`,
            `                        <span aria-hidden="true">&times;</span>`,
            `                    </button>`,
            `                </div>`,
            `                    <div class="modal-body" />`,
            `                <div class="modal-footer">`,
            `                    <button type="button" class="btn secondary">${options.secondary.label}</button>`,
            `                    <button type="button" ${options.primary.disabled === true ? 'disabled' : ''} class="btn primary" data-selector="btn-primary">`,
            `                        <span class="d-none d-md-inline">${options.primary.labelDesktop}</span>`,
            `                        <span class="d-md-none">${options.primary.labelMobile}</span>`,
            `                    </button>`,
            `                </div>`,
            `            </div>`,
            `        </div>`,
            `    </div>`].join(''));

        $modal.appendTo('body');
        $elem.children().detach().appendTo($modal.find('.modal-body'));
        $elem.detach();

        $modal.find('button.btn.secondary').off('click').on('click', function (e) {
            if (options.secondary.callback) {
                const result = options.secondary.callback.apply(this, [e]);
                if (result === false) return;
            }
            if ($modal.modal) $modal.modal('hide');
        });

        $modal.find('button.btn.primary').off('click').on('click', function (e) {
            if (options.primary.callback) options.primary.callback.apply(this, [e]);
        });

        $modal.find('.close').off('click').on('click', function (e) {
            if ($modal.modal) $modal.modal('hide');
        });

        return $modal;
    },

    acknowledge: function ($elem, options) {

        options.id = options.id || Random.id();
        if (!options.primary) {
            options.primary = {
                label: i18n.translate('modal_acknowledge')
            }
        }

        const $modal = $([
            `    <div class="modal modal-fullscreen ${options.extraCss || ''}" id="${options.id}" tabindex="-1" role="dialog" aria-labelledby="${options.id}-label" aria-hidden="true">`,
            `        <div class="modal-dialog" role="document">`,
            `            <div class="modal-content">`,
            `                <div class="modal-header">`,
            `                    <h5 class="modal-title" id="${options.id}-label">${options.title}</h5>`,
            `                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">`,
            `                        <span aria-hidden="true">&times;</span>`,
            `                    </button>`,
            `                </div>`,
            `                    <div class="modal-body" />`,
            `                <div class="modal-footer">`,
            `                    <button type="button" class="btn primary" data-selector="btn-primary">`,
            `                        <span class="d-none d-md-inline">${options.primary.label}</span>`,
            `                        <span class="d-md-none">&nbsp;</span>`,
            `                    </button>`,
            `                </div>`,
            `            </div>`,
            `        </div>`,
            `    </div>`].join(''));

        $modal.appendTo('body');
        $elem.children().detach().appendTo($modal.find('.modal-body'));
        $elem.remove();

        $modal.find('button.btn.primary').off('click').on('click', function (e) {
            if (typeof options.primary.callback === 'function') {
                options.primary.callback.apply({}, []);
                return;
            }
            if ($modal.modal) $modal.modal('hide');
        });

        return $modal;
    }
};

class Modal {

    constructor($modal, options, $parent = null, $structure = null) {
        this._$modal = $modal;
        this.$body = $('body');
        this.$parent = $parent;
        this.$structure = $structure;
        this.options = options;


        $modal.on('hidden.bs.modal', () => {
            this.$body.removeClass('bootstrap-fs-modal');
        });
    }

    enablePrimaryButton() {
        this.$modal.find('[data-selector="btn-primary"]').removeAttr('disabled');
    }

    get $modal() {
        return this._$modal;
    }

    set $modal(value) {
        this._$modal = value;
    }

    /**
     * @param type
     * @param $elem
     * @param options
     * @returns {Modal}
     */
    static factory(type, $elem, options) {
        let $parent = $elem.parent();
        let $structure = $elem.clone();
        let $modal = MODAL_TYPES[type]($elem, options);
        return new Modal($modal, options, $parent, $structure);
    }

    static types() {
        return {
            CONFIRM: "confirm",
            ACKNOWLEDGE: "acknowledge"
        }
    }

    /**
     *
     * @return {boolean}
     */
    static isAModalOpen() {
        return document.body.classList.contains('modal-open');
    }

    show() {
        return new Promise((resolve) => {
            this.$body.addClass("bootstrap-fs-modal");
            this.$modal.on('shown.bs.modal', () => {
                resolve()
            });
            this.$modal.modal({});
            this.$modal.on('hidden.bs.modal', () => {
                if (this.options && this.options.destroyOnHide === true) {
                    this.destroy();
                }
            });
        })

    }

    hide() {
        const self = this;
        const defer = $.Deferred();

        self.$modal.on('hidden.bs.modal', function () {
            self.$body.removeClass('bootstrap-fs-modal');
            defer.resolve();
        });
        self.$modal.modal('hide');

        return defer.promise();
    }

    destroy() {
        const restore = this.$parent !== null && this.$structure !== null;

        if ((this.$modal.data('bs.modal') || {})._isShown === false) {
            this.$modal.remove();
            if (restore) this.$structure.appendTo(this.$parent);
            return;
        }

        this.hide().then(() => {
            this.$modal.remove();
            if (restore) this.$structure.appendTo(this.$parent);
        });
    }

    updatePrimaryBtnLabel(label) {
        this._$modal.find('.btn.primary').find('span').text(label);
    }

    onHide(callback) {
        this.$modal.on('hidden.bs.modal', callback);
    }
}

class Button {
    /**
     *
     * @param {HTMLElement} button
     * @param {function}    onConfirm
     */
    static confirm(button, onConfirm) {
        const CSS_CONFIRM_RUNNING = 'confirm-running';
        const CSS_CONFIRM_FINISHED = 'confirm-finished';
        if (button.classList.contains(CSS_CONFIRM_RUNNING)) {
            return;
        }

        button.classList.add(CSS_CONFIRM_RUNNING);
        let progress = button.getElementsByTagName('span')[0];
        let duration = 3000, timeout = 100;
        let width = 0, increment = 100 / (duration/timeout), start = Date.now();
        progress.style.width = '100%';
        let intervalId = setInterval(() => {
            let prg = (100 - (width += increment));
            prg = prg < 0 ? 0 : prg;
            progress.style.width = prg + '%';
            if (Date.now() - start >= duration) {
                clearInterval(intervalId);
                button.classList.remove(CSS_CONFIRM_RUNNING);
                button.classList.add(CSS_CONFIRM_FINISHED);
                setTimeout(() => {
                    onConfirm.apply({}, []);
                }, 0);
                button.removeEventListener('click', cancel);
            }
        }, 100);

        let cancel = (e) => {
            e.stopPropagation();
            clearInterval(intervalId);
            button.classList.remove(CSS_CONFIRM_RUNNING);
            progress.style.width = "100%";
            button.removeEventListener('click', cancel);
        };
        button.addEventListener('click', cancel);
    }
}


export {Utils, Modal, Button};
