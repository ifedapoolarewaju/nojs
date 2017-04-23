/*
* Signature:
*   on-[evtType]-[action]-[propertyType] = "target propertyName propertyValue"
*   on-[evtType]-[action]-[propertyType] = "target propertyValue"
*   on-[evtType]-[action]-[propertyType]-self = "propertyName propertyValue"
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
*
*/
(function() {
  function NoJS (dom) {
    this.js(dom)
  }

  NoJS.prototype.js = function (dom) {
    dom = dom || 'html';
    var this_ = this;
    var isSelf = false;
    document.querySelector(dom).querySelectorAll('[no-js]').forEach(function(el) {
      Object.keys(el.attributes).forEach(function(prop) {
        var attr = el.attributes[prop];

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
        var paramValues = attr.value.split(' ');

        var eventType = signatureParts[1], action = signatureParts[2], propertyType = signatureParts[3];

        if (signatureParts.length === 5 && signatureParts[4] === 'self') {
          var target = el;
          isSelf = true;
        } else {
          var target = paramValues[0];
        }

        var propertyValue;
        if (action !== 'remove' || action !== 'reset') {
          var index = this_._getPropertyValueIndex(propertyType, isSelf)
          // join space containing values that might have been split.
          propertyValue = paramValues.splice(index).join(' ')
        }

        var options = {
          action: action,
          target: target,
          sourceElement: el,
          propertyType: propertyType,
          propertyValue: propertyValue,
          propertyName: propertyType === 'attribute' ? paramValues[1] : propertyType
        }

        el.addEventListener(eventType, function(e) {
          this_._handler(options);
        })
      })
    })
  }

  NoJS.prototype._handler = function (options) {
    var targets = typeof options.target === "string" ? document.querySelectorAll(options.target) : [options.target];
    targets.forEach(function(el) {
      if (options.propertyType === 'class') {
        if (options.action === 'set') {
          el.className = options.propertyValue
        } else if (options.action == 'switch') {
          el.classList.remove(options.propertyValue)
          options.sourceElement.classList.add(options.propertyValue)
        } else {
          el.classList[options.action](options.propertyValue)
        }
      }

      else if (options.propertyType === 'attribute' || options.propertyType === 'id') {
        if (options.action === 'remove') {
          el.removeAttribute(options.propertyName)
        } else if (options.action === 'add' || options.action == 'set') {
          el.setAttribute(options.propertyName, options.propertyValue);
        }
      }

      else if (options.propertyType === 'dom' && options.action === 'remove') {
        el.remove();
      }

      else if (options.propertyType === 'value') {
        if (options.action === 'set') {
          el.value = options.propertyValue;
        } else if (options.action === 'reset') {
          el.value = null;
        }
      }

      else if (options.propertyType === 'text' && options.action === 'set') {
        el.innerText = options.propertyValue;
      }
    })
  }

  NoJS.prototype._getPropertyValueIndex = function (propertyType, isSelf) {
    var index = propertyType === 'attribute' ? 2 : 1;
    return isSelf ? index - 1 : index;
  }

  document.addEventListener('DOMContentLoaded', function() {
    window.no = new NoJS();
  })
})()