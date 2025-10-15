/* scripts/helpers.js
   Utilities and storage handlers for Sticker Studio.
   Exposes window.App.Storage and utility helpers under window.App.Utils
*/

(function(){
  'use strict';
  window.App = window.App || {};

  // Simple UUID generator for object ids
  window.App.Utils = window.App.Utils || {};
  window.App.Utils.uid = function(prefix){
    prefix = prefix || 'id';
    return prefix + '_' + Math.random().toString(36).slice(2, 9);
  };

  window.App.Utils.clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };

  // Deep clone JSON-safe
  window.App.Utils.clone = function(obj){ return JSON.parse(JSON.stringify(obj)); };

  // Storage helper
  window.App.Storage = window.App.Storage || {};
  (function(ns){
    const KEY_SAVED = 'sticker_studio_saves_v1';
    const KEY_CURRENT = 'sticker_studio_current_v1';

    ns.loadSaves = function(){
      try {
        const raw = localStorage.getItem(KEY_SAVED) || '[]';
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to load saves', e);
        return [];
      }
    };

    ns.saveSaves = function(list){
      try { localStorage.setItem(KEY_SAVED, JSON.stringify(list)); } catch(e){ console.error('Failed to save saves', e); }
    };

    ns.saveCurrent = function(state){
      try { localStorage.setItem(KEY_CURRENT, JSON.stringify(state)); } catch(e){ console.error('Failed to save current', e); }
    };

    ns.loadCurrent = function(){
      try { return JSON.parse(localStorage.getItem(KEY_CURRENT) || 'null'); } catch(e){ return null; }
    };

    ns.clearCurrent = function(){ try { localStorage.removeItem(KEY_CURRENT); } catch(e){} };

  })(window.App.Storage);

  // File download helper
  window.App.Utils.downloadDataUrl = function(dataUrl, filename){
    try{
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename || 'sticker.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed', e);
    }
  };

})();
