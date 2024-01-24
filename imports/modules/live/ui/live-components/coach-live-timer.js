import {ExpressionUtils} from "../../../../expressions/utils";
import LiveSessionState from "./coach-live-state";
import {Utils} from "../../../../utils/utils";
import {IntervalType, LiveSessionType} from "../../api/liveDevicesConstants";
import i18n from "../../../../utils/i18n";

const TIMER_FORMAT = 'hh:mm:ss';

class LiveTimer {

    /**
     *
     * @param {LiveSessionState} state
     */
    constructor(state) {
        this._id = Utils.uuid();
        this.state = state;
        this.$value = $('.coach-live-session-timer');
        this.$label = $('.coach-live-session-timer-recovery-label');
        this.isFreeSession = this.state.getLiveSession().type === LiveSessionType.FREE;
        this.running = false;
        this.interval = -1;

        this.sessionStartedAt = this.state.getLiveSession().startedAt;

        this.inScheduledSession = state.inScheduledSession();
        this.splits = {initiated: false, intervals: null};
        this.listeners = [];

        if (state.getSessionExpression()) {
            let expression = ExpressionUtils.parse(this.state.getSessionExpression());
            this.splits.initiated = true;
            this.splits.intervals = ExpressionUtils.expand(expression);
            this.splits.totalWorkingIntervals = ExpressionUtils.countWorkingIntervals(this.splits.intervals);
            this.splits.executedWorkingIntervals = 0;
            this.splits.buffer = 0;
        }

        if (this.isFreeSession) {
            this.$label.remove();
        }

        console.debug(`Instance of timer ${this._id} initiated`);

    }

    refresh() {

        if (this.state.getLiveSession().isFinished() === true) {
            return this.setHtml(moment.duration(this.state.getLiveSession().duration).format(TIMER_FORMAT, {trim: false}));
        }

        if (this.state.inLiveSession()) {
            let startedAt = this.sessionStartedAt;

            if (this.state.inFreeSession()) {
                let split = this.state.getCurrentSplit();
                if (split && split.isRecovery === false) {
                    startedAt += split.startedAt;
                }
            } else if (this.state.areSplitsFinished()) {
                let split = this.state.getLastWorkingSplit();
                if (split) {
                    startedAt += split.finishedAt;
                }
            } else {
                let split = this.state.getCurrentSplit();
                if (split) {
                    startedAt += split.startedAt;
                }
            }

            return this.syncTimer(startedAt);
        }

        this.timer(this.getCurrentCannonicalTime());
    }

    getStartedAt() {
        if (!this.state.inLiveSession()) return;

        let split = this.state.getCurrentSplit();
        if (split && split.isRecovery === false)
            return this.sessionStartedAt + split.startedAt;

        return this.sessionStartedAt;
    }

    getDuration() {
        return this.getCurrentCannonicalTime() - this.getStartedAt();
    }

    getFullDuration() {
        return this.getCurrentCannonicalTime() - this.sessionStartedAt
    }

    getDurationAtNextSecondChange() {
        return Math.ceil(this.getDuration() / 1000) * 1000;
    }

    setHtml(content) {
        this.$value.html(content);
    }

    /**
     *
     * @param {number} startedAt Timestamp of start + server offset
     */
    startSplitImmediately(startedAt) {
        let self = this;
        self.timer(startedAt);
    }

    timer(startedAt) {
        let self = this, timestamp, duration
            , /**@type number */ gap = startedAt - this.sessionStartedAt;

        if (isNaN(gap)) {
            gap = 0;
        }

        clearInterval(self.interval);
        self.$value.text('00:00:00');

        self.interval = setInterval(function () {
            let content;
            timestamp = self.getCurrentCannonicalTime();
            duration = timestamp - startedAt + gap;
            console.debug('... duration => ', duration);

            for (let listener of self.listeners) {
                listener.apply({}, [timestamp, duration]);
            }

            if (self.isFreeSession) {
                self.setHtml(moment.duration(duration - gap).format(TIMER_FORMAT, {trim: false}));
                return;
            }

            if (self.state.inWarmUp()) {
                self.setHtml(moment.duration(duration - gap).format(TIMER_FORMAT, {trim: false}));
                self.$label.html(i18n.translate('coach_live_session_info_warm_up'));
                return;
            }

            if (self.state.areSplitsFinished()) {
                self.setHtml(moment.duration(duration - gap).format(TIMER_FORMAT, {trim: false}));
                self.$label.html(i18n.translate('coach_live_session_info_finished'));
                return;
            }

            let label = null, interval = self.state.getCurrentInterval();

            if (interval) {
                label = interval.toString();
            }

            /**@type LiveSessionSplit*/
            const split = self.state.getCurrentSplit();
            if (split && split.isRecovery) {
                label = i18n.translate('coach_live_session_info_recovery');
            }

            /**@type Interval */
            let previous = split ? self.splits.intervals[split.number - 1] : null;
            let afterDistanceBased = false;
            if (previous && previous.isBasedInDistance()) {
                label = 'recovery';
                afterDistanceBased = true;
            }

            let time = duration - gap;
            if (split && split.type === IntervalType.TIME && afterDistanceBased === false) {
                /**@type Interval */
                let interval = self.splits.intervals[split.number];
                time = interval.estimatedDurationInSeconds() * 1000 - time;
            }

            content = moment.duration(time < 0 ? 0 : time).format(TIMER_FORMAT, {trim: false});
            self.setHtml(content);
            self.$label.html(label);

        }, 1000);
    }

    stopSplitImmediately() {
        this.timer(this.sessionStartedAt);
    }

    getCurrentCannonicalTime() {
        return new Date(Date.now() + this.state.getServerOffset()).getTime();
    }

    /**
     * Called when user hits the start intervals button
     */
    startScheduledSession() {
        let self = this;

        self.setHtml('00:00:00');
        this.inScheduledSession = true;
        if (this.splits.initiated && this.splits.intervals[0].isBasedInDistance()) {
            this.timer(this.getCurrentCannonicalTime());
        }
    }

    destroy() {
        console.debug('destroying timer', this._id);
        clearInterval(this.interval);
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * Used when running sessions that have distance and time based intervals
     * at the same time
     */
    splitChanged() {
        if (this.state.inFreeSession()) {
            return;
        }
        let split = this.state.getCurrentSplit();
        if (!split) {
            console.log('no split found, last working... ', this.splits.totalWorkingIntervals, this.splits.executedWorkingIntervals);
            if (this.splits.totalWorkingIntervals === this.splits.executedWorkingIntervals) {
                // session finished;
                this.inScheduledSession = false;
                this.timer(this.sessionStartedAt);
            }
            return;
        }

        if (split.isRecovery === false) {
            console.log('counting working intervals [from, to]', this.splits.executedWorkingIntervals, this.splits.executedWorkingIntervals + 1);
            this.splits.executedWorkingIntervals++;
        }


        if (split.type === IntervalType.DISTANCE && !this.state.inSoloSession()) {
            console.log('doing nothing for distance base interval');
            return;
        }

        this.syncTimer(this.sessionStartedAt + split.startedAt);
    }

    syncTimer(startedAt) {
        const self = this, diff = (startedAt % 1000) - (this.getCurrentCannonicalTime() % 1000);
        setTimeout(function () {
            self.timer(startedAt);
        }, diff < 0 ? diff + 1000 : diff);
    }

}

export default LiveTimer;
