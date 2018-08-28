parcelRequire=function(e,r,n,t){var i="function"==typeof parcelRequire&&parcelRequire,o="function"==typeof require&&require;function u(n,t){if(!r[n]){if(!e[n]){var f="function"==typeof parcelRequire&&parcelRequire;if(!t&&f)return f(n,!0);if(i)return i(n,!0);if(o&&"string"==typeof n)return o(n);var c=new Error("Cannot find module '"+n+"'");throw c.code="MODULE_NOT_FOUND",c}p.resolve=function(r){return e[n][1][r]||r};var l=r[n]=new u.Module(n);e[n][0].call(l.exports,p,l,l.exports,this)}return r[n].exports;function p(e){return u(p.resolve(e))}}u.isParcelRequire=!0,u.Module=function(e){this.id=e,this.bundle=u,this.exports={}},u.modules=e,u.cache=r,u.parent=i,u.register=function(r,n){e[r]=[function(e,r){r.exports=n},{}]};for(var f=0;f<n.length;f++)u(n[f]);if(n.length){var c=u(n[n.length-1]);"object"==typeof exports&&"undefined"!=typeof module?module.exports=c:"function"==typeof define&&define.amd?define(function(){return c}):t&&(this[t]=c)}return u}({"7QCb":[function(require,module,exports) {
"use strict";var e="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},t=this&&this.__assign||function(){return(t=Object.assign||function(e){for(var t,r=1,i=arguments.length;r<i;r++)for(var n in t=arguments[r])Object.prototype.hasOwnProperty.call(t,n)&&(e[n]=t[n]);return e}).apply(this,arguments)};exports.__esModule=!0;var r={_OR:"$or",_AND:"$and",_NOR:"$nor",_ALL:"$all",_IN:"$in",_NIN:"$nin",_EQ:"$eq",_NE:"$ne",_LT:"$lt",_LTE:"$lte",_GT:"$gt",_GTE:"$gte",_GEO_INTERSECTS:"$geoIntersects",_GEO_WITHIN:"$geoWithin",_NEAR:"$near",_GEOMETRY:"$geometry",_BOX:"$box",_POLYGON:"$polygon",_CENTER:"$center",_CENTER_SPHERE:"$centerSphere",_MAX_DISTANCE:"$maxDistance",_MIN_DISTANCE:"$minDistance"},i={_EXACT:function(e){return e._EXACT},_REGEX:function(e){return RegExp(e._REGEX,e._FLAG)},_FLAG:function(e){if(!e._REGEX)throw new Error("_FLAG can only be used together with _REGEX filter.");return RegExp(e._REGEX,e._FLAG)},_DATE:function(e){return new Date(e._DATE)}},n=function(){function n(e,t){void 0===e&&(e=r),void 0===t&&(t=i),this.keywords=e,this.values=t,this.directTypes=["string","number","boolean"]}return n.prototype.isOperator=function(e){return~Object.keys(this.keywords).indexOf(e)},n.prototype.isValue=function(t){if(~this.directTypes.indexOf(void 0===t?"undefined":e(t)))return!0;if("object"===(void 0===t?"undefined":e(t))){var r=!1;for(var i in t)~Object.keys(this.values).indexOf(i)&&(r=!0);return r}return!1},n.prototype.isEmbeded=function(t){if("object"===(void 0===t?"undefined":e(t))){var r=!1;for(var i in t)if(!this.isOperator(i)&&!this.isValue(t[i])){r=!0;break}return r}return!1},n.prototype.argType=function(e,t){return this.isOperator(e)?"OPERATOR":this.isValue(t)?"VALUE":this.isEmbeded(t)?"EMBEDDED":null},n.prototype.parseEmbedded=function(e,t,r){void 0===r&&(r={});var i=r;for(var n in t){var o=e+"."+n,s=t[n],u=!1;for(var a in s){if("EMBEDDED"!==this.argType(a,s)){u=!0;break}}u?i[o]=this.buildFilters(s):this.parseEmbedded(o,s,i)}return i},n.prototype.buildFilters=function(r){var i,n=this;if(~this.directTypes.indexOf(void 0===r?"undefined":e(r)))return r;if(this.isValue(r))for(var o in this.values)if(r[o])return this.values[o](r);for(var s in r){var u=r[s],a=this.argType(s,u);if("OPERATOR"===a){i={};var f=this.keywords;for(var E in f)s===E&&(Array.isArray(u)?i[f[E]]=u.map(function(e){return n.buildFilters(e)}):i[f[E]]=this.buildFilters(u))}else"EMBEDDED"===a?i=t({},i,this.parseEmbedded(s,u)):Array.isArray(r)?(i||(i=[]),i=i.concat([this.buildFilters(u)])):(i||(i={}),i[s]=this.buildFilters(u))}return i},n}();exports.default=n;
},{}]},{},["7QCb"], null)
//# sourceMappingURL=/index.map