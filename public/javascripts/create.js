var Poster = Class.create({
  initialize: function(canvas){
    this.widgets = $A();
    this.properties = $A();
    this.widgets_to_delete = $A();
    this.canvas = canvas;
    this.canvas.element.select('.spinner').each(function(el){el.remove()});
    
    $('save').observe('click', (function(event){
      this.save();
    }).bind(this));
    
    $('preview').observe('click', (function(event){
      window.open(window.location.origin + "/" + this.url)
    }).bind(this));
    
    $('url_field').observe('keypress', (function(event){
      $('url_check').addClassName('check');
      $('url_check').removeClassName('available');
      $('url_check').removeClassName('unavailable');
    }).bind(this));
    
    $('url_check').observe('click', (function(event){
      $('url_check').addClassName('spinner');
      new Ajax.Request('/posters/'+this.id+'/update_url', {
        method: "POST",
        parameters: {
          secret: this.secret,
          "poster[url]": $('url_field').value,
          id: this.id
        },
        onSuccess: (function(transport){
          $('url_check').removeClassName('check');
          $('url_check').removeClassName('unavailable');
          $('url_check').removeClassName('spinner');
          $('url_check').addClassName('available');
          this.load(transport.responseJSON);
          
        }).bind(this),
        onFailure: function(event){
          $('url_check').removeClassName('check');
          $('url_check').removeClassName('available');
          $('url_check').removeClassName('spinner');
          $('url_check').addClassName('unavailable');
        }
      });
    }).bind(this));
    
    this.generateProperty('background_colour_top', {"default": "000000"});
    this.generateProperty('background_colour_bottom', {"default": "000000"});
    this.generateProperty('background_image', {"default": null});
    
    this.listen('background_colour_top', this.backgroundChange);
    this.listen('background_colour_bottom', this.backgroundChange);
    this.listen('background_image', this.backgroundChange);
    
    $('background_image').observe('change', (function(){
      this.background_image = $('background_image').value;
    }).bind(this))
    
    $('top_colour').observe('change', (function(){
      this.background_colour_top = $('top_colour').value;
      this.background_colour_bottom = $('bottom_colour').value;
    }).bind(this))
    
    $('bottom_colour').observe('change', (function(){
      this.background_colour_top = $('top_colour').value;
      this.background_colour_bottom = $('bottom_colour').value;
    }).bind(this))
  },
  backgroundChange: function(){
    if(this.background_image){
      $('canvas').setStyle({
        background: "url(\"" + this.background_image + "\")"
      });
    }
    else{
      var top = $('top_colour').value[0] == "#" ? $('top_colour').value : "#" + $('top_colour').value;
      var bottom = $('bottom_colour').value[0] == "#" ? $('bottom_colour').value : "#" + $('bottom_colour').value;
      var webkit_style = new Template("-webkit-gradient(linear, left bottom, left top, color-stop(1, #{top}),color-stop(0, #{bottom}))");
      var moz_style = new Template("-moz-linear-gradient(center bottom, #{top} 100%, #{bottom} 0%);");
      
      $('canvas').setStyle({
        "background": webkit_style.evaluate({top:top, bottom:bottom})
      });
    }
  },
  generateProperty: function(name, options){
    options = options || {};
    this["_" + name] = options["default"] || 0;
    this["_" + name + "_listeners"] = $A([]);
    
    this.properties.push(name);
    
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
  load: function(data){
    if("poster" in data){
      this.fromJSON(data.poster);
    }
    this.loadWidgets();
  },
  loadWidgets: function(){
    new Ajax.Request("/widgets", {
      method: "GET",
      parameters: {
        "poster_id": this.id,
        "secret": this.secret
      },
      onSuccess: (function(transport){
        var widgets = transport.responseJSON;
        widgets.each((function(widget_json){
          console.log(widget_json);
          var w = null;
          if("image_widget" in widget_json){
            w = new ImageWidget(this);
            w.load(widget_json.image_widget);
          }
          if("location_widget" in widget_json){
            w = new LocationWidget(this);
            w.load(widget_json.location_widget);
          }
          if("music_widget" in widget_json){
            w = new MusicWidget(this, true);
            w.load(widget_json.music_widget);
          }
          if("share_widget" in widget_json){
            w = new ShareWidget(this);
            w.load(widget_json.share_widget);
          }
          if("text_widget" in widget_json){
            w = new TextWidget(this);
            w.load(widget_json.text_widget);
          }
          if(w){
            this.add(w);
          }
          
        }).bind(this));
        console.log(json);
      }).bind(this),
      onFailure: function(){
        alert("Oh fuck, you're going to have to refresh");
      }
    });
  },
  save: function(){
    $('save').addClassName("spinner");
    
    /*
     * Use local storagey stuff. Need to clean this up.
     */
    var posters = null;
    if(window.localStorage["nupose"]){
      posters = JSON.parse(window.localStorage["nupose"]);
    }else{
      posters = [];
    }
    posters.push(this.id);
    window.localStorage["nupose"] = JSON.stringify(posters);
    window.localStorage[this.id] = this.toJSON();
    
    var params = {};
    params["secret"] = this.secret;
    
    $H(JSON.parse(this.toJSON())).each(function(thing){
      params["poster["+thing.key+"]"] = thing.value;
    });
    
    new Ajax.Request("/posters/"+this.id, {
      method: "PUT",
      parameters: params,
      onSuccess: (function(){
        this.saveWidgets();
      }).bind(this),
      onFailure: function(){
        alert("FAILURz IN TEH POSTER SAVING");
      }
    });
    
  },
  saveWidgets: function(){
    console.log('saving time');
    this.saving_count = this.widgets.length + this.widgets_to_delete.length;
    
    /*
     * Save each widget
     */
    this.widgets.each((function(widget){
      var widget_data = widget.save();
      widget_data["poster_id"] = this.id;
      var params = {};
      params["secret"] = this.secret;
      
      $H(widget_data).each(function(thing){
        params["widget["+thing.key+"]"] = thing.value;
      }); ///arrrgggh disgusting hack for RAILS forms. I should just use json (I'm an idiot)
      var method = "POST";
      var url = "/widgets";
      if(widget_data.id){
        method = "PUT";
        url = "/widgets/" + widget_data.id;
      }
      
      new Ajax.Request(url, {
        method: method,
        parameters: params,
        onSuccess: (function(transport){
          var widget_json = transport.responseJSON;

          if("image_widget" in widget_json){
            widget.load(widget_json.image_widget);
          }
          if("location_widget" in widget_json){
            widget.load(widget_json.location_widget);
          }
          if("music_widget" in widget_json){
            widget.load(widget_json.music_widget);
          }
          if("share_widget" in widget_json){
            widget.load(widget_json.share_widget);
          }
          if("text_widget" in widget_json){
            widget.load(widget_json.text_widget);
          }

          this.savedOne();
        }).bind(this),
        onFailure: (function(){
          alert("OH NO. Failure. I did not count on this. You're going to need to refresh");
        })
      });
    }).bind(this));
    
    this.widgets_to_delete.each((function(id){
      if(id == 0){
        this.savedOne();
        return;
      }
      new Ajax.Request("/widgets/" + id, {
        method: "DELETE",
        parameters: {
          "poster_id": this.id,
          "secret": this.secret
        },
        onSuccess: (function(transport){
          this.savedOne();
        }).bind(this),
        onFailure: (function(){
          alert("Yeah, it broke while deleting something. Sorry. You'll need to refresh.");
        })
      })
    }).bind(this))
  },
  savedOne: function(){
    this.saving_count--;
    console.log('saved one');
    if(this.saving_count == 0){
      $('save').removeClassName("spinner");
      this.widgets_to_delete = $A();
      //we're done!
      console.log('finished saving');
    }
  },
  fromJSON: function(json){
    $A(["id", "url", "secret", "email", "background_colour_bottom", "background_colour_top", "background_image"]).each((function(prop){
      this[prop] = json[prop];
    }).bind(this));
  },
  toJSON: function(){
    var obj = {};
    $A(["id", "url","secret","email", "background_colour_bottom", "background_colour_top", "background_image"]).each((function(prop){
      obj[prop] = this[prop];
    }).bind(this));
    return JSON.stringify(obj);
  },
  add: function(widget){
    this.widgets.push(widget);
  },
  remove: function(widget){
    this.widgets_to_delete.push(widget.id);
    this.widgets = this.widgets.without(widget);
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


/* Widget - A manipulatible document chunk
 * Organises all common manipulations, backend details and properties.
 * Eg. Height, Width, Left, Right, Controls for these etc
 */
var Widget = Class.create({
  initialize: function(poster){
    this.type = "Widget";
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
    
    /*
    * Let's leave out the rotation control for this version.
    this.rotate_control = new Element('button', {
      "class":"rotate"
    });
    this.controls.insert(this.rotate_control);
    */
    
    this.settings_control = new Element('button',{
      "class":"settings"
    });
    this.controls.insert(this.settings_control);
    this.element.insert(this.controls);
    
    this.properties = $A();
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
    
    this.insertSetting('opacity');
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
    return field;
  },
  generateProperties:function(){
    this.generateProperty('id', {
      set: (function(y){
        this["_id"] = y;
      }).bind(this)
    });
    
    this.generateProperty('height');
    this.generateProperty('width');
    this.generateProperty('left');
    this.generateProperty('top');
    
    this.generateProperty('opacity', {
      set: (function(y){
        this["_opacity"] = y;
        this.element.setStyle({
          opacity: y
        });
      }).bind(this),
      "default": 1
    });
    
    this.generateProperty('zOrder', {
      set: function(y){
        this["_zOrder"] = y;
        this.element.setStyle({
          zIndex: y
        });
      },
      "default": 100
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
    
    this.properties.push(name);
    
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
  save: function(){
    var json = this.toJSON();
    var output = {
      id: this.id,
      style: this.getStyle(),
      data: json,
      version: 1.0,
      width: this.width,
      height: this.height,
      left: this.left,
      top: this.top,
      address: this.address,
      track_id: this.track,
      url: this.url,
      text: this.text,
      type: this.type
    };
    return output;
  },
  load: function(json){
    this.fromJSON(json.data);
    this.id = json.id;
  },
  fromJSON: function(json){
    $H(JSON.parse(json)).each((function(thing){
      this[thing.key] = thing.value;
    }).bind(this));
  },
  toJSON: function(){
    var obj = {};
    this.properties.each((function(name){
      obj[name] = this[name]
    }).bind(this));
    return JSON.stringify(obj);
  },
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
  /*
   * So apparently I can write all of this ^^^ and that vvvv but am unable
   * to correctly perform simple trigonometry. I give up.
   *
   */
  rotate: function(start, end){
    var el_pos = this.element.cumulativeOffset();
    
    var diff = { // +10 magic! (button is 20x20)
      x: end.x - (el_pos.left) + (this.element.getWidth()/2),
      y: end.y - (el_pos.top ) + (this.element.getHeight()/2)
    };

    var base_angle = (Math.atan2(this.element.getHeight()/2,this.element.getWidth()/2)/Math.PI)*180;
    var new_angle = (Math.atan2(diff.y,diff.x)/Math.PI)*180;
    
    new_angle -= base_angle;
    
    this.element.setStyle({
      "-webkit-transform":"rotate("+(new_angle)+"deg)",
      "-moz-transform":"rotate("+(new_angle)+"deg)"
    });
    
    this.settings_panel.setStyle({
      "-webkit-transform":"rotate("+(-1*new_angle)+"deg)",
      "-moz-transform":"rotate("+(-1*new_angle)+"deg)"
    })
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
    
    this.left = new_pos.left;
    this.top = new_pos.top;

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
    this.type = "TextWidget"
    this.element.insert(this.text_el);
    this.listen('height', (function(val){
        this.element.setStyle({
          fontSize: val + "px"
        });
    }));
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
        this.element.setStyle({
          color: y
        });
      },
      "default": "rgb(100,100,100)"
    });
  },
  insertSettings: function($super){
    $super();
    this.insertSetting("text");
    var input = this.insertSetting("color", {
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
    this.type = "ImageWidget";
    this.image = new Element('img', {
      src: "/images/default.png"
    });
    this.element.insert(this.image);
    this.listen('url', function(val){
        this.image.setAttribute('src', val);
    });
  },
  generateProperties: function($super){
    $super();
    this.generateProperty("url", {
      set: function(y){
        this["_url"] = y;
      },
      "default": "/images/default.png"
    });
  },
  insertSettings: function($super){
    $super();
    this.insertSetting("url");
  }
});

var LinkWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    this.link = new Element('a', {
      href: 'http://nupose.com',
      "class": "link",
      "style": "color: inherit"
    });
    this.link.innerHTML = "Lorem Hyperlink";
    
    $super(canvas);
    this.type = "LinkWidget";
    
    this.element.insert(this.link);
    this.listen('height', (function(val){
        this.element.setStyle({
          fontSize: val + "px"
        });
    }));
  },
  generateProperties: function($super){
    $super();
    this.generateProperty("text", {
      set: function(y){
        this["_text"] = y;
        this.link.innerHTML = y;
      },
      "default": "Lorem Hyperlink"
    });
    this.generateProperty("url", {
      set: function(y){
        this["_url"] = y;
        this.link.setAttribute('href', y);
      },
      "default": "http://nupose.com"
    });
    this.generateProperty("color", {
      set: function(y){
        this["_color"] = y;
        this.element.setStyle({
          color: y
        });
      },
      "default": "rgb(0,200,200)"
    });
  },
  insertSettings: function($super){
    $super();
    this.insertSetting("text");
    this.insertSetting("url");
    var input = this.insertSetting("color", {
      input: {
        type: "color",
        value: this["color"],
        "class": "color"
      }
    });
  }
});

var MusicWidget = Class.create(Widget, {
  initialize: function($super, canvas, force){
    $super(canvas);
    this.type = "MusicWidget";
    
    this.selector = new Element("div", {
      "class": "modal closed"
    });
    $(document.body).insert({top: this.selector});
    
    //Music widget needs larger default width and height
    this.height = 80;
    this.width = 400;
    
    //Can't rotate a flash object
    if(this.rotate_control){
      this.rotate_control.remove();
    }
    
    if(!force){
      this.element.setStyle({
        display: "none"
      });
      this.openSelector();
    }
  },
  generateProperties: function($super){
    $super();
    this.generateProperty('track', {
      set: function(y){
        this["_track"] = y;
        this.element.select(".track").each(function(el){
          el.remove();
        });
        
        new Ajax.Updater({success: this.element}, '/tracks/'+y, {
          insertion: "bottom",
          method: "GET"
        });
      },
      "default": 0
    })
  },
  insertSettings: function($super){
    $super();
    
    var choose_wrap = new Element('li');
    var choose = new Element('button');
    choose_wrap.insert(choose);
    choose.innerHTML = "Change Song";
    this.settings_panel.insert(choose);
    choose.observe('click', (function(){
      this.openSelector();
    }).bind(this));
  },
  openSelector: function($super){
    if(this.selector_open){
      return;
    }
    this.selector_open = true;
    
    this.selector.insert("<div class=\"spinner\"></div>");
    
    /*
     * 2am post-drinking code. Kind of hacky. Refactor to move the event listener stuff out.
     * Though this way is fine because the elements are replaced every time you select a track.
     */
    new Ajax.Updater(this.selector, '/tracks', {
      onComplete: (function(){
        var button = this.selector.select('button').first();

        button.observe('click', (function(event){
          var track = this.selector.select('.selected').first().readAttribute('data-track-id');
          this.track = track;
          this.closeSelector();
          event.stop();
        }).bindAsEventListener(this));

        var tracks_el = this.selector.select('ul').first();
        tracks_el.observe('click', (function(event){
          tracks_el.select('li').each(function(el){
            el.removeClassName('selected');
          });
          var el = event.findElement();
          el.addClassName('selected');
          event.stop();
        }).bindAsEventListener(this));
      }).bind(this),
      onFailure: (function(){
        this.closeSelector();
      }).bind(this),
      method: "GET"
    });
    
    this.selector.removeClassName('closed');
    this.selector.addClassName('open');
  },
  closeSelector: function($super){
    if(!this.selector_open){
      return;
    }
    this.selector.removeClassName('open');
    this.selector.addClassName('closed');
    this.element.setStyle({
      display: ""
    });
    this.selector_open = false;
  }
});

var LocationWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    $super(canvas);
    this.type = "LocationWidget";
  }
});

var ShareWidget = Class.create(Widget, {
  initialize: function($super, canvas){
    $super(canvas);
    this.type = "ShareWidget";
    
    this.facebook_button = new Element("a", {
      name: "fb_share"
    });
    
    this.element.insert(this.facebook_button)


    this.twitter_button = new Element("a", {
      href: "http://twitter.com/share",
      "data-count": "none",
      "class": "twitter-share-button"
    });
    this.twitter_button.innerHTML = "Tweet";
    
    this.element.insert("<div style=\"margin: 10px\"></div>"); //lol naughty ben
    this.element.insert(this.twitter_button);
    
      $(document.body).insert(new Element("script",{
      src:"http://static.ak.fbcdn.net/connect.php/js/FB.Share"
    }));
    $(document.body).insert(new Element("script",{
      src:"http://platform.twitter.com/widgets.js"
    }));
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
  window.poster.load(data);
  window.toolbar = new Toolbar($('toolbar'), window.canvas, window.poster);
}

function sc_connected(params){
  $('sc-connect').addClassName('connected');
}


