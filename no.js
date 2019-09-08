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
*     on-[eventType]-add-attribute="[target] [attributeName] [attributeValue]"
*     on-[eventType]-set-attribute="[target] [attributeName] [attributeValue]"
*     on-[eventType]-remove-attribute="[target] [attributeName]"
*   class:
*     on-[eventType]-add-class="[target] [className]"
*     on-[eventType]-set-class="[target] [className]"
*     on-[eventType]-remove-class="[target] [className]"
*     on-[eventType]-toggle-class="[target] [className]"
*     on-[eventType]-switch-class="[target] [className]"
*   id:
*     on-[eventType]-add-id="[target] [idValue]"
*     on-[eventType]-set-id="[target] [idValue]"
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
    this.js(dom);
  }

  /**
   * Can handle spaces, single quotation,  and escaped "\', \\, \ " chars.
   */
  NoJS.prototype.splitParams = function(param) {
    let ret = [];
    let str = "";
    let inQuote = false;
    let prevSpace = false;
    let prevQuote = false;
    let prevEsc = false;
    let first = true;
    for(let i = 0; i < param.length; i++) {
      let chr = param.charAt(i);
      if((first || prevSpace || !inQuote) && !prevEsc && chr === '\'') {
        if(!first && !prevSpace) {
          console.warn("possibly malformed parameter string: \"" + param + "\"");
        }
        // start recording a quoted string.
        inQuote = true;
        first = false;
        prevSpace = false;
        prevQuote = false;
      } else if(inQuote && !prevEsc && chr === '\'') {
        // end recording a quoted string
        inQuote = false;
        prevQuote = true;
        ret.push(str);
        str = "";
      } else if(!inQuote && !prevEsc && /\s/.exec(chr)) {
        // matched a space between params.
        if(!first && !prevSpace && !prevQuote) {
          ret.push(str);
          str = "";
        } // else multiple spaces in a row or leading space.
        prevSpace = true;
        prevQuote = false;
      } else if(!prevEsc && '\\' === chr) {
        prevEsc = true;
        first = false;
        prevSpace = false;
        prevQuote = false;
      }else if(prevEsc) {
        if('\'' === chr || '\\' === chr || /\s/.exec(chr)) {
          str += chr;
        } else {
          console.warn("possibly malformed parameter string: \"" + param + "\"");
        }
        prevEsc = false;
        first = false;
        prevSpace = false;
        prevQuote = false;
      } else {
        first = false;
        prevSpace = false;
        prevQuote = false;
        str += chr;
      }
    }

    if(inQuote) {
      console.warn("possibly malformed parameter string: \"" + param + "\"");
    }

    if(!prevQuote && !prevSpace && !first) {
      ret.push(str);
    } // else last param was inserted by close quote, or it has trailing space.

    return ret;
  };

  NoJS.prototype.processTrigger = function(keys, vals) {
    let trigger = {};
    trigger.eventType = keys.shift();
    if(keys[0] === "timeout") {
      keys.shift();
      trigger.timeout = {};
      trigger.timeout.time = parseInt(vals.shift());
      trigger.timeout.count = parseInt(vals.shift());
    } else { trigger.timeout = null; }
    return trigger;
  };

  NoJS.prototype.processAction = function(keys, vals, elt) {
    let action = {};
    action.invalid = false;
    action.actionType = keys.shift();
    let property = keys.shift();
    if((action.actionType === "add" && (property === "class"
        || property === "attribute" || property === "id"))
      || (action.actionType === "set" && (property === "attribute"
        || property === "class" || property === "id"
        || property === "value" || property === "text"))
      || (action.actionType === "remove" && ( property === "attribute"
        || property === "class" || property === "id"
        || property === "dom"))
      || (action.actionType === "reset" && property === "value")
      || ((action.actionType === "toggle" || action.actionType === "switch")
        && property === "class"))
    {
      action.propertyType = property;
    } else { action.propertyType = property; action.invalid = true; }

    action.isSelf = keys[keys.length - 1] === "self";

    if(action.isSelf) {
      action.target = elt;
    } else {
      action.target = vals.shift();
    }

    hasMore = lst => { if(!lst.length > 0) { action.invalid = true; } };

    if(action.propertyType === "class") {
      hasMore(vals);
      action.className = vals.shift();
    } else if(action.propertyType === "id") {
      action.propertyType = "attribute";
      action.attributeName = "id";
      if(action.actionType !== "remove") {
        hasMore(vals);
        action.attributeValue = vals.shift();
      }
    } else if(action.propertyType === "attribute") {
      hasMore(vals);
      action.attributeName = vals.shift();
      if(action.actionType !== "remove") {
        hasMore(vals);
        action.attributeValue = vals.shift();
      }
    } else if(action.propertyType === "value") {
      if(action.actionType !== "reset") {
        hasMore(vals);
        action.value = vals.shift();
      }
    } else if(action.propertyType === "text") {
      hasMore(vals);
      action.text = vals.shift();
    }
    return action;
  };

  NoJS.prototype.processListener = function(trig, act) {
    if(trig.timeout === null) {
      if(trig.eventType === "immediately") {
        // timeout 0 to happen after all other listeners are installed.
        setTimeout(() => { this.apply(null, act); }, 0);
      } else {
        elt.addEventListener(trigger.eventType, evt => {
          this.apply(evt, act);
        });
      }
    } else if(trig.timeout.count < 0) {
      if(trig.eventType === "immediately") {
        setInterval(() => { this.apply(null, act); }, trig.timeout.time);
      } else {
        elt.addEventListener(trigger.eventType, evt => {
          setInterval(() => { this.apply(evt, act); }, nums);
        });
      }
    } else if(trig.timeout.count > 0) {
      let countDown = trig.timeout.count;
      let countDownTimer = () => {
        this.apply(null, act);
        if(countDown > 0) {
          countDown--;
          setTimeout(countDownTimer, trig.timeout.time);
        }
      };
      if(trig.eventType === "immediately") {
        setTimeout(countDownTimer, trig.timeout.time);
      } else {
        elt.addEventListener(trig.eventType, () => {
          setTimeout(countDownTimer, trig.timeout.time);
        });
      }
    } // else if trig.timeout.count === 0 do nothing.
  };

  NoJS.prototype._processElement = function(elt) {
    // returns a list of actions to be added to the element.
    let ret = [];
    Object.keys(elt.attributes).forEach(prop => {
      let attr = elt.attributes[prop];

      // to enable support for single and double dashes.
      // note the order of condition checking is important.
      let doubleDash = false;
      if (attr.name.indexOf('on--') === 0) {
        doubleDash = true;
        console.warn('Deprecation warning: using double dashes "--" are deprecated. Use a single dash "-" instead.')
      } else if (attr.name.indexOf('on-') !== 0) {
        // This is a regular HTML attribute, no action required.
        return;
      }

      let signatureParts = attr.name.split(doubleDash ? '--' : '-');
      let paramValues = this_._splitParams(attr.value);

      let trigger = this.processTrigger(signatureParts, paramValues);
      let action = this.processAction(signatureParts, paramValues, elt);

      if(action.invalid || (trigger.timeout != null &&
        (isNaN(trigger.timeout.time) || isNaN(trigger.timeout.count)))) {
        console.warn("invalid no-js attribute \"" + attr.name + "\"=\""
          + attr.value + "\"");
      } else {
        this.processListener(trigger, action);
      }
    });
  }

  NoJS.prototype.js = function (dom) {
    dom = dom || 'html';
    document.querySelector(dom).querySelectorAll('[no-js]').forEach(el => {
      this.processRegular(el);
    });
  };

  document.addEventListener('DOMContentLoaded', function() {
    window.no = new NoJS();
  });
})()
