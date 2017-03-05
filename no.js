
// js--[action]--[property]--when="evtType target propertyValue"
// TODO: js--[action]--[property]--self--when
(function() {
  function NoJS (dom) {
    this.js(dom)
  }

  NoJS.prototype.js = function (dom) {
    dom = dom || 'body';
    var this_ = this;
    document.querySelector(dom).querySelectorAll('[no-js]').forEach(function(el) {
      Object.keys(el.attributes).forEach(function(prop){
        var attr = el.attributes[prop]

        if (attr.name.startsWith('js--')) {
          parts = attr.name.split('--');
          otherParts = attr.value.split(' ');

          var action = parts[1], propertyName = parts[2];
          var eventType = otherParts[0], target = otherParts[1];
          var propertyValue = otherParts.length > 2 ? otherParts[2] : undefined;
          el.addEventListener(eventType, function(e){
            this_._handler(action, propertyName, target, propertyValue);
          })
        }
      })
    })
  }

  NoJS.prototype._handler = function (action, propertyName, target, propertyValue) {
    var ACTIONS = ['remove', 'add'];
    document.querySelectorAll(target).forEach(function(el){
      if (propertyName === 'class') {
        el.classList[action](propertyValue)
      } else if (action === 'remove') {
        el.removeAttribute(propertyName)
      } else if (action === 'add') {
        el.setAttribute(propertyName, propertyValue);
      }
    })
  }

  window.no = new NoJS();
})()