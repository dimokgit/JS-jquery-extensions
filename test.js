require(["jquery", "./src/objecter.js"], function ($, objecter) {
  var o = { prop: "Prop" };
  alert(objecter.sure(o, "Prop"));
  try {
    objecter.sure(o, "Prop2");
  } catch (e) {
    alert(JSON.stringify(e, ["message", "arguments", "type", "name", "stack"], 2));
  }
  alert("Using " + objecter.sure(o, {
    name: "Prop3", error: function (o, p, e) {
      alert(JSON.stringify(e)); return "DImon";
    }
  }));

  var sureO = objecter.sure(o);
  try {
    sureO("Prop4");
  } catch (e) {
    alert(JSON.stringify(e, ["message", "arguments", "type", "name", "stack"], 2));
  }
  alert("Using:" + sureO({
    name: "Prop5", error: function (o, p, e) {
      alert(e);
      return "hooray";
    }
  }));
  alert("For Prop7 using:" + sureO({ name: "Prop7", error: "hooray2" }));

});
