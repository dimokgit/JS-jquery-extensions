/// <reference path="jquery.js" />
/// <reference path="knockout.js" />
/// <reference path="MicrosoftAjax.js" />
(function () {

  if (typeof define === "function" && define.amd) {
    define(["ko", "jquery"], function (ko, $) {
      factory(ko || require("knockout"), $);
    })
  } else factory(ko, $);

  function factory(ko,$) {
    // This jQuery plugin will gather the comments within
    // the current jQuery collection, returning all the
    // comments in a new jQuery collection.
    //
    // NOTE: Comments are wrapped in DIV tags.
    jQuery.fn.comments = function (blnDeep) {
      var blnDeep = (blnDeep || false);
      var jComments = $([]);

      // Loop over each node to search its children for
      // comment nodes and element nodes (if deep search).
      this.each(
        function (intI, objNode) {
          var objChildNode = objNode.firstChild;
          var strParentID = $(this).attr("id");

          // Keep looping over the top-level children
          // while we have a node to examine.
          while (objChildNode) {

            // Check to see if this node is a comment.
            if (objChildNode.nodeType === 8) {

              // We found a comment node. Add it to
              // the nodes collection wrapped in a
              // DIV (as we may have HTML).
              jComments = jComments.add(
                "<div rel='" + strParentID + "'>" +
                objChildNode.nodeValue +
                "</div>"
                );

            } else if (
              blnDeep &&
              (objChildNode.nodeType === 1)
              ) {

              // Traverse this node deeply.
              jComments = jComments.add(
                $(objChildNode).comments(true)
                );

            }

            // Move to the next sibling.
            objChildNode = objChildNode.nextSibling;

          }

        }
        );

      // Return the jQuery comments collection.
      return (jComments);
    }
    var DATA_BIND = "data-bind";
    jQuery.fn.center = function () {
      $.each(this, function () {
        var el = this;
        setTimeout(function () {
          $(el).css({ top: '50%', left: '50%', margin: '-' + ($(el).outerHeight() / 2) + 'px 0 0 -' + ($(el).outerWidth() / 2) + 'px' });
        }, 0);
      });
      return this;
    }
    /*
    $(document).scroll(function(){      
    var delta = $(window).scrollTop() - $("#your_table thead").offset().top;
    if(delta > 0)     {         translate($("#your_table th"),0,delta-2);     }     
    else     {         translate($("#your_table th"),0,0);     } }); 
    //Where translate() applies a CSS transform, like the following:
  
    function translate(element, x, y) {
    var translation = "translate(" + x + "px," + y + "px)"      
    element.css({         
    "transform": translation,         
    "-ms-transform": translation,         
    "-webkit-transform": translation,         
    "-o-transform": translation,         
    "-moz-transform": translation     }); } 
    */
    jQuery.fn.extend({
      D: function () {
        var this_ = this;
        return {
          centerDialog: function () {
            setTimeout(function () { this_.dialog('option', 'position', 'center'); }, 0);
          },
          loadTmpl: function (tmplUri, params, callback) {
            return this_.load(tmplUri + "", params, callback);
          },
          notTaken: function () {
            return this_.not("[taken]").eq(0).attr("taken", "");
          },
          kendo: {
            createChart: function (title, series, categories, chartOptions) {
              if (!jQuery.fn.kendoChart) return alert("kendoChart is not found.");
              var options = $.extend(true, {
                theme: $(document).data("kendoSkin") || "default",
                title: { text: title },
                series: series,
                categoryAxis: categories
              }, chartOptions);
              $.each(this_, function () {
                $(this).kendoChart(options);
              });
              return this_;
            }
          },
          dataBind: function (viewModel) {
            $.each(this_, function () {
              ko.applyBindings(viewModel, this);
            });
            return this_;
          }
        };
      },
      applyBindings: function (viewModel) {
        $.each(this, function () {
          try {
            ko.applyBindings(viewModel, this);
          } catch (e) {
            $.D.makeDialog("<pre>" + e + "</pre>", { title: "Apply Bindings" });
          }
        });
        return this;
      },
      dataBindAttr: function (attrs) {
        if (arguments.length == 0)
          return this.eq(0).attr(DATA_BIND);
        var attr = $.isArray(attrs) ? attrs : $.map($.makeArray(arguments), function (v) { return v ? v : null; }).join(",");
        this.eq(0).attr(DATA_BIND, attr);
        return this;
      },
      Enter2Tab: function () {
        if ($.browser.msie)
          $.each(this, function () {
            $(this).keydown(function (a, b) {
              if (event.keyCode == 13) {
                event.keyCode = 9;
              }
            });
          });
      }
    });

    $.extend($.expr[":"], {
      "starts-with": function (elem, i, data, set) {
        var text = $.trim($(elem).text()),
            term = data[3];

        // first index is 0
        return text.indexOf(term) === 0;
      },

      "ends-with": function (elem, i, data, set) {
        var text = $.trim($(elem).text()),
            term = data[3];

        // last index is last possible
        return text.lastIndexOf(term) === text.length - term.length;
      }
    });
  }
}
)();