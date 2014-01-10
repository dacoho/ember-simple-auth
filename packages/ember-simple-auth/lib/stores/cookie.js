'use strict';

/**
  Store that saves its data in session cookies.

  In order to keep multiple tabs/windows of your application in sync, this
  store has to periodically (every 500ms) check the cookies for changes as
  there are no events that notify of changes in cookies. As an alternative that
  works without such polling you might want to look at
  `Ember.SimpleAuth.Stores.LocalStorage` if you don't have to support older
  browsers that don't implement the `localStorage` API.

  This store will trigger the 'ember-simple-auth:session-updated' event when
  any of its cookies is changed from another tab or window.

  @class Cookie
  @namespace Ember.SimpleAuth.Stores
  @extends Ember.SimpleAuth.Stores.Base
  @constructor
*/
Ember.SimpleAuth.Stores.Cookie = Ember.SimpleAuth.Stores.Base.extend({
  /**
    The prefix to use for the store's cookie names so they can be distinguished
    from other cookies.

    @property cookieNamePrefix
    @type String
    @default 'ember_simple_auth:'
  */
  cookieNamePrefix: 'ember_simple_auth:',
  /**
    @property _secureCookies
    @type Boolean
    @default true if the application is served via HTTPS, false otherwise
    @private
  */
  _secureCookies:         window.location.protocol === 'https:',
  /**
    @property _syncPropertiesTimeout
    @type Number
    @default null
    @private
  */
  _syncPropertiesTimeout: null,

  /**
    @method
    @private
  */
  init: function() {
    this.syncProperties();
  },

  /**
    Persists the `properties` in session cookies.

    @method persist
    @param {Object} properties The properties to persist
  */
  persist: function(properties) {
    for (var property in properties) {
      this.write(property, properties[property], null);
    }
    this._lastProperties = JSON.stringify(this.restore());
  },

  /**
    Restores all properties currently saved in the session cookies identified
    by the `cookieNamePrefix`.

    @method restore
    @return {Object} All properties currently persisted in the session cookies
  */
  restore: function() {
    var _this      = this;
    var properties = {};
    this.knownCookies().forEach(function(cookie) {
      properties[cookie] = _this.read(cookie);
    });
    return properties;
  },

  /**
    Clears the store by deleting all session cookies prefixed with the
    `cookieNamePrefix`.

    @method clear
  */
  clear: function() {
    var _this = this;
    this.knownCookies().forEach(function(cookie) {
      _this.write(cookie, null, (new Date(0)).toGMTString());
    });
  },

  /**
    @method read
    @private
  */
  read: function(name) {
    var value = document.cookie.match(new RegExp(this.cookieNamePrefix + name + '=([^;]+)')) || [];
    return decodeURIComponent(value[1] || '');
  },

  /**
    @method write
    @private
  */
  write: function(name, value, expiration) {
    var expires = Ember.isEmpty(expiration) ? '' : '; expires=' + expiration;
    var secure  = !!this._secureCookies ? ';secure' : '';
    document.cookie = this.cookieNamePrefix + name + '=' + encodeURIComponent(value) + expires + secure;
  },

  /**
    @method knownCookies
    @private
  */
  knownCookies: function() {
    var _this = this;
    return Ember.A(document.cookie.split(/[=;\s]+/)).filter(function(element) {
      return new RegExp('^' + _this.cookieNamePrefix).test(element);
    }).map(function(cookie) {
      return cookie.replace(_this.cookieNamePrefix, '');
    });
  },

  /**
    @method syncProperties
    @private
  */
  syncProperties: function() {
    var properties        = this.restore();
    var encodedProperties = JSON.stringify(properties);
    if (encodedProperties !== this._lastProperties) {
      this._lastProperties = encodedProperties;
      this.trigger('ember-simple-auth:session-updated', properties);
    }
    if (!Ember.testing) {
      Ember.run.cancel(this._syncPropertiesTimeout);
      this._syncPropertiesTimeout = Ember.run.later(this, this.syncProperties, 500);
    }
  }
});
