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

  describe("splitParams", function() {
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

  describe("templateArgs", function() {
    it("should replace args", function() {
      var vals = ["1 $0", "2 $1", "3 $2"];
      var args = ["aaaa", "bbbb", "cccc"];
      no.templateArgs(vals, args)
      expect(vals).toEqual(["1 aaaa", "2 bbbb", "3 cccc"]);
    });
  });

});
