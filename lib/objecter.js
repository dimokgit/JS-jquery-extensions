define(["ko", "jquery", "underscore"], function (ko, $, _) {
  return {
    sure: sure,
    name: sure_name,
    deepPath: deepPath,
    propDeep: propDeep
  };
  /// #region ========= Locals ==========
  function sure(o, p, v) {
    if (arguments.length == 1)
      return !o ? null
        : function () {
          return arguments.length == 0 ? o : sure.apply(null, [o].concat(Array.prototype.slice.call(arguments, 0)));
        }
    if ($.isPlainObject(p)) {
      var onError = p.error;
      p = p.name;
    }
    var name = sure_name(o, p, false);
    if (!name) {
      var errorMsg = makeError(o, p);
      if (onError !== undefined) {
        if (_.isFunction(onError))
          return onError(o, p, errorMsg);
        else return onError;
      }
      else throw new Error(errorMsg);
    }
    return arguments.length == 2
      ? !ko.isObservable(o[name]) && $.isFunction(o[name])
      ? o[name].bind(o)
      : o[name]
      : o[name] = v;
  }
  function sure_name(o, p, doThrow) {
    if (!o)
      throw new Error("Object is empty");
    if (arguments.length == 1) return function (property) {
      if (arguments.length == 0) return $.map(o, function (v, n) { return n; });
      return sure_name(o, property);
    }
    p = p ? p.toLowerCase() : p;
    if (p)
      for (var n in o)
        if (n.toLowerCase() == p)
          return n;
    if (doThrow)
      throw new Error(makeError(o, p));
    return false;
  }
  function makeError(o, p) {
    return "Property [" + p + "] not found in " + (JSON.prune ? JSON.prune(o, 1, 10) : JSON.stringify(o));
  }
  function deepPath(currentMember, path) {
    var members = path.split("."), result = [];

    for (var i = 0; i < members.length; i++) {
      // Here we need to take special care of possible method 
      // calls and arrays, but I am too lazy to write it down.
      if (currentMember.hasOwnProperty(members[i])) {
        currentMember = currentMember[members[i]];
      } else {
        return result;
      }
    }
    result.push(currentMember);
    return result;
  }
  function propDeep(o, p, level) {
    if (arguments.length == 2) level = 5;
    if (level-- >= 0 && typeof o == "object" && !$.isEmptyObject(o)) {
      p = p.toLowerCase();
      for (var n in o)
        if (n.toLowerCase() == p)
          return o[n];
      for (var n in o) {
        var ret = $.D.propDeep(o[n], p, level);
        if (ret !== undefined) return ret;
      }
    }
  }
  /// #endregion
});
