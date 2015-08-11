/// <reference path="jquery.js" />
/// <reference path="jquery-1.10.2.min.js" />
/// <reference path="knockout-3.1.0.debug.js" />
/// <reference path="MicrosoftAjax.js" />
/// <reference path="jquery.extentions.Linq.js" />

(function () {
  if (typeof define === "function" && define.amd) {
    define(["ko", "jquery","underscore","jquery-ui","jquery.extentions.Linq", "jquery.extentions.fn","JSON.prune", "kendo"], function (ko, $) {
      factory(ko || require("knockout"), $,_);
    })
  } else
    factory(ko,$,_);

  function factory(ko,$,_) {
    var stringType = typeof "";
    var numberType = typeof 1;
    function _isMSDate(v) { return typeof v == "string" && v.match(/\/Date\(([0-9]+)(?:.*)\)\//); }
    function _parseDate(v) {
      if (v === null || v === undefined || v == "") return null;
      if ($.D.isDate(v)) return v;
      switch (typeof v) {
        case stringType:
          var m = v.match(/\/Date\(([0-9]+)(?:.*)\)\//);
          var d = m ? new Date(parseInt(m[1])) : NaN;
          if (!isNaN(d)) {
            return d.addMinutes(d.getTimezoneOffset());
          }
          var dt = new Date(v);
          if (isNaN(dt)) dt = $.D.parseISO8601Date(v);
          if (isNaN(dt)) return alert("[" + v + "] is not a date.");
          return dt;
        case numberType: return new Date(v);
      }
      return null;
    }
    function parseFromServerDates(array) {
      for (var i = 0; i < array.length; i++)
        $.each(array[i], function (n, d) {
          if ($.D.isDate(d))
            array[i][n] = d.addMinutes(d.getTimezoneOffset());
        });
      return array;
    }
    function parseGuid(text) {
      var guid = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/ig; // / ('[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}') / ig;
      return guid.test(text) ? text.replace(guid, "guid'$1'") : null;
    }

    var urlParams;
    (function () {
      var match,
          pl = /\+/g,  // Regex for replacing addition symbol with a space
          search = /([^&=]+)=?([^&]*)/g,
          decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
          query = window.location.search.substring(1);

      urlParams = {};
      while (match = search.exec(query))
        urlParams[decode(match[1])] = decode(match[2]);
    })();

    function toAjaxDate(date) { var d = new Date(date); return d.addMinutes(-d.getTimezoneOffset()); }
    function odataFormatDate(date, noAjax) {
      if (!noAjax) date = toAjaxDate(date);
      return "datetime'" + ko.utils.stringifyJson(date).replace(/"/g, "") + "'"; //kendo.toString(new Date(date), "yyyy-MM-dd") + "'";
    }

    function UserLayout(change) {
      $.fn.extend({
        LO: function () {
          var me = this.eq(0);
          return selectorFull(me.attr("lo") || me.prev().text().replace(/[^a-z0-9]/gi, "") + "Layout");
        },
        isVisible: function () {
          return this.eq(0).css("display") !== "none";
        }
      });
      function parseLocalStorageLayout() { return $.parseJSON(localStorage.layout || "{}"); }
      var me = this;
      this.tags = parseLocalStorageLayout() || {};
      function selectorFull(selector) { return pageTitle + ":" + selector; }
      this.add = function (el) {
        var selector = $(el).LO();
        if (selector) {
          me.tags[selector] = { isVisible: $(el).isVisible() };
          var json = ko.utils.stringifyJson(me.tags);
          localStorage.layout = json;
          if (change) change(selector, me.tags);
        }
      }
      this.setLayout = function (el, onLayout) {
        var jq = $(el);
        var selector = jq.LO();
        if (selector) {
          var lo = me.tags[selector];
          if (lo) {
            lo.isVisible ? jq.show() : jq.hide();
            if (onLayout) onLayout(el);
          }
        }
      }
    }

    function ODataFilter(field, operand, value) {
      if (!(this instanceof ODataFilter)) {
        if (arguments.length == 3)
          return new ODataFilter(field, operand, value);
        return new ODataFilter(field, operand);
      }
      this.isGuid = false;
      if (arguments.length == 2 && $.isFunction(field)) {
        value = field(operand);
        if (field.isGuid)
          this.isGuid = field.isGuid();
        operand = "eq";
        field = field();
      }
      this.field = field;
      this.operand = operand;
      this.value = $.D.odataParam(value);
    }
    ODataFilter.prototype.toString = function () { return this.field + " " + this.operand + " " + (this.isGuid ? "guid" : "") + this.value; }

    function Guid(guid) {
      this.isGuid = true;
      this.toString = function () { return guid; }
    }
    var pageTitle = $('html head').find('title').text();
    function UserSettingsBag() {
      var me = this;
      var bag = parseLocalStorage() || {};
      if (!_.isObject(bag)) bag = {};
      function keyFullName(key) { return pageTitle + ":" + key;}
      this.get = _.wrap(function (key, defaultValue) {
        return bag[key] === undefined ? defaultValue : bag[key];
      }, function (get,key, defaultValue) {
        return get(keyFullName(key), defaultValue);
      });
      this.set = _.wrap(function (key, value) {
        if (arguments.length == 1 && typeof key != "string") {
          if ($.isArray(key))
            $.each(key, function (i, v) {
              me.set(v);
            });
          else
            $.each(key || {}, function (n, v) {
              me.set(n, v);
            });
        }
        else {
          bag[key] = value;
          strinifyLocalStorage();
          me["get_" + key] = function () { return bag[key]; }
        }
        return me;
      }, function (set, key, value) {
        if (typeof key === "string" && arguments.length == 3)
          return set(keyFullName(key), value);
        if ($.isPlainObject(key) && arguments.length == 2) {
          var apply = _.map(key, function (v, n) { return [keyFullName(n), v]; });
          apply.forEach(function (args) { set.apply(me, args); });
          return me;
        }
        if($.isArray(key) && arguments.length == 2){
          key.forEach(function (args) {
            if(!$.inArray(args) || args.length!=2)
              throw Error("UserSettingsBag: wrong arguments.");
            set(keyFullName(args[0]), args[1]);
          });
          return me;
        }
        throw Error("UserSettingsBag: wrong arguments.");
      });
      /// Private
      function parseLocalStorage() {
        try {
          return $.parseJSON(localStorage.userSettings);
        } catch (e) { return null; }
      }
      function strinifyLocalStorage() { localStorage.userSettings = ko.utils.stringifyJson(bag); }
    }

    function UUID(prefix) {
      var prefixDefault = prefix || "_";
      var _count = 0;
      this.newId = function (prefix) { return (prefix || prefixDefault) + (_count++); }
    }
    function Loader(selector) {
      var me = this;
      var loaders = [];
      this.show = show;
      this.hide = hide;
      this.hideAll = hideAll;
      function hideAll() {
        $.each(loaders, function (i, v) { hide(v); });
      }
      function show(messge, container) {
        var base = typeof __BASE_URL__ == "function" && __BASE_URL__() || '';
          var element = '<div id="divLoader" style="position:absolute;top:45%;left:45%;border-style:dotted;border-color:Gray;border-width:1px;padding:1px 10px;background-color:White;z-index:10000;cursor:pointer;display:none"><span></span><img src="'+base+'images/LoaderLongFadingLines.gif" style="vertical-align:middle" alt="Loading..." />';
        if (!selector && $("#divLoader").length == 0) {
          selector = $(element).appendTo("BODY");
        }
        var loader = $(selector || "#divLoader").clone().appendTo(container || "BODY").center();
        loader.draggable().click(function () { hide($(this)); });
        setTimeout(function () { loader.animate({ top: "+=100" }, { duration: 3000, queue: true }); }, 0);
        loaders.push(loader);
        loader.find("SPAN").text(messge);
        loader.fadeIn("slow", "swing");
        loader.destroy = function (options) { me.hide(this, options); return me; }
        return loader;
      }
      function hide(loader, options) {
        if (!loader) return;
        ko.utils.arrayRemoveItem(loaders, loader);
        loader.fadeOut(1500, "swing", function () { $(this).remove(); });
        if (options) {
          if (options.fadingMessage)
            $.D.fadingMessage(options.fadingMessage);
          if (options.successMessage)
            $.D.successMessage(options.successMessage);
        }
      }
    }

    function loadParents() {
      var _parents = {};
      this.push = function (name, value) {
        name = name + ""; // name can be a function with custom toString
        if (!_parents[name]) _parents[name] = [];
        _parents[name].push(value);
        return value;
      }
      this.load = function (name, value) {
        this.push(name + "", $(value)).D().loadTmpl(name + "");
      }
      this.shift = function (name) {
        name = name + ""; // name can be a function with custom toString
        var parents = $.D.prop(_parents, name);
        if (!parents || !parents.length)
          return alert("There is no load parent with name " + name);
        return parents.shift();
      }
    }

    /// JayData
    function JayData_init(model) {
      function isFromKendoSelect(field) { return field.hasOwnProperty("parent") && field.hasOwnProperty("uid") && field.hasOwnProperty("value"); }
      function processFields(entity, entityType) {
        try {
          $.each(entityType.getFieldNames(), function (i, name) {
            var field = entity[this];
            if (field && isFromKendoSelect(field))
              entity[this] = entity[this].value;
          });
        } catch (e) {
          $.D.fadingMessage(e + "");
        }
      }
      $.each(model.context, function (i, entitySet) {
        if (this instanceof $data.EntitySet) {
          this[this.name].addEventListener("beforeUpdate", function (a, b, c) {
            $.each(b.changedProperties, function () {
              var changed = b[this.name];
              if (isFromKendoSelect(changed))
                b[this.name] = changed.value;
            });
          });
          this[this.name].addEventListener("beforeCreate", function (a, b, c) { processFields(b, this); });
          setDefaults(model[this.elementType.name]);
        }
      });
      function setDefaults(entity) {
        $.each(entity.getFieldNames(), function (i, name) {
          var md = entity.field(name).memberDefinition;
          if ($data.Guid == md.dataType) {
            if (md.required) {
              //entity.addEventListener("beforeUpdate", function (a, b, c) { debugger; });
              entity.defaultValues[name] = md.defaultValue = function () { return $data.createGuid(); }
            }
          }
        });
        return entity;
      }
    }
    function JayData$memberDefinition(entity, field, definition, value) {
      if ($.isArray(field))
        $.each(field, function (i, v) { JayData$memberDefinition(entity, this, definition, value); });
      else {
        if (entity instanceof $data.Queryable) entity = entity.defaultType;
        field = entity.field ? entity.field(field) : entity.elementType.field(field);
        if (arguments.length < 4) return field.memberDefinition[definition];
        field.memberDefinition[definition] = value;
        return field;
      }
    }
    // Sure
    function sure_name(o, p, bool) {
      if (!o)
        throw new Error("Object is empty");
      if (arguments.length == 1) return function (property) {
        if (arguments.length == 0) return $.map(o, function (v, n) { return n; });
        return $.D.name(o, property);
      }
      p = p ? p.toLowerCase() : p;
      if (p)
        for (var n in o)
          if (n.toLowerCase() == p)
            return n;
      if (!bool || !_.isBoolean(bool))
        throw new Error("Property [" + p + "] not found in " + (JSON.prune ? JSON.prune(o, 1, 10) : JSON.stringify(o)));
      return false;
    }

    // CSS
    function CssRules() {
      this.getCSSRule = getCSSRule;
      function getCSSRule(ruleName, deleteFlag) {               // Return requested style obejct
        ruleName = ruleName.toLowerCase();                       // Convert test string to lower case.
        if (document.styleSheets) {                            // If browser can play with stylesheets
          for (var i = 0; i < document.styleSheets.length; i++) { // For each stylesheet
            var styleSheet = document.styleSheets[i];          // Get the current Stylesheet
            var ii = 0;                                        // Initialize subCounter.
            var cssRule = false;                               // Initialize cssRule. 
            do {                                             // For each rule in stylesheet
              if (styleSheet.cssRules) {                    // Browser uses cssRules?
                cssRule = styleSheet.cssRules[ii];         // Yes --Mozilla Style
              } else {                                      // Browser usses rules?
                cssRule = (styleSheet.rules || [])[ii];            // Yes IE style. 
              }                                             // End IE check.
              if (cssRule) {                               // If we found a rule...
                if (cssRule.selectorText.toLowerCase() == ruleName) { //  match ruleName?
                  if (deleteFlag == 'delete') {             // Yes.  Are we deleteing?
                    if (styleSheet.cssRules) {           // Yes, deleting...
                      styleSheet.deleteRule(ii);        // Delete rule, Moz Style
                    } else {                             // Still deleting.
                      styleSheet.removeRule(ii);        // Delete rule IE style.
                    }                                    // End IE check.
                    return true;                         // return true, class deleted.
                  } else {                                // found and not deleting.
                    return cssRule;                      // return the style object.
                  }                                       // End delete Check
                }                                          // End found rule name
              }                                             // end found cssRule
              ii++;                                         // Increment sub-counter
            } while (cssRule)                                // end While loop
          }                                                   // end For loop
        }                                                      // end styleSheet ability check
        return false;                                          // we found NOTHING!
      }                                                         // end getCSSRule 

      function killCSSRule(ruleName) {                          // Delete a CSS rule   
        return getCSSRule(ruleName, 'delete');                  // just call getCSSRule w/delete flag.
      }                                                         // end killCSSRule

      function addCSSRule(ruleName) {                           // Create a new css rule
        if (document.styleSheets) {                            // Can browser do styleSheets?
          if (!getCSSRule(ruleName)) {                        // if rule doesn't exist...
            if (document.styleSheets[0].addRule) {           // Browser is IE?
              document.styleSheets[0].addRule(ruleName, null, 0);      // Yes, add IE style
            } else {                                         // Browser is IE?
              document.styleSheets[0].insertRule(ruleName + ' { }', 0); // Yes, add Moz style.
            }                                                // End browser check
          }                                                   // End already exist check.
        }                                                      // End browser ability check.
        return getCSSRule(ruleName);                           // return rule we just created.
      }
    }
    function css_getclass(name, createifnotfound) {
      if (!name) return null;
      var rules = cssrules();
      name = sure_name(rules, name);
      //if (!rules.hasOwnProperty(name)) throw 'todo:deal_with_notfound_case:' + name;
      return rules[name];
      /// Local
      function cssrules() {
        var rules = {}; var ds = document.styleSheets, dsl = ds.length;
        for (var i = 0; i < dsl; ++i) {
          var dsi = ds[i].cssRules, dsil = (dsi || []).length;
          for (var j = 0; j < dsil; ++j) rules[dsi[j].selectorText] = dsi[j];
        }
        return rules;
      };
    };
    function confirmedAction(prompt, action, cancel) {
      var callback = function (e, v, m, f) {
        if (v) action();
        else if (cancel) cancel();
      }
      $.prompt(prompt
        , {
          buttons: { OK: true, Cancel: false }
          , callback: callback
          , submit: callback
        });

    }
    // Parse
    function parseUtcDate(dateString) {
      var d;
      try {
        d = Date.parse(dateString + "+0000");
        if (isNaN(d)) throw "";
      } catch (exc) {
        try {
          d = Date.parse(dateString);
        } catch (exc) {
          return alert("[" + dateString + "] is not supported format");
        }
      }
      return new Date(d);
    }
    function parseMetaUrl(url) {
      if (typeof url !== 'string') return { label: url, href: "" };
      var r = (url || "").match(/\{(.+?)?\}(.*)/);
      var l = r && r[1] || url;
      var h = r && r[2] || r && r[1] || url;
      return { label: l, href: h };
    }
    // xml
    function xmlDocument(root) {
      var xml = $.parseXML("<" + root + "/>");
      function addXmlNode( name, attrs) {
        var node = xml.createElement(name);
        attrs.forEach(function (a) {
          $(node).attr(a.name, a.value);
        });
        xml.documentElement.appendChild(node);
      }
      function toString() { return new XMLSerializer().serializeToString(xml); }
      return { doc: xml, addXmlNode: addXmlNode, toString: toString };
    }

    $.extend(true, { D: {} });
    var D = {
      xmlDocument: xmlDocument,
      parseMetaUrl: parseMetaUrl,
      urlParams: function (param, options) {
        if (arguments.length === 0) return urlParams;
        options = options || {};
        if (!$.isPlainObject(options))
          options = { "default": options };
        param = sure_name(urlParams, param, true);
        var value = (param ? urlParams[param] : options.default) || options.default;
        return value && options.isDate ? parseUtcDate(value) : value;
      },
      parseUtcDate: parseUtcDate,
      confirmedAction: confirmedAction,
      UserLayout: UserLayout,
      getCss: new CssRules().getCSSRule,
      toWords: function (text) { return text.split("__")[0].match(/[A-Z]+[a-z0-9]*/g).join(" "); },
      toPascalCase: function (s) {
        return s.replace(/(\w)(\w*)/g,
          function (g0, g1, g2) { return g1.toUpperCase() + g2.toLowerCase(); });
      },
      format_M_yy: function (date) { return date.format("M").substr(0, 1) + date.format("-y"); },
      exportToExcel: function (html) {
        var links = $("HTML").find("LINK");
        var styles = links.map(function () {
          var linkUrl = $(this).attr("href");
          var ret = $.ajax(linkUrl, { async: false, dataType: "html" });
          return ret.responseText;
        }).toArray();
        html = "<HTML><head><style>" + styles.join("\n") + "</style></head><body>" + html + "</body></html>";

        return $.ajax(
              {
                type: "POST"
                , async: false
                , dataType: "json"
                , processData: true
                , url: KPI.odataUrl + "GetHtmlAsExcel"
                , data: { html: escape(html) }
                , success: function (html) {
                  open(KPI.odataUrl + "GetHtml?cacheKey='" + html.d.GetHtmlAsExcel + "'&extention='htm'", "_blank");
                }
                , error: function (a, b, c) { alert("exportToExcel:\n" + b); }
              });
      },
      fromODataDate: function (date) { return new Date(date).addMinutes(date.getTimezoneOffset()); },
      userSettings: new UserSettingsBag(),
      Guid: Guid,
      isJQueryObject: function (o) { return o.jquery && true; },
      makeTemplateAccessor: function (templateUri) {
        var parts = templateUri.split(".");
        var parent = window;
        KPI.templates[templateUri] = function () { debugger; return templateUri; };
        $.each(parts, function (i, p) {
          var child = {}
          child[p] = i == parts.length - 1
          ? function () { var f = function () { return templateUri; }; f.toString = function () { return templateUri }; f.url = templateUri; return f; }()
          : {};
          $.extend(true, parent, child);
          parent = parent[p];
        });
      },
      Math: {
        linearRegression: function findLineByLeastSquares(values_x, values_y) {
          var sum_x = 0, sum_y = 0, sum_xy = 0, sum_xx = 0, count = 0;
          /*     * We'll use those variables for faster read/write access.     */
          var x = 0, y = 0, values_length = values_x.length;
          if (values_length != values_y.length) { throw new Error('The parameters values_x and values_y need to have same size!'); }
          /*     * Nothing to do.     */
          if (values_length === 0) { return [[], []]; }
          /*     * Calculate the sum for each of the parts necessary.     */
          {
            for (var v = 0; v < values_length; v++) {
              x = values_x[v];
              y = values_y[v];
              sum_x += x;
              sum_y += y;
              sum_xx += x * x;
              sum_xy += x * y;
              count++;
            }
          }
          /*     * Calculate m and b for the formular:     * y = x * m + b     */
          var m = (count * sum_xy - sum_x * sum_y) / (count * sum_xx - sum_x * sum_x);
          var b = (sum_y / count) - (m * sum_x) / count;
          /*     * We will make the x and y result line now     */
          {
            var result_values_x = [], result_values_y = [];
            for (var v = 0; v < values_length; v++) {
              x = values_x[v];
              y = x * m + b;
              result_values_x.push(x);
              result_values_y.push(y);
            }
          }
          return [result_values_x, result_values_y];
        }
      },
      toAbsURL: function (s) {
        var l = location, h, p, f, i;
        if (/^\w+:/.test(s)) {
          return s;
        }
        h = l.protocol + '//' + l.host + (l.port != '' ? (':' + l.port) : '');
        if (s.indexOf('/') == 0) {
          return h + s;
        }
        p = l.pathname.replace(/\/[^\/]*$/, '');
        f = s.match(/\.\.\//g);
        if (f) {
          s = s.substring(f.length * 3);
          for (i = f.length; i--;) {
            p = p.substring(0, p.lastIndexOf('/'));
          }
        }
        return h + p + '/' + s;
      },
      uuid: new UUID(),
      loadParents: new loadParents(),
      distinct: function (anArray, filter) {
        var result = [];
        $.each(anArray, function (i, v) {
          if ($.grep(result, function (a) {
            return filter(v, a);
          }).length === 0) result.push(v);
        });
        return result;
      },
      insertItems: function (obsarr, arr, at) {
        at = at || 0;
        var args = [at, 0].concat(arr);
        obsarr.splice.apply(obsarr, args);
      },
      parseJsonError: function (event) {
        var error = $.parseJSON((event.xhr || {}).message || (event.xhr || event).responseText).error;
        if (!error) alert("Error!");
        var messages = [error.message.value];
        error = error.innererror;
        if (error) {
          messages.push(error.message);
          while (error && error.internalexception) {
            messages.push(error.internalexception.message);
            error = error.internalexception;
          }
        }
        return messages;
      },
      showJsonError: function (event) { alert($.D.parseJsonError(event).join("\n")); },
      serverExceptions: function () {
        var exceptions = {};
        return {
          register: function (exception) {
            var o = {};
            o[exception] = exception;
            $.extend(true, exceptions, o);
          },
          isRegistered: function (exception) {
            return exceptions.hasOwnProperty(exception);
          }
        }
      }(),
      oData: {
        parseFromServerDates: parseFromServerDates,
        Filter: ODataFilter,
        requestObject: function (requestUri, data, method) { return { requestUri: requestUri, method: method || "POST", data: data }; },
        mergeRequestObject: function (uri, data) { return { requestUri: uri, data: data, method: "POST", headers: { "X-HTTP-Method": "MERGE" } } },
        deleteRequestObject: function (uri) { return { requestUri: uri, data: {}, method: "DELETE" } },
        updateByFilter: function (entity, filter, mergeRequest, insertRequest, mergeSuccess, insertSuccess) {
          var baseUrl = entity.baseUrl || KPI.odataUrl;
          OData.read(baseUrl + entity() + "?$filter=" + filter
          , function (response) {
            if (response.results.length > 1) return $.D.fadingMessage("Filter [" + filter + "] must resolve to a single element.", 5000);
            if (response.results.length > 0) {//MERGE (Update)
              var updateUrl = response.results[0].__metadata.uri || (baseUrl + entity(response.results[0].Id));
              OData.request($.D.oData.mergeRequestObject(updateUrl, mergeRequest)
              , function (response) { if (mergeSuccess) mergeSuccess(); $.D.successMessage("Update: Success."); });
            } else {// POST (Insert)
              OData.request($.D.oData.requestObject(baseUrl + entity(), insertRequest, "POST")
              , function (response) { if (insertSuccess) insertSuccess(response); else $.D.successMessage("Insert Success."); });
            }
          });
        },
        deleteByFilter: function (baseUri, entity, filter, deleteSuccess) {
          OData.read(baseUri + entity() + "?$filter=" + filter
          , function (response) {
            if (response.results.length > 1) return $.D.fadingMessage("Filter [" + filter + "] must resolve to a single element.", 5000);
            if (response.results.length > 0) {//DELETE
              var id = $.D.prop(response.results[0], "ID");
              var uri = id === undefined ? response.results[0].__metadata.uri : baseUri + entity(id);
              OData.request($.D.oData.deleteRequestObject(uri)
              , function (response) { (deleteSuccess || $.noop)(); $.D.successMessage("Delete: Success."); });
            } else {
              alert("Entity " + entity() + " where " + filter + " not found.");
            }
          });
        }
      },
      parseDate: _parseDate,
      isMSDate: _isMSDate,
      array: {
        splice: function (array, splitBy) {
          var ret = [];
          while (array.length)
            ret.push(array.splice(0, splitBy));
          return ret;
        },
        slice: function (array, splitBy) {
          var ret = [];
          for (var i = 0; i < bigarray.length; i += size)
            ret.push(array.slice(i, i + splitBy));
          return ret;
        }
      },
      objectName: function (o) {
        return (/function\s+(.+)\(/).exec(o.constructor + "")[1];
      }, Loader: Loader,
      loader: new Loader()
      , useDialog: function (widget, use, params) {
        if (arguments.length == 2)
          widget.dialog.bind(widget)(use);
        else
          widget.dialog.bind(widget)(use, params);
      }, dialogOptions: function (options) {
        return $.extend(true, {
          autoOpen: true
          //, position: "center"
          , resizable: true
          , width: 'auto'
          , minHeight: 55
          , close: function (event, ui) {
            if ((options || {}).close)
              options.close();
            $(this).parents("DIV:last").remove();
          }
        }, options);
      }, fadingMessage: function (text, fadingTime, dialogOptions, diaologToClose) {
        var bgColor = "#F778A1";
        if ($.isPlainObject(fadingTime)) {
          var options = fadingTime;
          fadingTime = options.fadingTime;
          bgColor = options.bgColor || bgColor;
        }
        if (diaologToClose) diaologToClose.dialog("close");
        var defaults = { dialogClass: "noTitle", resizable: false, minHeight: 10, autoOpen: false };
        var d = $("<DIV class='fadingmessage'></DIV>").html(text).dialog($.D.dialogOptions($.extend(defaults, dialogOptions)));
        d.dialog("widget").css("visibility", "hidden");
        d.dialog("open");
        d.dialog("widget").css("visibility", "visible");

        var closeDialog = _.once(d.dialog.bind(d, "destroy"));
        if (fadingTime !== false && fadingTime !== 0) {
          d.dialog("widget").animate({ top: '-=100' }, fadingTime || 5000, function () { $(this).delay(1000).fadeTo("slow", 0.25, "swing", closeDialog); }); //.delay(fadingTime || 5000).fadeTo("slow", 0.25, "swing", closeDialog);
          d.animate({ backgroundColor: bgColor, color: "#FFFFFF" }, (fadingTime || 5000) / 10.0);
        }
        d.dialog("widget").click(closeDialog);
        return d;
      }, successMessage: function (text, fadingTime, dialogOptions, diaologToClose) {
        this.fadingMessage(text, { fadingTime: fadingTime, bgColor: "#79CF51" }, dialogOptions, diaologToClose);
      }, makeDialog: function (message, options) {
        var div = $("<DIV></DIV>").html(message).dialog($.D.dialogOptions(options));
        var dialog = div.dialog.bind(div, "option");
        var resize = _.debounce(function () {
          try {
            if (dialog("autoReposition"))
              dialog("position", dialog("position"));
          } catch (e) { }
        }, 500);
        if (false && typeof ResizeSensor !== 'undefined') {
          var rs = new ResizeSensor(div, resize);
          div.on("dialogclose", function () { rs = null; delete rs; });
        } else if (div.removeResize) {
          div.resize(resize)
            .on("dialogclose", function () { div.removeResize(resize); });
        }
        return div;
      }, makeErrorDialog: function (error, options) {
        return $.D.makeDialog("<PRE>" + $.D.oDataErrorToString(error) + "</PRE>", options);
      }, showDialog: function (dialog, message) {
        dialog.html(message);
        if (!dialog.dialog('isOpen')) {
          dialog.dialog('open');
          dialog.dialog('option', 'position', 'center');
        }
      }, oDataErrorToString: function (error) {
        var html = $(eval("error.data[0].response.body")).filter(function () { return ["FONT"].indexOf($(this).prop("nodeName")) >= 0; }).text().replace(/\n{2,}/g, '\n')
        if (html) return html;
        var jsonError = error.responseJSON ? JSON.stringify(error.responseJSON, null, 2) : null;
        if (jsonError) return jsonError.replace(/\\r\\n/g, "\n");
        function _parseJson(text) {
          if ((text + "").replace(/^\s+|\s+$/g, '').indexOf("{") == 0) try {
            return $.parseJSON(text);
          } catch (e) {
            try{
              return $.parseJSON(text.replace(/\{\s+"d"\s+:\s{\s+"results":\s+\[\s+\{/, ""));
            } catch (e) {
              return null;
            }
          }
          return null;
        }
        if (typeof error == "string") return error;
        var isJayDataError = (((error[0] || {}) || {}).item || {})._entityState;
        if (isJayDataError) {
          return $.map(error[0].errors, function (m) { return m.Message + "\n" + m.PropertyDefinition.name + " is " + m.Type; }).join("\n");
        }
        var jsonError = null;
        if (error.responseText) {
          jsonError = _parseJson(error.responseText);
          if (!jsonError) return error.responseText;
        }
        if (typeof TypeError != "undefined" && error instanceof TypeError) return error + "";
        if (typeof Exception != "undefined" && error instanceof Exception)
          if (!error.data || ($.isArray(error.data) && error.data.length == 0)) return error.message;
          else error = error.data[0] || error.data;
        try {
          function _cleanException(text) {
            return text
              .replace(/\\r\\n/g, "\n")
              .replace(/",\s"/g, '",\n')
              .replace(/The transaction ended in the trigger. The batch has been aborted./g, "")
              .replace(/An error occurred while processing this request.\n/g, "")
              .replace(/An error occurred while executing the command definition. See the inner exception for details.\n/g, "");
          }
          if ($.isArray(error.xhr)) {// ValidationError
            try {
              var errClient = error.xhr[0].errors[0];
            } catch (e) { }
            if ($.D.objectName(errClient) == "ValidationError") {
              var oError = {};
              oError[errClient.Message] = errClient.PropertyDefinition;
              return [ko.utils.stringifyJson(oError).replace(":", ":\n")];
            }
          }
          var message = [$.D.propDeep(error, "requestUri")];
          message.push($.D.propDeep(error, "statusText"));
          function _pumpMessages(err) {
            message.push(err.message.value);
            var innererror = err.innererror;
            if (innererror) {
              message.push(innererror.message);
              for (var internalexception = innererror.internalexception; internalexception; internalexception = internalexception.internalexception)
                message.push(internalexception.message);
            }
          }
          if (jsonError)
            _pumpMessages(jsonError.error);
          else {
            var responseBody = $.D.deepPath(error, "response.body");
            jsonError = (_parseJson(responseBody) || {})["odata.error"];
            if (jsonError) _pumpMessages(jsonError);
            else {
              try {
                var body;
                var responseBody = $.D.propDeep((error.response || error), "body");
                if (responseBody) body = _parseJson(responseBody) || responseBody;
                else {
                  var errorJson = _parseJson($.D.propDeep(error, "message"));
                  body = errorJson;
                }
                if (body) {
                  var innerError = (body.error || {}).innerError || body.error;
                  var type = $.Linq.last((((innerError || {}).innererror || {}).type || "").split("."));
                  if (type && $.D.serverExceptions.isRegistered(type))
                    return _cleanException(innerError.innererror.message);
                  if (innerError)
                    if (typeof (innerError) === 'string')
                      message.push(innerError);
                    else
                      _pumpMessages(innerError);
                  else
                    message.push(JSON.stringify(body, null, 2));
                  return _cleanException(message.join("\n"));
                }
              } catch (e) {
                if (!error.response) {
                  error = $.D.propDeep(error, "data") || $.D.propDeep(error, "xhr");
                  error = error[0] || error;
                }
              }
              var response = $.D.propDeep(error, "response");
              if (!response) {
                if (error.hasOwnProperty("readyState") && error.hasOwnProperty("status") && error.hasOwnProperty("statusText") && error.hasOwnProperty("responseText")) {
                  var errorNew = JSON.stringify({ url: error.url, statusText: error.statusText, responseText: error.responseText }, null, 2);
                  return errorNew;
                }
              }
              if (error.message)
                return error.message;
              var body = response.body || $.D.propDeep(error, "message") || $.D.propDeep(error, "body");
              var isHtml = body.indexOf("<html") >= 0;
              if (isHtml)
                message.push(body);
              else
                try {
                  var err = (_parseJson(body) || {}).error;
                  if (!err) {
                    message.push(error.response.statusText);
                  } else _pumpMessages(err);
                } catch (e) { }
            }
          }
          return _cleanException(message.join("\n"));
        } catch (e) {
          try {
            var message = ko.utils.stringifyJson(error);
            return _cleanException(message);
          } catch (e) {
            return "Some kind of error just hapened to me.\nI am going to lay down for a while.\n" + e;
          }
        }
        return ko.utils.stringifyJson(error.response).replace(/\\r\\n/g, "<br/>").replace(/\\\\r\\\\n/g, "<br/>").replace(/\\"/g, "\"");
      }, oDataErrorToString_: function (error) {
        if (typeof error == "string") return error;
        function _cleanException(text) {
          return text.replace("\\r\\n", "\n").replace(/",\s"/g, '",\n')
          .replace(/An error occurred while processing this request./g, "")
        .replace(/The transaction ended in the trigger. The batch has been aborted./g, "");
        }
        var message = [error.response.requestUri];
        try {
          var body = $.parseJSON(error.response.body);
          var innerError = (body.error || {}).innerError || body.error;
          var type = $.Linq.last((((innerError || {}).innererror || {}).type || "").split("."));
          if (type && $.D.serverExceptions.isRegistered(type))
            return _cleanException(innerError.innererror.message);
        } catch (e) {
          if (error.response.statusCode >= 400)
            message.push(error.response.body);
        }
        try {
          var err = ($.parseJSON(error.response.body) || {}).error;
          if (!err) {
            message.push(error.response.statusText);
          } else {
            message.push(err.message.value);
            var innererror = err.innererror;
            if (innererror) {
              message.push(innererror.message);
              for (var internalexception = innererror.internalexception; internalexception; internalexception = internalexception.internalexception)
                message.push(internalexception.message);
            }
          }
        } catch (e) { }
        return _cleanException(message.join("\n"));
        return ko.utils.stringifyJson(error.response).replace(/\\r\\n/g, "<br/>").replace(/\\\\r\\\\n/g, "<br/>").replace(/\\"/g, "\"");
      }, parseOdataBatchError: function (data, response) {
        for (var i = 0; i < data.__batchResponses.length; i++) {
          var batchResponse = data.__batchResponses[i];
          for (var j = 0; j < batchResponse.__changeResponses.length; j++) {
            var changeResponse = batchResponse.__changeResponses[j];
            var status = parseInt(changeResponse.statusCode || (changeResponse.response || {}).statusCode);
            if (isNaN(status)) continue;
            if (status < 400) continue;
            if (changeResponse.message) {
              var resp = ko.utils.parseJson(changeResponse.response.body);
              var message = [];
              if (typeof changeResponse.message == "string")
                message.push(changeResponse.message);
              if (resp) {
                if (resp.error) {
                  message.push(resp.error.message.value);
                  var error = resp.error.innererror;
                } else message = message.concat(parseOdataError(resp));
              }
              while (error) {
                message.push(error.message);
                error = error.internalexception;
              }
              return message;
            }
          }
        }
        function parseOdataError(response) {
          var ode = response['odata.error'];
          return !ode ? [] : [ode.message.value, ode.innererror.message, ode.innererror.type];
        }
      }
      , toODataDate: toAjaxDate
      , odataParam: function (param, noAjax) {
        if (typeof param == "undefined") return param;
        if (param === null) return "null";
        if (param.isGuid) return parseGuid(param + "");
        if (typeof param == "string") return param.isGuid && parseGuid(param) || "'" + escape(param) + "'";
        if ($.D.isDate(param))
          return odataFormatDate(param, noAjax);
        return param;
      }, odataParamsQuery: function (params) {
        $.each(params, function (n, v) {
          if (typeof v !== 'undefined' && v !== null)
            params[n] = $.D.odataParam(v);
        });
        return $.map(params, function (v, n) {
          if (typeof v !== 'undefined' && v !== null)
            return n + "=" + escape(v);
        });
      }, odataFIlterQuery: function (filters) {
        return $.map(filters, function (v, n) {
          if (typeof v.value !== 'undefined' && v.value !== null)
            return v;
        }).join(" and ");
      }, inRange: function (f, min, max) { return f < min ? min : f > max ? max : f; },
      round: function (f, d) { return d >= 0 ? parseFloat(f.toFixed(d)) : f; },
      gradient: function (reds, greens, blues, min, max, steps, decimals) {
        var r = [reds[0], reds[1]];
        var g = [greens[0], greens[1]];
        var b = [blues[0], blues[1]];
        var r1 = [r[1], reds[2]];
        var g1 = [g[1], greens[2]];
        var b1 = [b[1], blues[2]];
        var step = (max - min) / (steps - 1);
        function RGBs(r, g, b, min, max, steps) {
          var rgb = [r, g, b];
          var rgbs = [];
          for (var i = 0; i <= steps; i++) {
            var v = min + step * i;
            var p = (v - min) / (max - min);
            var _rgb = [];
            $.each(rgb, function (i, v) {
              var c = v[1] == 0 && v[0] == 0 ? 0 : p * (v[1] - v[0]) + v[0];
              _rgb.push(Math.round(c));
            });
            rgbs.push({ value: $.D.round(v, decimals), rgb: _rgb });
          }
          return rgbs;
        }
        var middle = min + (max - min) / 2;
        var rgbs = RGBs(r, g, b, min, middle, steps / 2);
        var rgbs1 = RGBs(r1, g1, b1, middle, max, steps / 2);
        return rgbs.concat(rgbs1);
      },
      props: function (o) {
        $.each($.makeArray(arguments).slice(1), function (i, p) {
          p = p.toLowerCase();
          for (var n in o)
            if (n.toLowerCase() == p)
              o = ko.utils.unwrapObservable(o[n]);
          if (o === undefined) return;
        });
        return o;
      },
      prop: function (o, p) {
        p = p.toLowerCase();
        for (var n in o)
          if (n.toLowerCase() == p)
            return o[n];
      },
      deepPath: function (currentMember, path) {
        var members = path.split(".");

        for (var i = 0; i < members.length; i++) {
          // Here we need to take special care of possible method 
          // calls and arrays, but I am too lazy to write it down.
          if (currentMember.hasOwnProperty(members[i])) {
            currentMember = currentMember[members[i]];
          } else {
            return;
          }
        }
        return currentMember;
      },
      propDeep: function (o, p, level) {
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
      },
      sure: function (o, p, v) {
        if (arguments.length == 1)
          return !o ? null
            : function () {
              return arguments.length == 0 ? o : $.D.sure.apply(null, [o].concat(Array.prototype.slice.call(arguments, 0)));
            }
        if ($.isPlainObject(p)) {
          var onError = p.error;
          p = p.name;
        }
        var name = $.D.name(o, p, onError);
        if (!name && onError) return onError(o, p);
        return arguments.length == 2 ? o[name] : o[name] = v;
      },
      name: sure_name,
      isDate: function (date) {
        return Object.prototype.toString.call(date) === '[object Date]';
      },
      parseISO8601Date: function (s) {
        // parenthese matches:
        // year month day    hours minutes seconds  
        // dotmilliseconds 
        // tzstring plusminus hours minutes
        var re = /(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(\.\d+)?(Z|([+-])(\d\d):(\d\d))/;

        var d = [];
        d = s.match(re);

        // "2010-12-07T11:00:00.000-09:00" parses to:
        //  ["2010-12-07T11:00:00.000-09:00", "2010", "12", "07", "11",
        //     "00", "00", ".000", "-09:00", "-", "09", "00"]
        // "2010-12-07T11:00:00.000Z" parses to:
        //  ["2010-12-07T11:00:00.000Z",      "2010", "12", "07", "11", 
        //     "00", "00", ".000", "Z", undefined, undefined, undefined]

        if (!d) {
          throw "Couldn't parse ISO 8601 date string '" + s + "'";
        }

        // parse strings, leading zeros into proper ints
        var a = [1, 2, 3, 4, 5, 6, 10, 11];
        for (var i in a) {
          d[a[i]] = parseInt(d[a[i]], 10);
        }
        d[7] = parseFloat(d[7]);

        // Date.UTC(year, month[, date[, hrs[, min[, sec[, ms]]]]])
        // note that month is 0-11, not 1-12
        // see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Date/UTC
        var ms = Date.UTC(d[1], d[2] - 1, d[3], d[4], d[5], d[6]);

        // if there are milliseconds, add them
        if (d[7] > 0) {
          ms += Math.round(d[7] * 1000);
        }

        // if there's a timezone, calculate it
        if (d[8] != "Z" && d[10]) {
          var offset = d[10] * 60 * 60 * 1000;
          if (d[11]) {
            offset += d[11] * 60 * 1000;
          }
          if (d[9] == "-") {
            ms -= offset;
          }
          else {
            ms += offset;
          }
        }

        return new Date(ms);
      },
      jayData: {
        init: JayData_init,
        reRequire: function (entity, fields) {
          if (!$.isArray(fields)) fields = [fields];
          $.each(fields, function (i, field) { _reRequire(entity, field); });
          function _reRequire(entity, field) {
            $.D.jayData.makeRequired(entity, field, true);
            entity.addEventListener("beforeCreate", function (a, b, c) {
              $.D.jayData.makeRequired(entity, field, false);
            })
            entity.addEventListener("afterCreate", function (a, b, c) {
              $.D.jayData.makeRequired(entity, field, true);
            })
          }
        },
        memberDefinition: JayData$memberDefinition,
        required: function (entity, field, value) { return JayData$memberDefinition(entity, field, "required", value); },
        computed: function (entity, field, value) { return JayData$memberDefinition(entity, field, "computed", value); },
        makeRequired: function (entity, field, value) {
          if (arguments.length > 1 && field) {
            if (entity instanceof $data.Queryable) entity = entity.defaultType;
            field = entity.field ? entity.field(field) : entity.elementType.field(field);
          } else field = entity;
          if (arguments.length < 3) return field.memberDefinition.required;
          field.memberDefinition.required = value === undefined || value;
          return field;
        },
        makeComputed: function (entity, field, value) {
          if (arguments.length > 1 && field) {
            if (entity instanceof $data.Queryable) entity = entity.defaultType;
            field = entity.field ? entity.field(field) : entity.elementType.field(field);
          } else field = entity;
          if (arguments.length < 3) return field.memberDefinition.required;
          field.memberDefinition.computed = value === undefined || value;
          return field;
        },
        kendo: {
          lookUp: {
            map: JayData$lookUpMap, fetch: JayData$fetchLookUp
          }
        }
      }
    };
    /// JayData Lookups ///
    function JayData$fetchLookUp(query, lookUpArray, mapper) {
      return query.toArray(function (result) {
        var array = lookUpArray;
        pushArray(array, JayData$lookUpMap(result, mapper));
      }).fail(function (a, b) { $.D.makeErrorDialog(a); });
      function pushArray(arr, arr2) { arr.length = 0; arr.push.apply(arr, arr2); return arr; }
    }
    function JayData$lookUpMap(result, mapper, textField, doSort) {
      var defaultSelection = { text: "Select ...", value: "", isLookUp: true };
      var text = "text";
      var value = "value";
      if (textField) {
        value = mapper;
        text = textField;
        mapper = null;
      }
      var a = $.map(result, function (v) {
        return $.extend(mapper ? mapper(v) : { text: ($.D.sure(v, text) || "").replace(/#/g, "\\#"), value: (($.D.sure(v, value) || "") + "").replace(/#/g, "\\#") }, { isLookUp: true })
      })
      if (doSort !== false)
        a = _.sortBy(a, function (v) { return v.text.toUpperCase(); });
      return [defaultSelection].concat(a);
    }
    $.extend(true, $.D, D);
    var kendo = new function () {
      this.filter = function (field, operator, value) { return { field: field, operator: operator, value: value }; };
      this.charts = {
        font: function (size, bold) { return (bold ? "bold" : "") + " " + (size || 12) + "px  Arial,Helvetica,sans-serif"; },
        series: function (type, data, options) { return $.extend(true, { type: type, data: data }, options); },
        categories: function (baseUnit, categories, options) { return $.extend(true, { baseUnit: baseUnit, categories: categories }, options); },
        title: function (text, options) { return $.extend(true, { text: text, padding: 0, margin: 0, font: "bold 12px Arial", position: "top" }, options); }
      };
      this.templates = {
        rightAlignedField: function (name, format, options) {
          return $.extend(true, { field: name, template: $.D.kendo.templates.rightAligned(name, format) }, options);
        },
        rightAligned: function (field, format) {
          return "<div style=\"text-align:right\">#=kendo.toString(" + field + ",'" + format + "')#</div>";
        }
      }
      this.foreignFieldFactory = function foreignFieldFactory(metaField, lookUp, template) {
        return {
          field: metaField(),
          editor: selectEditor(metaField(), lookUp, "value", "text"),
          template: template
        };
        /// Locals
        function selectEditor(field, dataSource, dataValueField, dataTextField, change) {
          return function (container, options) {
            // create a KendoUI AutoComplete widget as column editor 
            var s = $('<select data-role="dropdownlist" style="margin:0px;width:100%" data-bind="value:' + field + '">')
                .appendTo(container)
                .kendoDropDownList({
                  change: change || function (a, b, c) { var record = this._data()[this.selectedIndex]; },
                  autobind: false,
                  dataValueField: dataValueField,
                  dataTextField: dataTextField,
                  //template: '<div style="color:white;background-color:\\##=Code#">#= Color #</div>',
                  dataSource: dataSource
                });
          }
        }
      }
      this.getGridState = function (grid) {
        return {
          columns: grid.columns.filter(function (c) { return !c.command; }),
          sort: grid.dataSource.sort(),
          filter: grid.dataSource.filter()
        }
      }

      this.syncGridColumnsUI = function (columns, grid) {
        var savedColumns = $.Linq.toDictionary(columns, "field");
        grid.columns.forEach(function (c, i) {
          var saved = savedColumns[c.field];
          if (saved && saved.hidden)
            grid.hideColumn(i);
          else grid.showColumn(i);
        });
      }
      this.shiftIdColumns = function (columns,hideIdColumns) {
        var cols = columns.filter(isNotIDField);
        return hideIdColumns ? cols : cols.concat(columns.filter(isIDField));
        ///
        function isIDField(column) { return /ID$/.test(column.field); }
        function isNotIDField(column) { return !isIDField(column); }
      }

    }();
    $.extend(true, $.D, { kendo: {} });
    $.extend(true, $.D.kendo, kendo);

    function sum(n) {
      var v = function (x) {
        return sum(n + x);
      };

      v.valueOf = v.toString = function () {
        return n;
      };

      return v;
    }
    function findAllValues(obj, key) {
      if (_.has(obj, key)) // or just (key in obj)
        return [obj];
      // elegant:
      return _.flatten(_.map(obj, function (v) {
        return typeof v == "object" ? findAllValues(v, key) : [];
      }), true);

      // or efficient:
      var res = [];
      _.forEach(obj, function (v) {
        if (typeof v == "object" && (v = fn(v, key)).length)
          res.push.apply(res, v);
      });
      return res;
    }
  }
})();