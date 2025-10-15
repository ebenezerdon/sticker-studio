/* scripts/ui.js
   Core application logic: canvas state, rendering, and UI glue.
   This module defines window.App with App.init and App.render to satisfy the contract.
*/

(function(){
  'use strict';
  window.App = window.App || {};

  // Application state
  App.state = App.state || {
    canvas: { w: 800, h: 800 },
    objects: [],
    selectedId: null,
    nextId: 1,
    pointer: { down: false, startX: 0, startY: 0, mode: null },
    bg: '#ffffff'
  };

  // Default templates
  App.templates = {
    roundBadge: {
      objects: [
        { id: 't1', type: 'circle', x: 400, y: 360, r: 220, fill: '#FFEDD5', stroke: '#FB5607', strokeWidth: 6, opacity: 1 },
        { id: 't2', type: 'text', x: 400, y: 360, text: 'HELLO', fontSize: 56, fontFamily: 'Helvetica', bold: true, fill: '#111827' }
      ]
    }
  };

  // Helpers internal
  function findById(id){ return App.state.objects.find(o=>o.id===id) || null; }
  function indexOfId(id){ return App.state.objects.findIndex(o=>o.id===id); }

  // Create default objects
  App.createShape = function(type, opts){
    const uid = window.App.Utils.uid('obj');
    const base = { id: uid, type: type, x: 400, y: 400, fill: '#FF6B6B', stroke: '#0f172a', strokeWidth: 2, opacity: 1 };
    if(type === 'rect') { Object.assign(base, { w: 200, h: 120 }); }
    if(type === 'circle') { Object.assign(base, { r: 90 }); }
    if(type === 'triangle') { Object.assign(base, { w: 180, h: 160 }); }
    if(type === 'star') { Object.assign(base, { r: 90, points: 5 }); }
    if(type === 'text') { Object.assign(base, { text: 'New Text', fontSize: 28, fontFamily: 'Arial', bold: false }); }
    if(type === 'image') { Object.assign(base, { w: 200, h: 140, src: opts && opts.src || null }); }
    if(opts) Object.assign(base, opts);

    App.state.objects.push(base);
    App.state.selectedId = base.id;
    App.saveCurrent();
    return base;
  };

  // Remove selected
  App.deleteSelected = function(){
    const id = App.state.selectedId;
    if(!id) return;
    const idx = indexOfId(id);
    if(idx >= 0){ App.state.objects.splice(idx,1); App.state.selectedId = null; App.saveCurrent(); }
  };

  // Bring selected to front
  App.bringToFront = function(){
    const id = App.state.selectedId; if(!id) return;
    const idx = indexOfId(id); if(idx<0) return;
    const obj = App.state.objects.splice(idx,1)[0]; App.state.objects.push(obj); App.saveCurrent();
  };

  // Save current state via storage helper
  App.saveCurrent = function(){
    try { window.App.Storage.saveCurrent({ objects: window.App.Utils.clone(App.state.objects) }); } catch(e){ console.error(e); }
    App.renderSavesList();
  };

  App.clearAll = function(){ App.state.objects = []; App.state.selectedId = null; window.App.Storage.clearCurrent(); App.render(); };

  // Load a saved design
  App.loadDesign = function(design){
    if(!design || !design.objects) return;
    App.state.objects = window.App.Utils.clone(design.objects);
    App.state.selectedId = null;
    App.saveCurrent();
    App.render();
  };

  // Draw helper: draws current objects to given canvas context
  App.drawToContext = function(ctx, w, h, objs){
    // clear
    ctx.clearRect(0,0,w,h);
    // white background
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);

    // draw each object
    objs.forEach(obj => {
      ctx.save();
      ctx.globalAlpha = (typeof obj.opacity === 'number') ? obj.opacity : 1;
      if(obj.type === 'rect'){
        ctx.fillStyle = obj.fill || '#FF6B6B';
        ctx.strokeStyle = obj.stroke || '#000';
        ctx.lineWidth = obj.strokeWidth || 0;
        ctx.beginPath();
        ctx.rect(Math.round(obj.x - (obj.w/2)), Math.round(obj.y - (obj.h/2)), Math.round(obj.w), Math.round(obj.h));
        ctx.fill();
        if(ctx.lineWidth>0) ctx.stroke();
      } else if(obj.type === 'circle'){
        ctx.fillStyle = obj.fill || '#FF6B6B';
        ctx.strokeStyle = obj.stroke || '#000';
        ctx.lineWidth = obj.strokeWidth || 0;
        ctx.beginPath();
        ctx.arc(Math.round(obj.x), Math.round(obj.y), Math.round(obj.r), 0, Math.PI*2);
        ctx.fill(); if(ctx.lineWidth>0) ctx.stroke();
      } else if(obj.type === 'triangle'){
        ctx.fillStyle = obj.fill || '#FF6B6B'; ctx.strokeStyle = obj.stroke || '#000'; ctx.lineWidth = obj.strokeWidth||0;
        const h = obj.h, w2 = obj.w/2;
        ctx.beginPath(); ctx.moveTo(obj.x, obj.y - h/2); ctx.lineTo(obj.x - w2, obj.y + h/2); ctx.lineTo(obj.x + w2, obj.y + h/2); ctx.closePath(); ctx.fill(); if(ctx.lineWidth>0) ctx.stroke();
      } else if(obj.type === 'star'){
        ctx.fillStyle = obj.fill || '#FF6B6B'; ctx.strokeStyle = obj.stroke || '#000'; ctx.lineWidth = obj.strokeWidth||0;
        const cx = obj.x, cy = obj.y, r = obj.r || 60, spikes = obj.points || 5;
        const outer = r, inner = r/2.5;
        ctx.beginPath();
        for(let i=0;i<spikes;i++){ const a = i * Math.PI * 2 / spikes - Math.PI/2; const ax = cx + Math.cos(a) * outer; const ay = cy + Math.sin(a) * outer; ctx.lineTo(ax, ay); const a2 = a + Math.PI/spikes; const bx = cx + Math.cos(a2) * inner; const by = cy + Math.sin(a2) * inner; ctx.lineTo(bx, by); }
        ctx.closePath(); ctx.fill(); if(ctx.lineWidth>0) ctx.stroke();
      } else if(obj.type === 'text'){
        ctx.fillStyle = obj.fill || '#111827'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let fs = (obj.fontSize || 28); ctx.font = (obj.bold ? '700 ' : '400 ') + fs + 'px ' + (obj.fontFamily || 'Arial');
        // wrap text if multiple lines
        const lines = (obj.text || '').split('\n');
        const lineHeight = fs * 1.15;
        const startY = obj.y - (lines.length-1) * lineHeight / 2;
        lines.forEach((ln, i) => ctx.fillText(ln, obj.x, startY + i * lineHeight));
      } else if(obj.type === 'image'){
        if(obj._img instanceof HTMLImageElement && obj._img.complete){
          ctx.drawImage(obj._img, Math.round(obj.x - obj.w/2), Math.round(obj.y - obj.h/2), Math.round(obj.w), Math.round(obj.h));
        }
      }
      ctx.restore();
    });
  };

  // Render function for on-screen canvas
  App.render = function(){
    try{
      const canvas = document.getElementById('designer-canvas');
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = App.state.canvas.w; const h = App.state.canvas.h;
      // Ensure backing store matches design pixels
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.maxWidth = '100%';
      ctx.setTransform(dpr,0,0,dpr,0,0);

      App.drawToContext(ctx, w, h, App.state.objects);

      // Draw selection overlay
      if(App.state.selectedId){
        const sel = findById(App.state.selectedId);
        if(sel){
          ctx.save(); ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2; ctx.setLineDash([6,6]);
          if(sel.type === 'rect'){
            ctx.strokeRect(sel.x - sel.w/2, sel.y - sel.h/2, sel.w, sel.h);
            // corner handle
            drawHandle(ctx, sel.x + sel.w/2, sel.y + sel.h/2);
          } else if(sel.type === 'circle'){
            ctx.beginPath(); ctx.arc(sel.x, sel.y, sel.r + 6, 0, Math.PI*2); ctx.stroke(); drawHandle(ctx, sel.x + sel.r, sel.y + sel.r);
          } else if(sel.type === 'triangle'){
            ctx.beginPath(); ctx.moveTo(sel.x, sel.y - sel.h/2); ctx.lineTo(sel.x - sel.w/2, sel.y + sel.h/2); ctx.lineTo(sel.x + sel.w/2, sel.y + sel.h/2); ctx.closePath(); ctx.stroke(); drawHandle(ctx, sel.x + sel.w/2, sel.y + sel.h/2);
          } else if(sel.type === 'star'){
            ctx.beginPath(); ctx.arc(sel.x, sel.y, sel.r + 6, 0, Math.PI*2); ctx.stroke(); drawHandle(ctx, sel.x + sel.r, sel.y + sel.r);
          } else if(sel.type === 'text'){
            const wApprox = (sel.text || '').length * (sel.fontSize||28) * 0.5; const hApprox = (sel.fontSize||28) * 1.3;
            ctx.strokeRect(sel.x - wApprox/2 - 8, sel.y - hApprox/2 - 8, wApprox + 16, hApprox + 16); drawHandle(ctx, sel.x + wApprox/2 + 8, sel.y + hApprox/2 + 8);
          } else if(sel.type === 'image'){
            ctx.strokeRect(sel.x - sel.w/2, sel.y - sel.h/2, sel.w, sel.h); drawHandle(ctx, sel.x + sel.w/2, sel.y + sel.h/2);
          }
          ctx.restore();
        }
      }

      // Update selected info UI
      const selInfo = document.getElementById('selected-info');
      selInfo.textContent = App.state.selectedId ? (findById(App.state.selectedId).type || '') : 'None';
      updateFloatingDeleteButton();
    } catch(e){ console.error('Render failed', e); }
  };


  // Position and visibility helper for the floating delete button
  function updateFloatingDeleteButton(){
    try{
      const btn = document.getElementById('btn-delete-float');
      if(!btn) return;
      const canvas = document.getElementById('designer-canvas');
      if(!canvas){ btn.classList.add('hidden'); return; }
      const selId = App.state.selectedId;
      if(!selId){ btn.classList.add('hidden'); return; }
      const sel = findById(selId);
      if(!sel){ btn.classList.add('hidden'); return; }

      // Determine handle point in design coordinates (same logic as drawing the handle)
      let hx = sel.x, hy = sel.y;
      if(sel.type === 'rect' || sel.type === 'image'){ hx = sel.x + (sel.w||0)/2; hy = sel.y + (sel.h||0)/2; }
      else if(sel.type === 'circle' || sel.type === 'star'){ hx = sel.x + (sel.r||0); hy = sel.y + (sel.r||0); }
      else if(sel.type === 'triangle'){ hx = sel.x + (sel.w||0)/2; hy = sel.y + (sel.h||0)/2; }
      else if(sel.type === 'text'){ const wApprox = (sel.text || '').length * (sel.fontSize||28) * 0.5; const hApprox = (sel.fontSize||28) * 1.3; hx = sel.x + wApprox/2 + 8; hy = sel.y + hApprox/2 + 8; }

      // Map design coordinates to client coordinates relative to the canvas parent (the .relative container)
      const canvasRect = canvas.getBoundingClientRect();
      const parentRect = canvas.parentElement.getBoundingClientRect();
      const designW = App.state.canvas.w || canvas.width || 800;
      const designH = App.state.canvas.h || canvas.height || 800;
      const clientX = canvasRect.left + (hx / designW) * canvasRect.width;
      const clientY = canvasRect.top + (hy / designH) * canvasRect.height;

      // Position slightly offset to the right and above the handle point
      const offsetX = 8; // px to the right
      const offsetY = -18; // px above
      const relLeft = Math.round(clientX - parentRect.left + offsetX);
      const relTop = Math.round(clientY - parentRect.top + offsetY);

      btn.style.left = relLeft + 'px';
      btn.style.top = relTop + 'px';
      btn.classList.remove('hidden');
    } catch(e){
      // On any error, hide button to avoid broken UI
      try{ document.getElementById('btn-delete-float')?.classList.add('hidden'); }catch(_){}
    }
  }
  function drawHandle(ctx, x, y){ ctx.save(); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4f46e5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.rect(x-8, y-8, 16, 16); ctx.fill(); ctx.stroke(); ctx.restore(); }

  // Hit test: return top-most object under point
  App.hitTest = function(x,y){
    for(let i = App.state.objects.length-1; i>=0; i--){ const o = App.state.objects[i]; if(hitObject(o,x,y)) return o; }
    return null;
  };

  function hitObject(o, x, y){
    if(o.type === 'rect'){
      return (x >= o.x - o.w/2 && x <= o.x + o.w/2 && y >= o.y - o.h/2 && y <= o.y + o.h/2);
    } else if(o.type === 'circle' || o.type === 'star'){
      const dx = x - o.x, dy = y - o.y; return dx*dx + dy*dy <= (o.r||0)*(o.r||0);
    } else if(o.type === 'triangle'){
      // barycentric approx: bounding box test then point in triangle
      const x1 = o.x, y1 = o.y - o.h/2; const x2 = o.x - o.w/2, y2 = o.y + o.h/2; const x3 = o.x + o.w/2, y3 = o.y + o.h/2;
      return pointInTriangle({x,y},{x:x1,y:y1},{x:x2,y:y2},{x:x3,y:y3});
    } else if(o.type === 'text'){
      const wApprox = (o.text || '').length * (o.fontSize||28) * 0.5; const hApprox = (o.fontSize||28) * 1.3; return (x >= o.x - wApprox/2 - 8 && x <= o.x + wApprox/2 + 8 && y >= o.y - hApprox/2 - 8 && y <= o.y + hApprox/2 + 8);
    } else if(o.type === 'image'){
      return (x >= o.x - o.w/2 && x <= o.x + o.w/2 && y >= o.y - o.h/2 && y <= o.y + o.h/2);
    }
    return false;
  }

  function pointInTriangle(p, a, b, c){
    const area = 0.5 *(-b.y*c.x + a.y*(-b.x + c.x) + a.x*(b.y - c.y) + b.x*c.y);
    const s = 1/(2*area)*(a.y*c.x - a.x*c.y + (c.y - a.y)*p.x + (a.x - c.x)*p.y);
    const t = 1/(2*area)*(a.x*b.y - a.y*b.x + (a.y - b.y)*p.x + (b.x - a.x)*p.y);
    return s>0 && t>0 && (s+t)<1;
  }

  // Export
  App.exportPNG = function(filename){
    filename = filename || 'sticker.png';
    const w = App.state.canvas.w, h = App.state.canvas.h; const dpr = Math.max(1, window.devicePixelRatio || 1);
    const off = document.createElement('canvas'); off.width = w * dpr; off.height = h * dpr; const ctx = off.getContext('2d'); ctx.scale(dpr, dpr);
    App.drawToContext(ctx, w, h, App.state.objects);
    try{
      const data = off.toDataURL('image/png'); window.App.Utils.downloadDataUrl(data, filename);
    } catch(e){ console.error('Export failed', e); }
  };

  // UI wiring and event handling
  App.init = function(){
    // Wire tool buttons
    $('#app-ready'); // noop to ensure jQuery is loaded in this scope

    $('.tool').on('click', function(){
      const t = $(this).data('tool');
      if(t === 'image'){
        // allow user to pick an image file from their device
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.onchange = function(e){
          const file = input.files && input.files[0];
          if(!file) return;
          const reader = new FileReader();
          reader.onload = function(ev){
            const dataUrl = ev.target.result;
            // create the image object in state; will be updated when the image loads

            const obj = App.createShape('image', { src: dataUrl, w: 240, h: 160 });
            const img = new Image();
            // data URLs are same-origin so no crossOrigin needed
            img.onload = function(){
              // preserve aspect ratio and fit to default width
              const maxW = 240;
              const naturalW = img.naturalWidth || maxW;
              const naturalH = img.naturalHeight || (naturalW);
              const ratio = naturalW / naturalH || 1;
              obj.w = Math.min(maxW, naturalW);
              obj.h = Math.round(obj.w / ratio);
              obj._img = img;
              App.saveCurrent();
              App.render();
            };
            img.onerror = function(){
              alert('Image failed to load.');
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
          // cleanup the temporary input element after use
          document.body.removeChild(input);
        };
        document.body.appendChild(input);
        input.click();
      } else if (t === 'delete'){
        App.deleteSelected();
        App.render();
      } else {
        App.createShape(t);
        App.render();
      }
    });

    $('#color-fill').on('input change', function(){ const v = $(this).val(); const sel = findById(App.state.selectedId); if(sel){ sel.fill = v; App.saveCurrent(); App.render(); } });
    $('#color-stroke').on('input change', function(){ const v = $(this).val(); const sel = findById(App.state.selectedId); if(sel){ sel.stroke = v; App.saveCurrent(); App.render(); } });
    $('#stroke-width').on('input change', function(){ const v = Number($(this).val()); const sel = findById(App.state.selectedId); if(sel){ sel.strokeWidth = v; App.saveCurrent(); App.render(); } });
    $('#opacity').on('input change', function(){ const v = Number($(this).val()); const sel = findById(App.state.selectedId); if(sel){ sel.opacity = v; App.saveCurrent(); App.render(); } });
    $('#font-size').on('input change', function(){ const v = Number($(this).val()); const sel = findById(App.state.selectedId); if(sel && sel.type === 'text'){ sel.fontSize = v; App.saveCurrent(); App.render(); } });
    $('#font-family').on('change', function(){ const v = $(this).val(); const sel = findById(App.state.selectedId); if(sel && sel.type === 'text'){ sel.fontFamily = v; App.saveCurrent(); App.render(); } });
    $('#bold-toggle').on('change', function(){ const v = $(this).prop('checked'); const sel = findById(App.state.selectedId); if(sel && sel.type === 'text'){ sel.bold = !!v; App.saveCurrent(); App.render(); } });
    $('#btn-delete').on('click', function(){ App.deleteSelected(); App.render(); });

    // Keyboard delete: allow Delete/Backspace to remove selected object when not typing
    // Floating delete button (click proxied to same delete behavior)
    $('#btn-delete-float').on('click', function(){ App.deleteSelected(); App.render(); });
    $(document).on('keydown', function(e){
      try {
        const activeEl = document.activeElement;
        const tag = activeEl && activeEl.tagName;
        const isEditable = activeEl && (activeEl.isContentEditable || /INPUT|TEXTAREA|SELECT/i.test(tag));
        if(isEditable) return;
        const key = e.key || '';
        const code = e.which || e.keyCode || 0;
        if(key === 'Delete' || key === 'Backspace' || code === 46 || code === 8){
          if(App.state.selectedId){
            e.preventDefault();
            App.deleteSelected();
            App.render();
          }
        }
      } catch (err) {
        // swallow errors to avoid breaking other handlers
        console.error('Key delete handler error', err);
      }
    });
    $('#btn-bring-front').on('click', function(){ App.bringToFront(); App.render(); });
    $('#btn-clear').on('click', function(){ if(confirm('Start a new design? Unsaved changes will be lost.')){ App.clearAll(); } });
    $('#btn-save').on('click', function(){ const name = ($('#save-name').val() || '').trim(); if(!name){ alert('Please enter a save name.'); return; } const saves = window.App.Storage.loadSaves(); saves.push({ name: name, objects: window.App.Utils.clone(App.state.objects), created: Date.now() }); window.App.Storage.saveSaves(saves); App.renderSavesList(); alert('Saved locally.'); });
    $('#btn-export, #btn-export-small').on('click', function(){ App.exportPNG('sticker.png'); });

    // Save name list actions
    $('#saves-list').on('click', '.load-save', function(){ const idx = $(this).data('idx'); const saves = window.App.Storage.loadSaves(); if(saves[idx]){ if(confirm('Load this design? Current design will be replaced.')){ App.loadDesign(saves[idx]); } } });
    $('#saves-list').on('click', '.delete-save', function(e){ e.stopPropagation(); const idx = $(this).data('idx'); const saves = window.App.Storage.loadSaves(); if(saves[idx] && confirm('Delete save?')){ saves.splice(idx,1); window.App.Storage.saveSaves(saves); App.renderSavesList(); } });

    // Canvas interactions
    const $canvas = $('#designer-canvas'); const canvas = $canvas.get(0); const ctx = canvas.getContext('2d');

    function getCanvasPoint(ev){
      const rect = canvas.getBoundingClientRect();
      const clientX = ev.clientX !== undefined ? ev.clientX : (ev.touches && ev.touches[0] && ev.touches[0].clientX) || 0;
      const clientY = ev.clientY !== undefined ? ev.clientY : (ev.touches && ev.touches[0] && ev.touches[0].clientY) || 0;
      const x = (clientX - rect.left) * (canvas.width / rect.width) / (window.devicePixelRatio || 1);
      const y = (clientY - rect.top) * (canvas.height / rect.height) / (window.devicePixelRatio || 1);
      return { x: x, y: y };
    }

    let dragOffset = { x: 0, y: 0 };
    let resizing = false;

    $canvas.on('mousedown touchstart', function(e){ e.preventDefault(); const p = getCanvasPoint(e.originalEvent); App.state.pointer.down = true; App.state.pointer.startX = p.x; App.state.pointer.startY = p.y; const hit = App.hitTest(p.x, p.y);
      if(hit){ App.state.selectedId = hit.id; // detect corner handle (simple distance test)
        const sel = hit; const dx = p.x - sel.x; const dy = p.y - sel.y;
        // check lower-right handle area
        if(isOverHandle(sel, p.x, p.y)){
          resizing = true; App.state.pointer.mode = 'resize';
        } else {
          App.state.pointer.mode = 'move'; dragOffset.x = p.x - sel.x; dragOffset.y = p.y - sel.y;
        }
        $('#text-editor').hide();
        App.render();
      } else {
        App.state.selectedId = null; App.render();
      }
    });

    $(document).on('mousemove touchmove', function(e){ if(!App.state.pointer.down) return; const p = getCanvasPoint(e.originalEvent);
      if(App.state.pointer.mode === 'move' && App.state.selectedId){ const sel = findById(App.state.selectedId); sel.x = p.x - dragOffset.x; sel.y = p.y - dragOffset.y; App.render(); }
      if(App.state.pointer.mode === 'resize' && App.state.selectedId){ const sel = findById(App.state.selectedId); const dx = p.x - sel.x; const dy = p.y - sel.y; if(sel.type === 'rect' || sel.type === 'image'){ sel.w = Math.max(20, Math.abs(dx)*2); sel.h = Math.max(20, Math.abs(dy)*2); } else if(sel.type === 'circle' || sel.type === 'star'){ sel.r = Math.max(6, Math.sqrt(dx*dx + dy*dy)); } else if(sel.type === 'triangle'){ sel.w = Math.max(20, Math.abs(dx)*2); sel.h = Math.max(20, Math.abs(dy)*2); } else if(sel.type === 'text'){ sel.fontSize = Math.max(8, Math.round(Math.abs(dx))); } App.render(); }
    });

    $(document).on('mouseup touchend', function(e){ if(App.state.pointer.down && App.state.selectedId){ App.saveCurrent(); } App.state.pointer.down = false; App.state.pointer.mode = null; resizing = false; });

    // Double click to edit text
    $canvas.on('dblclick', function(e){ const p = getCanvasPoint(e.originalEvent); const hit = App.hitTest(p.x, p.y); if(hit && hit.type === 'text'){ App.state.selectedId = hit.id; App.render(); showTextEditor(hit); } });

    function showTextEditor(obj){ const ta = $('#text-editor'); ta.val(obj.text || ''); ta.css({ left: (obj.x - 200/2) + 'px', top: (obj.y - 20) + 'px', width: '260px' }); ta.show().focus(); ta.off('keydown').on('keydown', function(ev){ if(ev.key === 'Escape'){ ta.hide(); App.render(); } if(ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)){ // commit
          obj.text = ta.val(); ta.hide(); App.saveCurrent(); App.render(); }
    });
    // commit on blur
    ta.off('blur').on('blur', function(){ obj.text = ta.val(); ta.hide(); App.saveCurrent(); App.render(); });
  }

  function isOverHandle(sel, x, y){ let hx = sel.x, hy = sel.y; if(sel.type === 'rect' || sel.type === 'image'){ hx = sel.x + sel.w/2; hy = sel.y + sel.h/2; } else if(sel.type === 'circle' || sel.type === 'star'){ hx = sel.x + (sel.r||0); hy = sel.y + (sel.r||0); } else if(sel.type === 'triangle'){ hx = sel.x + sel.w/2; hy = sel.y + sel.h/2; } else if(sel.type === 'text'){ const wApprox = (sel.text || '').length * (sel.fontSize||28) * 0.5; const hApprox = (sel.fontSize||28) * 1.3; hx = sel.x + wApprox/2 + 8; hy = sel.y + hApprox/2 + 8; }
    const dx = x - hx, dy = y - hy; return Math.sqrt(dx*dx + dy*dy) < 18; }

    // Render saved list
    App.renderSavesList = function(){ const list = window.App.Storage.loadSaves(); const container = $('#saves-list'); container.empty(); if(list.length === 0){ container.append('<div class="text-xs text-gray-400">No saves yet</div>'); return; } list.forEach((s, idx) => {
      const el = $(`<div class="p-2 border rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center">
        <div class="text-sm">${escapeHtml(s.name)}</div>
        <div class="flex items-center gap-2">
          <button class="text-xs text-indigo-600 load-save" data-idx="${idx}">Load</button>
          <button class="text-xs text-red-500 delete-save" data-idx="${idx}">Delete</button>
        </div>
      </div>`);
      container.append(el);
    }); };

    function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

    // Populate from last session
    const saved = window.App.Storage.loadCurrent(); if(saved && saved.objects){ App.state.objects = saved.objects; }

    // Load templates from query or button (optional)
    // Initial render
    App.renderSavesList();
    App.render();
  };

})();
