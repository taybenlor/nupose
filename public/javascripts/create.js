var Poster = Class.create({
  initialize: function(canvas){
    this.widgets = $A();
    this.canvas = canvas;
  },
  load: function(data){
    if("poster" in data){
      this.fromJSON(data.poster);
    }
  },
  fromJSON: function(json){
    ["url","secret","email"].each(function(prop){
      this[prop] = json[prop];
    });
  },
  add: function(widget){
    this.widgets.push(widget);
  },
  remove: function(widget){
    this.widgets.find(widget);
  }
});

var Canvas = Class.create({
  initialize: function(element){
    this.element = $(element);
  },
  insert: function(){
    return this.element.insert.apply(this.element, arguments);
  }
});

var Toolbar = Class.create({
  initialize: function(element, canvas, poster){
    this.element = $(element);
    this.canvas = canvas;
    this.poster = poster;
    
    this.click_event = this.click.bind(this);
    
    this.element.observe('click', this.click_event);
  },
  click: function(event){
    event.stop();
    var trigger = event.findElement();
    if(!trigger){
      return;
    }
    var to_widget = trigger.readAttribute('data-widget');
    if(!to_widget){
      return;
    }
    var widget = new (window[to_widget])(this.poster);
    this.poster.add(widget);
  }
});

var Widget = Class.create({
  initialize: function(poster){
    this.poster = poster;
    this.canvas = poster.canvas;
    this.element = new Element('div', {
      "class":"widget"
    });
    
    /*
     * Control buttons - resize, rotate and open settings
     */
    this.controls = new Element('menu', {
      "class":"controls"
    });
    this.resize_control = new Element('button', {
      "class":"resize"
    });
    this.controls.insert(this.resize_control);
    this.rotate_control = new Element('button', {
      "class":"rotate"
    });
    this.controls.insert(this.rotate_control);
    this.settings_control = new Element('button',{
      "class":"settings"
    });
    this.controls.insert(this.settings_control);
    this.element.insert(this.controls);
    
    this.generateProperties();
    
    /*
     * Settings Panel
     */
    this.settings_panel = new Element('ul', {
      "class":"panel closed"
    });
    this.insertSettings();
    this.element.insert(this.settings_panel);
    
    /*
     * Save all the events with their bindings.
     */
    this.click_event = this.click.bind(this);
    this.mousemove_event = this.mousemove.bind(this);
    this.mouseup_event = this.mouseup.bind(this);
    this.mousedown_event = this.mousedown.bind(this);
    
    this.controls.observe('mousedown', this.mousedown_event);
    this.controls.observe('click', this.click_event);
    
    this.canvas.insert(this.element);
  },
  insertSettings: function(){
    var heading = new Element('li', {
      "class": "heading"
    });
    heading.innerHTML = "Header";
    this.settings_panel.insert(heading);
    
    var destroy_wrap = new Element('li');
    var destroy = new Element('button');
    destroy_wrap.insert(destroy);
    destroy.innerHTML = "Destroy";
    this.settings_panel.insert(destroy_wrap);
    destroy.observe('click', (function(){
      this.destroy();
    }).bind(this));
    
    this.insertSetting('width');
    this.insertSetting('height');
    this.insertSetting('left');
    this.insertSetting('top');
    
    this.insertSetting('zOrder');
    
  },
  insertSetting:function(name, options){
    options = options || {};
    var wrap = new Element('li');
    var type = options.type || "text";
    var input_options = options.input || {
      type: type,
      value: this[name]
    };
    var field = new Element('input', input_options);
    this.listen(name, function(new_val){
      field.value = new_val;
    });
    field.observe('change', (function(){
      this[name] = field.value;
    }).bind(this));
    var label = options.label || name;
    wrap.insert("<label>"+label+"</label>");
    wrap.insert(field);
    this.settings_panel.insert(wrap);
  },
  generateProperties:function(){
    this.generateProperty('height');
    this.generateProperty('width');
    this.generateProperty('left');
    this.generateProperty('top');
    this.generateProperty('zOrder', {
      set: function(y){
        this["_zOrder"] = y;
        this.element.setStyle({
          zIndex: y
        });
      },
      default: 100
    });
  },
  /*
   * Generates a property on the object. Creates listener stuff so you can listen to properties.
   * Pass with a False value for get and/or set to get default pixel property behaviour.
   * Will automatically call listeners with the new internal value and in the right context.
   * options = {
   *    get: function(){},
   *    set: function(){},
   *    default: 0
   *  }
   */
  generateProperty: function(name, options){
    options = options || {};
    this["_" + name] = options["default"] || 0;
    this["_" + name + "_listeners"] = $A([]);
    
    if(options.get){
      this.__defineGetter__(name, options.get);
    }
    else{
      this.__defineGetter__(name, function() { return this["_"+name] });
    }
    
    if(options.set){
      this.__defineSetter__(name, (function(y) {
        options.set.call(this, y);
        this["_" + name + "_listeners"].each((function(fn){
          fn.call(this, y);
        }).bind(this));
      }));
    }
    else{
      this.__defineSetter__(name, (function(y) {
        var obj = {};
        obj[name] = y + "px";
        this.element.setStyle(obj);
        this["_" + name] = y;
        this["_" + name + "_listeners"].each((function(fn){
          fn.call(this, y);
        }).bind(this));
      }).bind(this));
    }
    
    this[name] = options["default"] || 0;
  },
  listen: function(property, fn){
    this["_"+property+"_listeners"].push(fn);
  },
  destroy: function(){
    this.element.remove();
    this.poster.remove(this);
  },
  save: function(url, callback){
    var json = this.toJSON();
    var output = {
      width: this.width,
      height: this.height,
      left: this.left,
      top: this.top,
      style: this.getStyle(),
      data: json,
      version: 1.0,
      address: this.address,
      track_id: this.track_id,
      url: this.url
    };
    new Ajax.Request(url, {
      onComplete: callback,
      parameters: output,
      method: "POST"
    });
  },
  load: function(json){
    this.fromJSON(json.data);
    this.element.setAttribute("style", json.style);
  },
  fromJSON: function(json){
    $H(json).each(function(thing){
      this[thing.key] = thing.value;
    });
  },
  toJSON: function(){return {};},
  getStyle: function(){
    return this.element.readAttribute('style');
  },
  mousedown: function(event){
    var el = event.findElement();
    if(this.settings_open || el == this.settings_control){
      return;
    }
    event.stop();
    this.mouse_start = {
      x: event.pageX,
      y: event.pageY
    };
    if(el == this.resize_control){
      this.active_mouse_func = this.resize.bind(this);
    }
    else if(el == this.rotate_control){
      this.active_mouse_func = this.rotate.bind(this);
    }
    else{
      this.active_mouse_func = this.move.bind(this);
    }
    
    /*
    * Set our observers (only create when necessary to reduce overhead)
    */
    this.controls.stopObserving('mousedown', this.mousedown_event);
    this.controls.stopObserving('click', this.click_event);
    $(document.body).observe('mousemove', this.mousemove_event);
    $(document.body).observe('mouseup', this.mouseup_event);
    
  },
  mousemove: function(event){
    if(!!this.active_mouse_func){
      event.stop();
      var mouse = {
        x: event.pageX,
        y: event.pageY
      };

      this.active_mouse_func(this.mouse_start, mouse);
      this.mouse_start = mouse;
    }
  },
  mouseup: function(event){
    if(!!this.active_mouse_func){
      event.stop();

      var mouse = {
        x: event.pageX,
        y: event.pageY
      };
      
      this.active_mouse_func(this.mouse_start, mouse);
      this.active_mouse_func = null;
      this.mouse_start = null;
      
      /*
      * Clean up our observers.
      */
      $(document.body).stopObserving('mousemove', this.mousemove_event);
      $(document.body).stopObserving('mouseup', this.mouseup_event);
      this.controls.observe('mousedown', this.mousedown_event);
      this.controls.observe('click', this.click_event);
    }
  },
  click: function(event){
    var el = event.findElement();
    if(!this.settings_open && !(el == this.settings_control)){
      /* If it's not open and we haven't clicked on the settings control then do nothing*/
      return;
    }
    if(this.settings_open){ /* it is already open */
      if(!!event.findElement('.panel')){ /* they have clicked on the panel */
        return;
      }
      $(document.body).stopObserving('click', this.click_event);
      this.controls.observe('click', this.click_event);
      this.controls.observe('mousedown', this.mousedown_event);
      
      this.closeSettings();
    }
    else{
      this.controls.stopObserving('click', this.click_event);
      this.controls.stopObserving('mousedown', this.mousedown_event);
      $(document.body).observe('click', this.click_event); /* clicking outside the panel closes it */
      
      this.openSettings();
    }
    event.stop();
  },
  resize: function(start, end){
    var offset = this.resize_control.cumulativeOffset();
    
    var diff = { // +10 magic! (button is 20x20)
      x: end.x - offset.left - 10,
      y: end.y - offset.top - 10
    };
    
    this.width = this.element.getWidth() + diff.x;
    this.height = this.element.getHeight() + diff.y;
    
  },
  rotate: function(start, end){
    var el_pos = this.element.cumulativeOffset();
    var diff = { // +10 magic! (button is 20x20)
      x: end.x - (el_pos.left) + (this.element.getWidth()/2),
      y: end.y - (el_pos.top ) + (this.element.getHeight()/2)
    };
    
    var dist_from_center = {
      x: (this.element.getWidth()/2),
      y: (this.element.getHeight()/2)
    };
    
    var base_angle = (Math.atan2(dist_from_center.x,dist_from_center.y)*(180/Math.PI));
    var new_angle = (Math.atan2(diff.x,diff.y)*(180/Math.PI));
    
    console.log(start, end, diff, el_pos, dist_from_center)
    
    this.element.setStyle({
      "-webkit-transform":"RotateZ("+(new_angle)+"deg)"
    });
    
  },
  move: function(start, end){
    var offset = this.canvas.element.cumulativeOffset();
    var new_pos = {
      left: end.x - offset.left,
      top: end.y - offset.top
    }
    var offset_widget = this.element.cumulativeOffset();
    var offset_within = {
      left: start.x - offset_widget.left,
      top: start.y - offset_widget.top
    }

    new_pos.left -= offset_within.left;
    new_pos.top -= offset_within.top;
        
    if(new_pos.left <= 0 || new_pos.top <= 0 
      || new_pos.top + this.element.getHeight() > this.canvas.element.getHeight()
      || new_pos.left + this.element.getWidth() > this.canvas.element.getWidth()){
      return;
    }
    
    this.element.setStyle({
      left: new_pos.left + "px",
      top: new_pos.top + "px"
    });
  },
  openSettings: function(){
    if(this.settings_open){
      return;
    }
    this.settings_open = true;
    
    this.settings_panel.addClassName('open');
    this.settings_panel.setStyle({
      marginTop: (-1*(this.settings_panel.getHeight()/2)) + "px"
    })
    this.settings_panel.removeClassName('closed');
  },
  closeSettings: function(){
    if(!this.settings_open){
      return;
    }
    this.settings_open = false;
    
    this.settings_panel.removeClassName('open');
    this.settings_panel.addClassName('closed');
    
  }
  
});

var TextWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    this.text_el = new Element('h1');
    $super(canvas);
    this.element.insert(this.text_el);
    this.listen('height', (function(val){
        this.text_el.setStyle({
          fontSize: val + "px"
        });
    }))
  },
  generateProperties: function($super){
    $super();
    this.generateProperty("text", {
      set: function(y){
        this["_text"] = y;
        this.text_el.innerHTML = y;
      },
      "default": "Lorem Ipsum"
    });
    this.generateProperty("color", {
      set: function(y){
        this["_color"] = y;
        this.text_el.setStyle({
          color: y
        });
      },
      default: "rgb(100,100,100)"
    });
  },
  insertSettings: function($super){
    $super();
    this.insertSetting("text");
    this.insertSetting("color", {
      input: {
        type: "color",
        value: this["color"],
        "class": "color"
      }
    });
  }
});

var ImageWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    $super(canvas);
    this.image = new Element('img', {
      src: "/images/logo.png"
    });
    this.element.insert(this.image);
  }
});

var LinkWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    $super(canvas);
    this.link = new Element('h2', {
      href: 'http://taybenlor.com',
      "class": "link"
    });
    this.link.innerHTML = "to go";
    this.element.insert(this.link);
  }
});

var MusicWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    $super(canvas);
  }
});

var LocationWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    $super(canvas);
  }
});

var SharingWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    $super(canvas);
  }
});

//Singletons
var canvas;
var poster;
var toolbar;

function load_poster(data){
  console.log('loading...');
  window.canvas = new Canvas($('canvas'))
  window.poster = new Poster(canvas);
  window.toolbar = new Toolbar($('toolbar'), window.canvas, window.poster);
  
}


