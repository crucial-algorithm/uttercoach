import {PT_TRANSLATIONS} from "../ui/i18n/pt";
import {EN_TRANSLATIONS} from "../ui/i18n/en";
import {Meteor} from "meteor/meteor";

const translations = {
    pt: PT_TRANSLATIONS,
    en: EN_TRANSLATIONS
};

function getLang () {
    return (
        navigator.languages && navigator.languages[0] ||
        navigator.language ||
        navigator.browserLanguage ||
        navigator.userLanguage ||
        'en-US'
    );
}


export default class i18n {
    constructor() {

    }

    static translate(key, placeholders, language = null) {
        let text = translations[language || i18n.language()][key] || "";
        placeholders = placeholders || [];
        let i = 1;
        for (let placeholder of placeholders) {
            text = text.replace(new RegExp("\\$" + i, "g"), placeholder);
            i++;
        }
        return text;
    }

    static language(user = null) {
        user = user || Meteor.user();
        let language = user ? user.profile.language : undefined;

        if (!language) language = getLang();
        language = language.substring(0, 2);

        if (['pt', 'en', 'es'].indexOf(language) < 0) {
            language = 'pt';
        }
        return language;
    }

    static setup() {
        let language = i18n.language();
        moment.locale(language);
    }

    /**
     *
     * @param id
     * @return {string}
     */
    static languageByUserId(id) {
        const user = Meteor.users.findOne({_id: id});
        if (!user) return 'en';
        return user.profile.language ? user.profile.language : 'en';
    }

    static getDateLang() {
        const user = Meteor.user();
        let language = user.profile.language ? user.profile.language : 'en';
        return language === 'pt' ? 'pt-PT' : 'en-US';
    }

}
