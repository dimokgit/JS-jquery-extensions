/// <reference path="jquery.js" />
/// <reference path="knockout.js" />
/// <reference path="MicrosoftAjax.js" />
(function () {
  if (typeof define === "function" && define.amd) {
    define(["jquery"], function ($) {
      factory($);
    })
  } else
    factory($);

  function factory($) {
    $.extend({
      Linq: {
        takeWhile: function (array, startElement, predicate) {
          var i = $.inArray(startElement, array) + 1;
          if (typeof predicate == "number") return array.slice(i, i + predicate);
          var a = [];
          for (; i < array.length; i++)
            if (!predicate(array[i])) break;
            else a.push(array[i]);
          return a;
        },
        last: function (array) { return array[array.length - 1]; },
        select: function (array, prop) {
          return $.map(array, function (v, n) { return v[prop]; });
        },
        first: function (o, filter) {
          var out;
          $.each(o, function (i, v) {
            if (filter(v, i)) {
              out = v;
              return false;
            }
          });
          return out;
        },
        toDictionary: function (array, key) {
          if (!array || !array.length) return {};
          if (!$.isFunction(key) && !array[0].hasOwnProperty(key)) return alert("Array element does not have property named [" + key + "].") || {};
          var o = {}; $.h
          $.map(array, function (v, n) {
            return o[($.isFunction(key) ? key(v) : v[key]) + ""] = v;
          });
          return o;
        }
      }
    });
  }
})();