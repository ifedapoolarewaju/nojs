/*
* Signature:
*   on-[evtType]-[action]-[propertyType] = "target propertyName propertyValue"
*   on-[evtType]-[action]-[propertyType] = "target propertyValue"
*   on-[evtType]-[action]-[propertyType]-self = "propertyName propertyValue"
*
* Supported actions:
*   add, remove, set, toggle, switch, reset, trigger
*
* Supported propertyTypes:
*   attribute:
*     on-[eventType]-add||set-attribute="[target] [attributeName] [attributeValue]"
*     on-[eventType]-remove-attribute="[target] [attributeName]"
*   class:
*     on-[eventType]-add-class="[target] [className]"
*     on-[eventType]-set-class="[target] [className]"
*     on-[eventType]-remove-class="[target] [className]"
*     on-[eventType]-toggle-class="[target] [className]"
*     on-[eventType]-switch-class="[target] [className]"
*   id:
*     on-[eventType]-add||set-id="[target] [idValue]"
*     on-[eventType]-remove-id="[target]"
*   dom:
*     on-[eventType]-remove-dom="[target]"
*   value:
*     on-[eventType]-set-value="[form input target] [value]"
*     on-[eventType]-reset-value="[form input target]"
*   text:
*     on-[eventType]-set-text="[target] [textValue]"
*   click,blur,focus,scrollIntoView:
*     on-[eventType]-trigger-click="[target]"
*     on-[eventType]-trigger-focus="[target]"
*     on-[eventType]-trigger-blur="[target]"
*     on-[eventType]-trigger-scrollIntoView="[target]"
*
*/
"use strict";

(function() {
  function NoJS (dom) {
    this.targetTypes = {};
    this.templates = {};
  }

  /**
   * Can handle spaces, single quotation,  and escaped "\', \\, \ " chars.
   */
  NoJS.prototype.splitParams = function(param) {
    if(param == null) { return null; }
    var ret = [];
    var str = "";
    var inQuote = false;
    var prevSpace = false;
    var prevQuote = false;
    var prevEsc = false;
    var first = true;
    for(var i = 0; i < param.length; i++) {
      var chr = param.charAt(i);
      if(prevEsc) {
        if('\'' === chr || '\\' === chr || /\s/.exec(chr)) {
          str += chr;
        } else {
          return "invalid";
        }
        prevEsc = false;
        first = false;
        prevSpace = false;
        prevQuote = false;
      } else if((first || prevSpace || !inQuote) && chr === '\'') {
        if(!first && !prevSpace) {
          return "invalid";
        }
        // start recording a quoted string.
        inQuote = true;
        first = false;
        prevSpace = false;
      } else if(inQuote && chr === '\'') {
        // end recording a quoted string
        inQuote = false;
        prevQuote = true;
        ret.push(str);
        str = "";
      } else if(!inQuote && /\s/.exec(chr)) {
        // matched a space between params.
        if(!first && !prevSpace && !prevQuote) {
          ret.push(str);
          str = "";
        } // else multiple spaces in a row or leading space.
        prevSpace = true;
        prevQuote = false;
      } else if('\\' === chr) {
        prevEsc = true;
        first = false;
        prevSpace = false;
        prevQuote = false;
      } else {
        if(prevQuote) { return "invalid"; }
        first = false;
        prevSpace = false;
        prevQuote = false;
        str += chr;
      }
    }

    if(inQuote) {
      return "invalid";
    }

    if(!prevQuote && !prevSpace && !first) {
      ret.push(str);
    } // else last param was inserted by close quote, or it has trailing space.

    return ret;
  };

  NoJS.prototype.processTrigger = function(keys, vals) {
    var trigger = {};
    trigger.eventType = keys.shift();
    trigger.invalid = false;
    if(keys[0] === "timeout") {
      keys.shift();
      trigger.timeout = {};
      trigger.timeout.time = parseInt(vals.shift());
      trigger.timeout.count = parseInt(vals.shift());
      if(isNaN(trigger.timeout.time) || isNaN(trigger.timeout.count)) {
        trigger.invalid = true;
      }
    } else { trigger.timeout = null; }
    return trigger;
  };

  NoJS.prototype.processAction = function(keys, vals, elt) {
    var action = {};
    action.actionType = keys.shift();
    action.targetType = keys.shift().toLowerCase();
    action.sourceElement = elt;
    action.isSelf = keys[keys.length - 1] === "self";

    if(action.isSelf) { action.target = elt; }
    else { action.target = vals.shift(); }

    action.invalid = false;

    var targetType = this.targetTypes[action.targetType];
    if(action.actionType == null || action.targetType == null
      || targetType == null || action.target == null) {
      action.invalid = true;
    } else {
      targetType.process(action, vals);
    }

    return action;
  };

  NoJS.prototype.processListener = function(trig, act, elt) {
    var targetType = this.targetTypes[act.targetType];
    if(targetType != null) {
      var apply = function(evt) {
        if(act.isSelf) { targetType.apply(evt, act, act.target); }
        else {
          var tgts = document.querySelectorAll(act.target);
          tgts.forEach(function (target) {
            targetType.apply(evt, act, target);
          });
        }
      };
      var listener = null;

      if(trig.timeout == null) { listener = apply; }
      else if(trig.timeout.count > 0) {
        var countDown = trig.timeout.count;
        listener = function(evnt) {
          if(countDown-- > 0) {
            apply(evnt);
            setTimeout(listener, trig.timeout.time);
          }
          else {
            countDown = trig.timeout.count;
          }
        };
      } else {
        listener = function(evnt) {
          setInterval(function() { apply(evnt); }, trig.timeout.time);
        }
      }

      if(trig.eventType === "immediately") {
        // apply it after all the listeners are installed.
        setTimeout(function() { listener(null) });
      } else {
        elt.addEventListener(trig.eventType, listener);
      }
    }
  };

  NoJS.prototype.templateArgs = function(vals, args) {
    for(var j = 0; j < vals.length; j++) {
      for(var k = 0; k < args.length; k++) {
        var re = new RegExp("\\$" + k, "g");
        vals[j] = vals[j].replace(re, args[k]);
      }
    }
  }

  NoJS.prototype.processTemplate = function(elt, argStr) {
    var args = this.splitParams(argStr);
    if(args === "invalid") {
      console.warn("invalid no-js template no-js=\"" + argStr + "\"");
    }

    var template = this.templates[args.shift()];

    if(template == null || template.argc !== args.length) {
      console.warn("invalid no-js template no-js=\"" + argStr + "\"");
    }

    for(var i = 0; i < template.copyActions.length; i++) {
      var keys = template.copyActions[i].keyStr.split("-");
      keys.shift();
      var vals = this.splitParams(template.copyActions[i].valStr);

      this.templateArgs(vals, args);

      var trigger = this.processTrigger(keys, vals);
      var action = this.processAction(keys, vals, elt);

      if(action.invalid || trigger.invalid) {
        console.warn("invalid no-js template no-js=\"" + argStr + "\"");
      } else {
        this.processListener(trigger, action, elt);
      }
    }
  };

  NoJS.prototype.processElement = function(elt) {
    // returns a list of actions to be added to the element.
    var this_ = this;
    Object.keys(elt.attributes).forEach(function(prop) {
      var attr = elt.attributes[prop];

      // to enable support for single and double dashes.
      // note the order of condition checking is important.
      var doubleDash = false;
      if(attr.name === "no-js" && attr.value != null && attr.value !== "") {
        this_.processTemplate(elt, attr.value);
        return;
      }
      else if (attr.name.indexOf('on--') === 0) {
        doubleDash = true;
        console.warn('Deprecation warning: using double dashes "--" are deprecated. Use a single dash "-" instead.')
      } else if (attr.name.indexOf('on-') !== 0) {
        // This is a regular HTML attribute, no action required.
        return;
      }

      var signatureParts = attr.name.split(doubleDash ? '--' : '-');
      signatureParts.shift();
      var paramValues = this_.splitParams(attr.value);

      if(paramValues === "invalid") {
        console.warn("invalid no-js parameter " + attr.name + "=\""
          + attr.value + "\"");
      }

      var trigger = this_.processTrigger(signatureParts, paramValues);
      var action = this_.processAction(signatureParts, paramValues, elt);

      if(action.invalid || trigger.invalid) {
        console.warn("invalid no-js attribute " + attr.name + "=\""
          + attr.value + "\"");
      } else {
        this_.processListener(trigger, action, elt);
      }
    });
  };

  NoJS.prototype.processMeta = function(meta) {
    var template = {};
    template.copyActions = [];
    template.applyActions = [];
    var noJsStr = null;

    Object.keys(meta.attributes).forEach(function(prop) {
      var attr = meta.attributes[prop];

      if(attr.name == "no-js") { noJsStr = attr.value; }
      else if(attr.name.indexOf("on-") === 0) {
        var copy = {};
        copy.keyStr = attr.name;
        copy.valStr = attr.value;
        template.copyActions.push(copy);
      } else {
        var apply = {};
        apply.keyStr = attr.name;
        apply.valStr = attr.value;
        template.applyActions.push(apply);
      }
    });

    var noJsArgs = this.splitParams(noJsStr);
    if(noJsArgs != null && noJsArgs.length === 2) {
      template.argc = parseInt(noJsArgs[1]);
    }

    if(template.argc == null || isNaN(template.argc)
      || this.templates[noJsArgs[0]] != null) {
      console.warn("invalid no-js meta template");
      console.warn(meta);
    } else {
      this.templates[noJsArgs[0]] = template;
    }
  };

  NoJS.prototype.js = function (dom) {
    var this_ = this;
    dom = dom || 'html';
    document.querySelector(dom).querySelectorAll('[no-js]').forEach(function(el) {
      if(el.tagName.toLowerCase() === "meta") {
        this_.processMeta(el);
      } else {
        this_.processElement(el);
      }
    });
  };

  window.no = new NoJS();

  no.targetTypes.attribute = {};
  no.targetTypes.attribute.process = function(action, values) {
    if(action.actionType === "add" || action.actionType === "set") {
      if(values.length >= 2) {
        action.attributeName = values.shift();
        action.attributeValue = values.join(" ");
      } else { action.invalid = true; }
    } else if(action.actionType === "remove") {
      if(values.length === 1) {
        action.attributeName = values.shift();
      } else { action.invalid = true; }
    } else { action.invalid = true; }
  };
  no.targetTypes.attribute.apply = function(evnt, action, target) {
    if(action.actionType === "remove") {
      target.removeAttribute(action.attributeName);
    } else {
      target.setAttribute(action.attributeName, action.attributeValue);
    }
  };

  no.targetTypes["class"] = {};
  no.targetTypes["class"].process = function(action, values) {
    if(action.actionType === "add" || action.actionType === "set"
      || action.actionType === "remove" || action.actionType === "toggle"
      || action.actionType === "switch") {
      action.classNames = values;
    } else { action.invalid = true; }
  };
  no.targetTypes["class"].apply = function(evnt, action, target) {
    if(action.actionType === "set") {
      target.className = action.classNames.join(" ");
    } else if(action.actionType === "switch") {
      // @todo add and remove based on the class presence
      // during time of action
      action.classNames.forEach(function(name) {
        target.classList.remove(name);
        action.sourceElement.classList.add(name);
      });
    } else {
      action.classNames.forEach(function(name) {
        target.classList[action.actionType](name);
      });
    }
  };

  no.targetTypes.id = {};
  no.targetTypes.id.process = function(action, values) {
    action.targetType = "attribute";
    values.unshift("id");
    no.targetTypes.attribute.process(action, values);
  };

  no.targetTypes.dom = {};
  no.targetTypes.dom.process = function(action, values) {
    if(action.actionType !== "remove" && values.length != 0) {
      action.invalid;
    }
  };
  no.targetTypes.dom.apply = function(evnt, action, target) {
    if(action.actionType === "remove") {
      target.remove();
    }
  };

  no.targetTypes.value = {};
  no.targetTypes.value.process = function(action, values) {
    if(action.actionType === "set") {
      action.value = values.join(" ");
    } else if(action.actionType !== "reset" || values.length !== 0) {
      action.invalid = true;
    }
  };
  no.targetTypes.value.apply = function(evnt, action, target) {
    if(action.actionType === "set") {
      target.value = action.value;
    } else if(action.actionType === "reset") {
      target.value = null;
    }
  };

  no.targetTypes.text = {};
  no.targetTypes.text.process = function(action, values) {
    if(action.actionType === "set") {
      action.text = values.join(" ");
    } else {
      action.invalid = true;
    }
  };
  no.targetTypes.text.apply = function(evnt, action, target) {
    if(action.actionType === "set") {
      target.innerText = action.text;
    }
  };

  function addTrigger(type) {
    var ltype = type.toLowerCase();
    no.targetTypes[ltype] = {};
    no.targetTypes[ltype].process = function(action, values) {
      if(action.actionType !== "trigger" || values.length > 0) {
        action.invalid = true;
      }
    }
    no.targetTypes[ltype].apply = function(evnt, action, target) {
      target[type]();
    }
  }

  addTrigger("click");
  addTrigger("focus");
  addTrigger("blur");
  addTrigger("scrollIntoView");

  no.targetTypes.template = {};
  no.targetTypes.template.process = function(action, values) {
    if(action.actionType === "apply") {
      action.template = action.target;
      action.target = action.sourceElement;
      action.isSelf = true;
      action.args = values;
    }
  };
  no.targetTypes.template.apply = function(evnt, action, target) {
    var template = no.templates[action.template];

    for(var i = 0; i < template.applyActions.length; i++) {
      var keys = template.applyActions[i].keyStr.split("-");
      var vals = no.splitParams(template.applyActions[i].valStr);

      no.templateArgs(vals, action.args);
      var newAct = no.processAction(keys, vals, target);
      if(newAct.isSelf) {
        no.targetTypes[newAct.targetType].apply(evnt, newAct, target);
      } else {
        document.querySelectorAll(newAct.target).forEach(function(newTarget) {
        no.targetTypes[newAct.targetType].apply(evnt, newAct, newTarget);
      });
      }
    }
  };

  document.addEventListener('DOMContentLoaded', function() {
    no.js();
  });
})();
