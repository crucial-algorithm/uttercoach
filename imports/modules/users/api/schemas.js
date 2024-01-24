import {CountryCodes} from "../../../utils/countries";
import {UserUtils} from "./utils";

/**
 * @typedef {object} SimpleUser
 *
 * @property {string} email
 * @property {string} password
 * @property {Profile} profile
 */

/**
 * @typedef {object} Profile
 *
 * @property {string} name
 * @property {string} email
 * @property {string} country
 * @property {('female'|'male')} gender
 * @property {date} birthdate
 * @property {string} about
 * @property {boolean} debug
 * @property {string} device
 */

const ProfileSchema = new SimpleSchema({
    name: {type: String, min: 0, max: 200},
    email: {type: String},
    country: {type: String, allowedValues: CountryCodes, optional: true, defaultValue: null},
    gender: {type: String, allowedValues: ['female', 'male'], optional: true, defaultValue: null},
    birthdate: {type: Date, optional: true, defaultValue: null},
    inMailchimp: {type: Boolean, defaultValue: false},
    about: {type: String, optional: true, min: 0, max: 4000},
    debug: {type: Boolean, defaultValue: false},
    device: {type: String, optional: true},
    liveUpdateEvery: {type: Number, optional: false, defaultValue: 1},
    boat: {type: String, optional: true, defaultValue: null},
    maxHeartRate: {type: Number, optional: false, defaultValue: 200},
    origin: {type: String, allowedValues: [UserUtils.ORIGINS.WEB, UserUtils.ORIGINS.APP, UserUtils.ORIGINS.GOPADDLER, UserUtils.ORIGINS.UTTER_CYCLING]}
}, {
    clean: {
        filter: true,
        autoConvert: true,
        trimStrings: true
    }
});

export default ProfileSchema;
