import './week-view.scss';
import {Utils} from "../utils";
import i18n from "../i18n";

class SwipeEvents {

    constructor(stepMove = false) {
        /**
         * Internal state to control swipe
         * @type {{offset: number, x: null, startedAt: number, boundaries: {left: number, right: number}, started: boolean, position: number, finishedAt: number}}
         * @private
         */
        this._movement = {
            started: false,
            x: null,
            offset: 0,
            position: 0,
            startedAt: 0,
            finishedAt: 0,
            boundaries: {
                left: 0,
                right: 0
            }
        };

        /**@Type HTMLElement */
        this._elem = null;

        /**
         * @type {Array<{elem: HTMLElement, event: string, callback: function}>}
         * @private
         */
        this._listeners = [];

        /**
         *
         * @type {{}}
         * @private
         */
        this._externalListeners = {};

        /**
         *
         * @type {number}
         * @private
         */
        this._reference = 0;

        this._stepMove = stepMove;
    }

    /**
     *
     * @param {HTMLElement} elem
     * @param {Number} width
     */
    initializeEvents(elem, width) {
        this._elem = elem;

        this.registerEventListeners(this._elem, 'touchstart', this.swipeStart.bind(this));
        this.registerEventListeners(this._elem, 'mousedown', this.swipeStart.bind(this));

        this.registerEventListeners(this._elem, 'touchmove', this.swipeMove.bind(this));
        this.registerEventListeners(this._elem, 'mousemove', this.swipeMove.bind(this));

        this.registerEventListeners(this._elem, 'touchend', this.swipeEnd.bind(this));
        this.registerEventListeners(this._elem, 'mouseup', this.swipeEnd.bind(this));
        this.registerEventListeners(this._elem, 'touchcancel', this.swipeEnd.bind(this));
        this.registerEventListeners(this._elem, 'mouseleave', this.swipeEnd.bind(this));

        this._reference = width;
    }

    /**
     *
     * @param {HTMLElement} elem
     * @param {string} event
     * @param {function} callback
     */
    registerEventListeners(elem, event, callback) {
        this._listeners.push({elem:elem, event: event, callback: callback});
        elem.addEventListener(event, callback);
    }

    /**
     * @param {MouseEvent} event
     * @private
     */
    swipeStart(event) {
        event.stopPropagation();
        this._movement.started = true;
        this._movement.startedAt = Date.now();
        let x = this.getX(event);
        if (x === null) return;
        this._movement.x = x;
    }

    /**
     * @param {MouseEvent} event
     * @private
     */
    swipeMove(event) {
        event.stopPropagation();

        if (this._movement.started === false) return;
        let x = this.getX(event);
        if (x === null) return;

        this._movement.offset = x - this._movement.x ;

        // define boundaries
        let position = this._movement.position + this._movement.offset;
        if (position > this._movement.boundaries.right)
            position = this._movement.boundaries.right;

        if (position < this._movement.boundaries.left) {
            position = this._movement.boundaries.left;
        }

        this._elem.style.transform = `translate3d(${position}px, 0px, 0px)`;
        this._movement.lastMovementFinishedAt = Date.now();
    }

    /**
     * @param {MouseEvent} event
     * @private
     */
    swipeEnd(event) {
        event.stopPropagation();
        this._movement.finishedAt = Date.now();
        let gap = event instanceof MouseEvent ? 100 : 50;

        if (this._movement.finishedAt - this._movement.startedAt <= gap) {
            console.log(event.target);
            for (let css of event.target.classList) {
                this.trigger(css, event);
            }
            return;
        }

        this._movement.started = false;
        this._movement.startedAt = 0;
        this._movement.x = null;

        if (this._stepMove === true) return this.moveStep();

        this._movement.position += this._movement.offset;
        this._movement.offset = 0;
        this._movement.position = this._movement.position > 0 ? 0 : this._movement.position;
    }


    moveStep() {
        let start = this._movement.position;
        console.log('move step', this._movement.position, this._movement.offset, this._reference * .2, this._reference * -.2);
        let offset = this._movement.offset;
        if (offset > this._reference *  .2) this.incrementPosition();
        if (offset < this._reference * -.2) this.decrementPosition();
        console.log('set position to', this._movement.position);
        if (start + this._movement.offset !== this._movement.position)
            this.animate(start + this._movement.offset, this._movement.position);
        this._movement.offset = 0;

    }

    incrementPosition() {
        console.log('increment position', this._movement.position);
        if (this._movement.position + this._reference >= this._movement.boundaries.right) {
            console.log('hit limit, resetting', 0);
            this._movement.position = 0;
        } else {
            this._movement.position = this._movement.position + this._reference;
        }
        console.log('incremented to', this._movement.position)
    }

    decrementPosition() {
        console.log('decrement position', this._movement.position);
        if (this._movement.position - this._reference <= this._movement.boundaries.left) {
            console.log('hit limit, do nothing', this._movement.position);
            // do nothing
        } else {
            this._movement.position = this._movement.position - this._reference;
        }
        console.log('decremented to', this._movement.position);
    }

    animate(from, to) {
        const steps = 10;
        let step = (to - from) / steps;
        let position = from;
        let i = 0;
        let x = setInterval(() => {
            i++;
            position += step;
            if (i === steps) {
                position = to;
                clearInterval(x);
            }
            this._elem.style.transform = `translate3d(${position}px, 0px, 0px)`;
        }, 25);

    }

    /**
     * Adds element to body, calculates with and detaches it again
     * @param {HTMLElement} container
     * @param {string} elemQuerySelector
     * @return {Promise<number>}
     */
    calculateDetachedElemWidth(container, elemQuerySelector) {
        return new Promise(resolve => {
            container.style.opacity = "0";
            let uuid = container.id = Utils.uuid();
            document.body.appendChild(container);
            setTimeout(() => {
                // attach to dom to calculate accurate width, but set opacity to 0, so user does not see it
                let elem = document.getElementById(uuid);
                let week = elem.querySelector(elemQuerySelector);
                // calculate width
                const width = this.width(week);
                // remove from dom and rollback opacity
                document.body.removeChild(elem);
                elem.style.opacity = "1";
                elem.id = "";
                resolve(width);
            }, 0);

        });
    }

    /**
     * @param {HTMLElement} elem
     * @param {boolean} excludeMargin
     * @return {number}
     */
    width(elem, excludeMargin = false) {
        let s = window.getComputedStyle(elem, null);
        let margin = parseInt(s.getPropertyValue('margin-left'))
            + parseInt(s.getPropertyValue('margin-right'));
        return elem.offsetWidth
            + (excludeMargin ? 0 : margin);
    }

    /**
     *
     * @private
     * @param {MouseEvent|TouchEvent} event
     * @return {number|null}
     */
    getX(event) {
        if (event instanceof TouchEvent) {
            if (event.touches.length > 1) {
                return null;
            }
            return event.touches[0].clientX;
        }

        return event.clientX;
    }

    /**
     *
     * @param {String} cssClass
     * @param {Function} callback
     */
    on(cssClass, callback) {
        this._externalListeners[cssClass] = this._externalListeners[cssClass] || [];
        this._externalListeners[cssClass].push(callback);
    }

    trigger(cssClass, event) {
        let listeners = this._externalListeners[cssClass];
        if (!listeners) return;
        for (let listener of listeners) {
            listener.apply({}, [event])
        }
    }

    setPosition(position) {
        if (!this._elem || position === undefined) return;
        this._elem.style.transform = `translate3d(${position}px, 0px, 0px)`;
        this._movement.position = position;
    }

    destroy() {
        for (let listener of this._listeners) {
            listener.elem.removeEventListener(listener.event, listener.callback);
        }
        this._listeners = [];
    }

    get movement() {
        return this._movement;
    }

}

class WeekPlanningView extends SwipeEvents {

    /**
     *
     * @param {HTMLElement} elem       container (ul will be written inside); Must have overflow:hidden
     * @param {number} position        initial position
     */
    constructor(elem, position = undefined) {
        super(Utils.inMobile());

        /**
         *
         * @type {Array<HTMLElement>}
         * @private
         */
        this._positions = [];

        /**@Type HTMLElement */
        this._parent = elem;

        /**@Type HTMLElement */
        this._container = null;

        this._nbrOfWeeks = 9;
        this._weeksForTheFuture = 4;

        this.init();

        this._initialPosition = position;

        /**
         * Width of all the weeks combined (internal width)
         *
         * @type {number}
         * @private
         */
        this._width = 0;

        /**
         *
         * @type {number}
         * @private
         */
        this._containerWidth = 0;
    }

    init() {
        this.buildDom().then((elem) => {
            super.initializeEvents(elem, this._width / this._positions.length);
            super.setPosition(this._initialPosition);
        });
    }

    /**
     *
     * @return {Promise<HTMLElement>}
     */
    buildDom() {
        return new Promise((resolve) => {
            this._container = document.createElement('div');
            this._container.classList.add('week-view-container');
            let multiple = 7 * 86400000;
            let start = WeekPlanningView.getMonday(this.calcDateWithoutHour(Date.now()) -
                ((this._nbrOfWeeks - this._weeksForTheFuture - 1) * multiple));

            let i = 0;
            while (this._positions.length < this._nbrOfWeeks) {
                let monday = start + i * multiple;
                let now = this.calcDateWithoutHour(Date.now());
                let position = this.buildWeek(monday);
                if (monday <= now && (monday + multiple) > now) {
                    position.classList.add('current');
                }
                this._positions.push(position);
                this._container.appendChild(position);
                i++;
            }

            super.calculateDetachedElemWidth(this._container, '.week').then((width) => {
                this._width = width * this._positions.length;
                let containerWidth = super.width(this._parent, true);
                let nbrOfVisiblePositions = containerWidth / width;
                let hiddenPositions = Math.ceil(this._positions.length - nbrOfVisiblePositions);
                this.movement.boundaries.left = hiddenPositions * width * -1 ;

                // center in screen, based on the nbr of positions in the future and the number of visible positions
                let z = (nbrOfVisiblePositions - 1);
                z = z > 0 ? z / 2 : 0;
                let initialOffset = (this._weeksForTheFuture - z) * -width;

                this._container.style.width = this._width + "px";
                this._container.style.transform = `translate3d(${initialOffset}px, 0px, 0px)`;
                this._parent.appendChild(this._container);
                this._containerWidth = containerWidth;
                this.movement.position = initialOffset;
                resolve(this._container);
            });
        })
    }

    calcDateWithoutHour(timestamp) {
        let date = new Date(timestamp);
        return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }


    /**
     *
     * @param {number} monday
     * @return HTMLElement
     */
    buildWeek(monday) {
        let week = document.createElement('ul');
        week.classList.add('week');
        let startOfCurrentWeek = WeekPlanningView.getMonday(this.calcDateWithoutHour(Date.now()));
        let weeksAgo = Math.floor((monday - startOfCurrentWeek) / 86400000 / 7);
        if (weeksAgo < 0) week.classList.add('week-in-the-past');
        week.appendChild(this.buildHeader(monday, weeksAgo));
        for (let i = 0; i < 7; i++) {
            week.appendChild(this.buildDay(monday + i * 86400000));
        }
        return week;
    }

    /**
     *
     * @param monday
     * @param weeksAgo
     * @return {SVGElement | HTMLElement | HTMLLIElement | any | ActiveX.IXMLDOMElement}
     */
    buildHeader(monday, weeksAgo) {
        const li = document.createElement('li');
        let label = i18n.translate(`schedule_week_header_other_weeks_${weeksAgo}` );
        if (weeksAgo === 0) label = i18n.translate("schedule_week_header_current_week");
        li.classList.add('week-header');
        li.innerHTML = label;
        return li;
    }

    /**
     * Create a day element
     * @private
     * @param timestamp
     * @return HTMLElement
     */
    buildDay(timestamp) {
        const li = document.createElement('li');
        li.classList.add('day');
        let date = new Date(timestamp);
        li.setAttribute('data-day-of-week', date.getDay() + "");
        li.setAttribute('data-day', this.toDay(date));
        li.setAttribute('data-even-month', (new Date(timestamp).getMonth() % 2 === 0) + "");

        let lang = i18n.getDateLang();
        let dayOfWeek = date.toLocaleDateString(lang, {weekday: 'long'});
        let dayOfMonth = (date.getDate() + "").padStart(2, '0');
        let month = date.toLocaleDateString(lang, {month: 'short'});

        li.innerHTML = `
            <div class="day-date">
                <span class="day-date-dow">${dayOfWeek}</span>
                <span class="day-date-dom">${dayOfMonth}</span>
                <span class="day-date-m">${month}</span>
            </div>
            <div class="day-body"></div>
            <div class="day-footer"><span class="coach-schedule-add-session">${i18n.translate('schedule_session_add')}</span></div>
        `;
        return li;
    }

    static getMonday(timestamp) {
        const date = new Date(timestamp);
        let day = date.getDay(),
            diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff)).getTime();
    }

    destroy() {
        super.destroy();
        this._parent.innerHTML = '';
    }

    /**
     *
     * @param date
     * @return {string}
     */
    toDay(date) {
        let month = ((date.getMonth() + 1)  + "").padStart(2, '0');
        let day = (date.getDate() + "").padStart(2, '0');
        return `${date.getFullYear()}-${month}-${day}`;
    }

    /**
     *
     * @param {Date}        date
     * @private
     * @return {Element}
     */
    getDay(date) {
        let str = this.toDay(date);
        return document.querySelector(`[data-day="${str}"]`);

    }

    appendToDay(date, template) {
        let day = this.getDay(date);
        if (!day) return;
        let body = day.querySelector(`.day-body`);
        body.innerHTML += template;
        setTimeout(() => {
            this.adjustHeight(`[data-day-of-week="${date.getDay()}"] > .day-body`);
        }, 0);
    }

    /**
     *
     * @param {String} selector
     */
    adjustHeight(selector) {
        let days = document.querySelectorAll(selector);
        let max = 0;
        for (let day of days) {
            if (day.clientHeight > max) {
                max = day.clientHeight;
            }
        }

        for (let day of days) {
            day.style.height = max + "px"
        }
    }

    /**
     *
     * @param {String|Array<String>} cssClass
     * @param {function} callback
     */
    on(cssClass, callback) {
        if (!Array.isArray(cssClass)) {
            super.on(cssClass, callback);
            return;
        }

        for (let css of cssClass) {
            super.on(css, callback);
        }

    }

    /**
     *
     * @return {number}
     */
    get position() {
        return this.movement.position;
    }

    setPosition(position) {
        super.setPosition(position);
    }
}

export {WeekPlanningView, SwipeEvents}