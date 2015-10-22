define(["ko","jquery"], function (ko,$) {
  ko.bindingHandlers.elementer = {
    init: function (element, valueAccessor, allBindings) {
      var value = ko.unwrap(valueAccessor());
      var callBack = value.init || ($.isFunction(value) && value) || function () { throw "callBack parameter is missing in elementer binding"; };
      callBack(element);
    }
  };

  // Don't crash on browsers that are missing localStorage
  if (typeof (localStorage) === "undefined") { return; }

  ko.extenders.persist = function (target, key) {

    var initialValue = target();

    // Load existing value from localStorage if set
    if (key && localStorage.getItem(key) !== null) {
      try {
        target(JSON.parse(localStorage.getItem(key)));
      } catch (e) {
      }
    }

    // Subscribe to new values and add them to localStorage
    target.subscribe(function (newValue) {
      localStorage.setItem(key, ko.toJSON(newValue));
    });
    return target;

  };

});