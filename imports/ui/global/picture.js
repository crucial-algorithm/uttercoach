
import './picture.html';
import {Coach} from "../../modules/coaches/api/collections";
import {Athlete} from "../../modules/athletes/api/collections";
import {Utils} from "../../utils/utils";

Template.picture.helpers({
    initials: function () {
        if (!this.name && !this.id) throw 'missing params for picture';
        let name = this.name;
        if (!name && this.id) {
            if (this.type === 'coach') {
                let coach = Coach.find(this.id);
                name = coach ? coach.name : null;
            } else {
                let athlete = Athlete.find(this.id);
                name = athlete ? athlete.name : null;
            }
        }

        return Utils.getInitials(name);
    },

    size: function () {
        switch (this.size) {
            case 'extra-small':
                return 'avatar-extra-small';
            case 'small':
                return 'avatar-small';
            case 'large':
                return 'avatar-large';
            default:
                return ''
        }
    },

    extraCssClass: function () {
        return this.class || '';
    },

    bgColor: function () {
        return this.bgColor || "#aaa";
    }
});