import './date-navigation.scss';
import {Utils} from "../utils";
export default class DateNavigation {
    /**
     *
     * @param {HTMLElement} elem            container (ul will be written inside); Must have overflow:hidden
     * @param {function}    fn              callback for when a date is picked
     * @param {Date}        initialDate     Date to be considered as "now" initially
     * @param {string }     type            One of the supported types (day or week)
     * @param {number}      length          Number of positions to render
     */
    constructor(elem, fn = ()=>{}, initialDate = new Date(), type = DateNavigation.types().DAY, length = 31) {

        this._type = type;

        /**
         *
         * @type {Array<HTMLElement>}
         * @private
         */
        this._positions = [];

        /**
         *
         * @type {HTMLElement}
         * @private
         */
        this._container = elem;

        /**@Type HTMLElement */
        this._list = null;

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

        /**
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
        this._length = length;

        /**
         *
         * @type {function(...[*]=)}
         * @private
         */
        this._selectDateCallback = Utils.throttle((timestamp) => {
            fn.apply({}, [new Date(DateNavigation.formatDate(new Date(timestamp))), this._type]);
        }, 100);

        /**
         *
         * @type {string}
         * @private
         */
        this._selectedCss = 'selected';

        /**
         * @type {Array<{elem: HTMLElement, event: string, callback: function}>}
         * @private
         */
        this._listeners = [];

        /**
         *
         * @type {Date}
         * @private
         */
        this._selectedDate = initialDate;

        this.init();
    }

    /**
     *
     * @param {string} newType
     * @param {number} length
     */
    swapPeriodType(newType, length = 16) {
        this._type = newType;
        this._length = length;
        if (newType === DateNavigation.types().DAY)
            this._selectedDate = new Date();
        else
            this._selectedDate = new Date(DateNavigation.getMonday(Date.now()));
        this.destroy();
        this.init();
    }


    /**
     * @private
     */
    init() {
        this.buildDom();
        this.initializeEvents();
    }

    /**
     * @private
     */
    destroy() {
        for (let listener of this._listeners) {
            listener.elem.removeEventListener(listener.event, listener.callback);
        }
        this._container.innerHTML = '';
        this._positions = [];
        this._listeners = [];
    }

    /**
     * @private
     */
    buildDom() {
        this._list = document.createElement('ul');
        this._list.classList.add('date-nav-list');
        let start =  Date.now();
        let multiple = 86400000;
        if (this._type === DateNavigation.types().WEEK) {
            start = DateNavigation.getMonday(start);
            multiple *= 7;
        }
        let i = 0;
        while (this._positions.length < this._length) {
            let position = this.buildPosition(start - i * multiple);
            this._positions.push(position);
            this._list.appendChild(position);
            i++;
        }
        this._container.classList.add('date-navigation');
        this.calculatePositionWidth().then((width) => {
            this._width = width * this._positions.length;
            let containerWidth = DateNavigation.width(this._container);
            let nbrOfVisiblePositions = containerWidth / width;
            let hiddenPositions = Math.ceil(this._positions.length - nbrOfVisiblePositions);
            this._movement.boundaries.left = hiddenPositions * width * -1 ;

            this._list.style.width = this._width + "px";
            this._list.style.transform = `translate3d(${this._movement.offset}px, 0px, 0px)`;
            this._container.appendChild(this._list);
            this._selectDateCallback(this._selectedDate.getTime());
        });
    }

    /**
     * @private
     * @return {Promise<number>}
     */
    calculatePositionWidth() {
        return new Promise(resolve => {
            this._list.style.opacity = 0;
            let uuid = this._list.id = Utils.uuid();
            document.body.appendChild(this._list);
            setTimeout(() => {
                // attach to dom to calculate accurate width, but set opacity to 0, so user does not see it
                let list = document.getElementById(uuid);
                let li = list.querySelector('li');
                // calculate width
                const width = DateNavigation.width(li);
                // remove from dom and rollback opacity
                document.body.removeChild(list);
                this._list.style.opacity = 1;
                resolve(width);
            }, 0);

        });
    }

    /**
     * Create a "square" element
     * @private
     * @param milis
     * @return HTMLElement
     */
    buildPosition(milis) {
        const li = document.createElement('li');
        li.setAttribute('data-date', milis);
        const date = moment(milis);
        if (this._type === DateNavigation.types().DAY && date.format('YYYY-MM-DD') === moment(this._selectedDate).format('YYYY-MM-DD')) {
            li.classList.add(this._selectedCss);
        }

        if (this._type === DateNavigation.types().WEEK && date.isoWeek() === moment(this._selectedDate).isoWeek()) {
            li.classList.add(this._selectedCss);
        }

        li.innerHTML = `
            <div class="date-nav-label-secondary">${date.format('dd')}</div>
            <div class="date-nav-label-primary">${date.format('DD')}</div>
        `;
        return li;
    }

    /**
     * @private
     */
    initializeEvents() {

        this.registerEventListeners(this._list, 'touchstart', this.swipeStart.bind(this));
        this.registerEventListeners(this._list, 'mousedown', this.swipeStart.bind(this));

        this.registerEventListeners(this._list, 'touchmove', this.swipeMove.bind(this));
        this.registerEventListeners(this._list, 'mousemove', this.swipeMove.bind(this));

        this.registerEventListeners(this._list, 'touchend', this.swipeEnd.bind(this));
        this.registerEventListeners(this._list, 'mouseup', this.swipeEnd.bind(this));
        this.registerEventListeners(this._list, 'touchcancel', this.swipeEnd.bind(this));
        this.registerEventListeners(this._list, 'mouseleave', this.swipeEnd.bind(this));
    }

    /**
     *
     * @param {HTMLElement} elem
     * @param {string} event
     * @param {function} callback
     */
    registerEventListeners(elem, event, callback) {
        this._listeners.push({elem, event, callback});
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

        this._movement.offset = x - this._movement.x;

        // define boundaries
        let position = this._movement.position + this._movement.offset;
        if (position > this._movement.boundaries.right)
            position = this._movement.boundaries.right;

        if (position < this._movement.boundaries.left) {
            position = this._movement.boundaries.left;
        }

        this._list.style.transform = `translate3d(${position}px, 0px, 0px)`;
        this._movement.lastMovementFinishedAt = Date.now();
    }

    /**
     * @param {MouseEvent} event
     * @private
     */
    swipeEnd(event) {
        event.stopPropagation();
        this._movement.started = false;
        this._movement.x = null;
        this._movement.position += this._movement.offset;
        this._movement.offset = 0;
        this._movement.position = this._movement.position > 0 ? 0 : this._movement.position;
        this._movement.finishedAt = Date.now();
        let gap = event instanceof MouseEvent ? 100 : 50;
        if (this._movement.finishedAt - this._movement.startedAt <= gap) {
            const li = event.target.closest('li');
            this.selectDate(li);
        }
    }

    selectDate(li) {
        const timestamp = parseInt(li.getAttribute('data-date'));
        this.toggleSelected(li, this._selectedCss);
        this._selectDateCallback(timestamp);
        this._selectedDate = new Date(timestamp);
    }

    /**
     * @private
     * @param {HTMLElement} element
     * @param {String} css
     */
    toggleSelected(element, css) {
        const selected = this._list.querySelector('li.' + css);
        if (selected) selected.classList.remove(css);
        element.classList.add(css);
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
     * @private
     * @param {HTMLElement} elem
     * @return {number}
     */
    static width(elem) {
        let s = window.getComputedStyle(elem, null);
        return elem.offsetWidth
            + parseInt(s.getPropertyValue('margin-left'))
            + parseInt(s.getPropertyValue('margin-right'));
    }

    static formatDate(date) {
        return date.getFullYear() + '-'
            + ((date.getMonth() + 1) + "").padStart(2, '0') + '-'
            + (date.getDate() + "").padStart(2, '0');
    }

    /**
     *
     * @return {{WEEK: string, DAY: string}}
     */
    static types() {
        return {
            DAY: 'day', WEEK: 'week'
        }
    }

    /**
     *
     * @param timestamp
     * @return {number}
     */
    static getMonday(timestamp) {
        const date = new Date(timestamp);
        let day = date.getDay(),
            diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff)).getTime();
    }
}