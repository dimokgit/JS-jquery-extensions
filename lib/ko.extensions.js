define(["ko","jquery"], function (ko,$) {
  ko.bindingHandlers.elementer = {
    init: function (element, valueAccessor, allBindings) {
      var value = ko.unwrap(valueAccessor());
      var callBack = value.init || ($.isFunction(value) && value) || function () { throw "callBack parameter is missing in elementer binding"; };
      callBack(element);
    }
  };

  //It's an extension to observable. Not a binding, but very useful.
  //Usage: self.discount = ko.observable(0).extend({ numeric: 2 }); //2 for 2 decimal places.

  ko.extenders.numeric = function (target, precision) {
    //create a writeable computed observable to intercept writes to our observable
    var result = ko.computed({
      read: target,  //always return the original observables value
      write: function (newValue) {
        var current = target(),
            roundingMultiplier = Math.pow(10, precision),
            newValueAsNum = isNaN(newValue) ? current : parseFloat(+newValue),
            valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;

        //only write if it changed
        if (valueToWrite !== current) {
          target(valueToWrite);
        } else {
          //if the rounded value is the same, but a different value was written, force a notification for the current field
          if (newValue !== current) {
            target.notifySubscribers(valueToWrite);
          }
        }
      }
    });

    //initialize with current value to make sure it is rounded appropriately
    result(target());

    //return the new computed observable
    return result;
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