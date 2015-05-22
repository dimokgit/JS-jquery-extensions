require(["jquery", "./src/objecter.js"], function ($, objecter) {
  var o = { prop: "Property" };
  alert(objecter.sure(o, "Prop"));
  alert(objecter.sure(o, "Prop2")|| "No Prop2 found");
  alert("Using "+objecter.sure(o, { name: "Prop2", error: function (o, p, e) { alert(JSON.stringify(e)); return "DImon"; } }));
})
