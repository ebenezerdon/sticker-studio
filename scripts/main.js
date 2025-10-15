/* scripts/main.js
   Entry point. Initializes the app by calling App.init and App.render after validating contract.
*/

$(function(){
  try {
    const hasApp = !!window.App;
    const hasInit = hasApp && typeof window.App.init === 'function';
    const hasRender = hasApp && typeof window.App.render === 'function';
    // Only initialize the designer on pages that actually include the canvas element
    const hasCanvas = !!document.getElementById('designer-canvas');

    if (!hasApp || !hasInit || !hasRender) {
      const details = {
        hasApp,
        hasInit,
        hasRender,
        availableKeys: hasApp ? Object.keys(window.App || {}) : [],
        hint: 'Define in scripts/ui.js: window.App = window.App || {}; App.init = function(){}; App.render = function(){};'
      };
      console.error('[Contract] Missing App.init/App.render', details);
      return;
    }

    // If this page does not contain the designer canvas (e.g. the marketing index), skip initialization
    if (!hasCanvas) {
      return;
    }

    App.init();
    App.render();
  } catch (e) {
    console.error('Initialization failed', e);
  }
});
