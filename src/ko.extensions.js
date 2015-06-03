define(["ko","jquery"], function (ko,$) {
  ko.bindingHandlers.elementer = {
    init: function (element, valueAccessor, allBindings) {
      var value = ko.unwrap(valueAccessor());
      var callBack = value.init || ($.isFunction(value) && value) || function () { throw "callBack parameter is missing in elementer binding"; };
      callBack(element);
    }
  };

});