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
(function() {
  function NoJS (dom) {
    this.js(dom);
  }

  /**
   * Can handle spaces, single quotation,  and escaped "\', \\, \ " chars.
   */
  NoJS.prototype._splitParams = function(param) {
    var ret = [];
    var str = "";
    var inQuote = false;
    var prevSpace = false;
    var prevQuote = false;
    var prevEsc = false;
    var first = true;
    for(var i = 0; i < param.length; i++) {
      var chr = param.charAt(i);
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
  }

  NoJS.prototype._processRegular = function(elt) {
    var this_ = this;
    Object.keys(elt.attributes).forEach(function(prop) {
      var attr = elt.attributes[prop];
      var isSelf = false;

      // to enable support for single and double dashes.
      // note the order of condition checking is important.
      if (attr.name.indexOf('on--') === 0) {
        var doubleDash = true;
        console.warn('Deprecation warning: using double dashes "--" are deprecated. Use a single dash "-" instead.')
      } else if (attr.name.indexOf('on-') === 0) {
      var doubleDash = false;
      } else {
        return;
      }

      var signatureParts = attr.name.split(doubleDash ? '--' : '-');
      var paramValues = this_._splitParams(attr.value);

      if(signatureParts.length < 4) {
        console.warn("invalid signature: \"" + attr.name + "\"");
        return;
      }
      var eventType = signatureParts[1];
      var action = signatureParts[2];
      var propertyOrEventType = signatureParts[3];

      var target;
      if (signatureParts.length > 4 && signatureParts[signatureParts.length -1] === 'self') {
        target = elt;
        isSelf = true;
      } else {
        isSelf = false;
        target = paramValues[0];
      }

      var propertyName = propertyOrEventType;
      var propertyValue;
      if (action !== 'reset') {
        var index = this_._getPropertyValueIndex(propertyOrEventType, isSelf);
        // join space containing values that might have been split.
        propertyValue = paramValues.slice(index).join(' ');
        if (propertyOrEventType === 'attribute') {
          propertyName = paramValues[index - 1];
        }
      }

      var options = {
        action: action,
        target: target,
        sourceElement: elt,
        propertyOrEventType: propertyOrEventType,
        propertyValue: propertyValue,
        propertyName: propertyName
      };

      elt.addEventListener(eventType, function(e) {
        this_._handler(options);
      });
    });
  }

  NoJS.prototype.js = function (dom) {
    dom = dom || 'html';
    var this_ = this;
    document.querySelector(dom).querySelectorAll('[no-js]').forEach(function(el) {
      this_._processRegular(el);
    });
  }

  NoJS.prototype._getPropertyValueIndex = function (propertyOrEventType, isSelf) {
    // if props type is attribute, the signature takes the form
    // on-[evtType]-[action]-attribute = "target propertyName propertyValue"
    var index = propertyOrEventType === 'attribute' ? 2 : 1;
    return isSelf ? index - 1 : index;
  }

  NoJS.prototype._handler = function (options) {
    var targets = typeof options.target === "string" ? document.querySelectorAll(options.target) : [options.target];
    targets.forEach(function(el) {
      if (options.action === 'trigger' && typeof el[options.propertyOrEventType] === 'function') {
        el[options.propertyOrEventType]();
        return;
      }

      if (options.propertyOrEventType === 'class') {
        if (options.action === 'set') {
          el.className = options.propertyValue;
        } else if (options.action == 'switch') {
          // @todo add and remove based on the class presence
          // during time of action
          el.classList.remove(options.propertyValue);
          options.sourceElement.classList.add(options.propertyValue);
        } else {
          el.classList[options.action](options.propertyValue);
        }
      }

      else if (options.propertyOrEventType === 'attribute' || options.propertyOrEventType === 'id') {
        if (options.action === 'remove') {
          el.removeAttribute(options.propertyName);
        } else if (options.action === 'add' || options.action == 'set') {
          el.setAttribute(options.propertyName, options.propertyValue);
        }
      }

      else if (options.propertyOrEventType === 'dom' && options.action === 'remove') {
        el.remove();
      }

      else if (options.propertyOrEventType === 'value') {
        if (options.action === 'set') {
          el.value = options.propertyValue;
        } else if (options.action === 'reset') {
          el.value = null;
        }
      }

      else if (options.propertyOrEventType === 'text' && options.action === 'set') {
        el.innerText = options.propertyValue;
      }
    })
  }

  document.addEventListener('DOMContentLoaded', function() {
    window.no = new NoJS();
  });
})()
