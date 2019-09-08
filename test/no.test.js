global.document = {};
global.window = global;

describe("no", function() {
  document.querySelectorAll = function(selector) { return []; };
  document.querySelector = function(selector) {
      var ret = {};
      ret.querySelectorAll = function(selector) { return []; };
      return ret;
  };
  document.addEventListener = function(evt, act) {
    act();
  };

  var nojs = require("../no.js");
  var no = window.no;

  it("can split parameters with spaces", function() {
    expect(no.splitParams("")).toEqual([ ]);
    expect(no.splitParams(" ")).toEqual([ ]);
    expect(no.splitParams("a")).toEqual(["a"]);
    expect(no.splitParams("a b")).toEqual(["a", "b"]);
    expect(no.splitParams("a b c")).toEqual(["a", "b", "c"]);
  });

  it("can split parameters with spaces and escapes", function() {
    expect(no.splitParams("\\ ")).toEqual([" "]);
    expect(no.splitParams("\\\\")).toEqual(["\\"]);
    expect(no.splitParams("\\ ")).toEqual([" "]);
  });

  it("can split quoted parameters", function() {
    expect(no.splitParams("\'a\'")).toEqual(["a"]);
    expect(no.splitParams("\'a\' \'b\'")).toEqual(["a", "b"]);
    expect(no.splitParams("\'a\' \'b\' \'c\'")).toEqual(["a", "b", "c"]);
  });

  it("can split quoted parameters with spaces and thingsin them", function() {
    expect(no.splitParams("\'a b c\'")).toEqual(["a b c"]);
    expect(no.splitParams("\'-a-\' \'+b+\'")).toEqual(["-a-", "+b+"]);
    expect(no.splitParams("\' $a!>* \' \'b c \' \'c:d:e \'")).toEqual([" $a!>* ", "b c ", "c:d:e "]);
  });

  it("can split mixed quoted and unquoted", function() {
    expect(no.splitParams("a \'b\'")).toEqual(["a", "b"]);
    expect(no.splitParams("\'a\' b")).toEqual(["a", "b"]);
    expect(no.splitParams("a \'b\' c")).toEqual(["a", "b", "c"]);
    expect(no.splitParams("\'a\' b \'c\'")).toEqual(["a", "b", "c"]);
  });

  it("can have escapes in quoted", function() {
    expect(no.splitParams("\'\\\'\\ \\\\\'")).toEqual(["\' \\"]);
    expect(no.splitParams("\'\\\'\' \'\\ \' \'\\\\\'")).toEqual(["\'", " ", "\\"]);
    expect(no.splitParams("\'a\\\'b\\ c\\\\\d'")).toEqual(["a\'b c\\d"]);
    expect(no.splitParams("\'a\\\'b\' \'c\\ d\' \'e\\\\f\'")).toEqual(["a\'b", "c d", "e\\f"]);
  });

  it("can mix escapes with quotes and nonquotes", function() {
    expect(no.splitParams("\'a \\ b\' c\\'\\  \'d\'")).toEqual(["a  b", "c\' ", "d"]);
  });

  it("detects errors ", function() {
    // no space between quoted strings.
    expect(no.splitParams("\'a\'\'b\'")).toEqual("invalid");
    // unclosed string
    expect(no.splitParams("\'a")).toEqual("invalid");
    // illegal escapes
    expect(no.splitParams("\\n")).toEqual("invalid");
  });

});
