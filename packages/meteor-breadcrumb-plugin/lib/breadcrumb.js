String.prototype.capitalize = function () {
    return this.replace(/(?:^|\s)\S/g, function (a) {
        return a.toUpperCase();
    });
};

let params = {};

function enrichRouteObject(name, params, isCurrent) {

    /*
     * Handle title option.
     *
     * Includes replacing any referenced parameters by their values.
     */
    var route = Router.routes[name],
        routeOptions = route && route.options,
        title = (routeOptions && routeOptions.hasOwnProperty('title')) ? routeOptions.title : Router.options.defaultBreadcrumbTitle;

    if (typeof title === 'function') {
        title = title.call(Router.current());
    }

    params = params || {};

    if (title) {

        for (var i in params) {
            title = title && title.replace(new RegExp((':' + i).replace(/\+/g, "\\+"), "g"), params[i]);
        }

        if (!routeOptions.noCaps) {
            title = title && title.capitalize();
        }

    } else {

        title = null;
    }

    var cssClasses = (isCurrent ? 'active' : '');

    /*
     * Handle showLink option.
     *
     * 1) Route option (showLink)
     * 2) Global flag (defaultBreadcrumbLastLink) - only for the current path
     * 3) Default value (true)
     */
    var showLink = true;

    if (typeof routeOptions.showLink === 'boolean') {
        showLink = routeOptions.showLink;
    } else if (typeof Router.options.defaultBreadcrumbLastLink === 'boolean' && isCurrent) {
        showLink = Router.options.defaultBreadcrumbLastLink;
    }

    if (title) {
        return {
            'route': route,
            'params': params,
            'title': title,
            'showLink': showLink,
            'cssClasses': cssClasses,
            'url': route.path(params)
        };
    }
}

function getAllParents() {

    let current = Router.current().route;

    if (!current) {
        return [];
    }

    let name = Router.current().route.getName();
    params[name] = Router.current().params;

    let parent = current.options.hasOwnProperty('parent') ? current.options.parent : Router.options.parent;

    if (typeof parent === 'function') {
        parent = parent.call(Router.current());
    }

    if (typeof parent === 'string') {

        let route = Router.routes[parent];

        parent = {
            name: route.getName(),
            params: params[route.getName()] || {}
        };
    }

    if (parent) {
        return getParentParent([enrichRouteObject(current.getName(), Router.current().params, true), enrichRouteObject(parent.name, parent.params)]);
    } else {
        return [enrichRouteObject(current.getName(), Router.current().params)];
    }
}

function getParentParent(parents) {

    var lastParent = parents[parents.length - 1],
        newParent = (lastParent && lastParent.route.options.parent);

    if (!newParent) {
        return parents;
    }

    if (typeof newParent === 'function') {
        newParent = newParent.call(Router.current());
    }

    if (typeof newParent === 'string') {

        var route = Router.routes[newParent];

        newParent = {
            name: route.getName(),
            params: params[route.getName()] || {}
        };
    }

    parents.push(enrichRouteObject(newParent.name, newParent.params));

    return getParentParent(parents);
}

Breadcrumb = {
    getAll: function () {
        return getAllParents().reverse();
    }
};

UI.registerHelper('Breadcrumb', function () {
    return Breadcrumb.getAll();
});
