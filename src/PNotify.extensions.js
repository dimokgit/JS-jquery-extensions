(function () {
  if (typeof define === "function" && define.amd) {
    define(["jquery", "pnotify"], function ($, PNotify) {
      return factory($, PNotify);
    })
  } else
    factory($, PNotify);

  /// PNotify Extensions
  function factory($, PNotify) {
    PNotify.prototype.options.styling = "fontawesome";
    return {
      showInfoPerm: showInfoPerm,
      showInfo: showInfo,
      showSuccess: showSuccess,
      showErrorPerm: showErrorPerm,
      showError: showError
    };
    function notify(message, type, settings) {
      var stack_bottomleft = { "dir1": "up", "dir2": "right", "push": "top", "spacing1": 10, "spacing2": 10, firstpos1: 10, firstpos2: 10 };
      var s = $.extend(true,
        $.isPlainObject(message) ? message : { text: message }
        , {
          type: type,
          delay: 3000,
          icon: true,
          addclass: "stack-bottomleft",
          stack: stack_bottomleft,
          hide: true
        }
        , settings);
      return new PNotify(s);
    }
    function showInfoPerm(message, settings) {
      return showInfo(message, $.extend({ delay: 0, hide: false }, settings));
    }
    function showInfo(message, settings) {
      return notify(message, "info", settings);
    }
    function showSuccess(message, settings) {// jshint ignore:line
      return notify(message, "success", $.extend({ type: "success" }, settings));
    }
    function showError(message, settings) {
      return notify(message, "error", settings);
    }
    /* jshint ignore:end */
    function showErrorPerm(message, settings) {
      return showError(message, $.extend({ delay: 0, hide: false }, settings));
    }
  }

})();