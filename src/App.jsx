import React, { useState, useRef, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import './App.css';

// --- HILFSFUNKTIONEN ---
const generateId = () => `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getInitialComponent = (type) => {
  const base = {
    id: generateId(),
    type,
    x: 50,
    y: 50,
    width: 150,
    height: 60,
    zIndex: components => components.length + 1, // Auto-Top Layer
    locked: false,
    content: 'Text',
    styles: {
      backgroundColor: 'transparent',
      color: '#333333',
      fontSize: 16,
      fontFamily: 'Arial, sans-serif',
      opacity: 1,
      boxShadow: 'none',
      borderRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      textAlign: 'center',
      objectFit: 'cover'
    }
  };

  switch (type) {
    case 'button':
      return { ...base, content: 'Button', width: 120, height: 40, styles: { ...base.styles, backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: 4, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' } };
    case 'box':
      return { ...base, content: '', width: 100, height: 100, styles: { ...base.styles, backgroundColor: '#e5e7eb', borderWidth: 1, borderColor: '#9ca3af' } };
    case 'circle':
      return { ...base, content: '', width: 100, height: 100, styles: { ...base.styles, backgroundColor: '#ef4444', borderRadius: 50 } };
    case 'image':
      return { ...base, content: 'https://via.placeholder.com/150', width: 200, height: 150, styles: { ...base.styles, backgroundColor: '#cbd5e1' } };
    case 'input':
      return { ...base, content: 'Eingabe...', width: 200, height: 40, styles: { ...base.styles, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, textAlign: 'left', padding: '5px' } };
    default:
      return base;
  }
};

// --- PANELS ---

const Toolbox = ({ addComponent, isOpen, closePanel, activeTab, setActiveTab, components, selectComponent, selectedId, toggleLock }) => (
  <div className={`panel ${isOpen ? 'open' : ''}`}>
    <div className="panel-header">
      <div className="tab-switch">
        <button className={activeTab === 'tools' ? 'active' : ''} onClick={() => setActiveTab('tools')}>Werkzeuge</button>
        <button className={activeTab === 'layers' ? 'active' : ''} onClick={() => setActiveTab('layers')}>Ebenen ({components.length})</button>
      </div>
      <button className="mobile-only icon-btn" onClick={closePanel}>✕</button>
    </div>
    
    <div className="panel-content">
      {activeTab === 'tools' ? (
        <div className="tool-grid">
          <button className="tool-item" onClick={() => addComponent('text')}>📝 Text</button>
          <button className="tool-item" onClick={() => addComponent('button')}>🔘 Button</button>
          <button className="tool-item" onClick={() => addComponent('box')}>YB Box</button>
          <button className="tool-item" onClick={() => addComponent('circle')}>O Kreis</button>
          <button className="tool-item" onClick={() => addComponent('image')}>🖼️ Bild</button>
          <button className="tool-item" onClick={() => addComponent('input')}>⌨️ Input</button>
        </div>
      ) : (
        <div className="layers-list">
          {components.length === 0 && <p className="empty-hint">Keine Ebenen vorhanden</p>}
          {[...components].reverse().map(comp => (
            <div 
              key={comp.id} 
              className={`layer-item ${selectedId === comp.id ? 'selected' : ''}`}
              onClick={() => selectComponent(comp.id)}
            >
              <span className="layer-icon">
                {comp.type === 'image' ? '🖼️' : comp.type === 'circle' ? 'O' : comp.type === 'box' ? 'YB' : 'T'}
              </span>
              <span className="layer-name">{comp.content.substring(0, 15) || comp.type}</span>
              <button 
                className={`layer-lock ${comp.locked ? 'locked' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleLock(comp.id); }}
              >
                {comp.locked ? '🔒' : '🔓'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const PropertiesPanel = ({ element, updateElement, isOpen, closePanel, actions, canvasSettings, updateCanvasSettings }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => updateElement(element.id, 'content', ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  if (!element) {
    return (
      <div className={`panel panel-right ${isOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <span>Leinwand</span>
          <button className="mobile-only icon-btn" onClick={closePanel}>✕</button>
        </div>
        <div className="panel-content">
           <div className="prop-group">
             <label>Papierformat (PDF)</label>
             <select 
               value={canvasSettings.format} 
               onChange={(e) => updateCanvasSettings('format', e.target.value)}
             >
               <option value="a4">A4</option>
               <option value="letter">US Letter</option>
               <option value="custom">Benutzerdefiniert</option>
             </select>
           </div>
           <div className="prop-group">
              <label>Hintergrundfarbe</label>
              <div className="prop-row">
                <input 
                  type="color" 
                  value={canvasSettings.backgroundColor} 
                  onChange={(e) => updateCanvasSettings('backgroundColor', e.target.value)}
                />
                <button className="small-btn" onClick={() => updateCanvasSettings('backgroundColor', '#ffffff')}>Weiß</button>
                <button className="small-btn" onClick={() => updateCanvasSettings('backgroundColor', 'transparent')}>Transp.</button>
              </div>
           </div>
           <div className="empty-msg" style={{marginTop: 40}}>
             <p>Klicke auf ein Element zum Bearbeiten.</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`panel panel-right ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <span>{element.type.toUpperCase()}</span>
        <button className="mobile-only icon-btn" onClick={closePanel}>✕</button>
      </div>
      <div className="panel-content">
        
        {/* Quick Actions */}
        <div className="prop-group actions-row">
          <button className="icon-btn" onClick={actions.bringToFront} title="Nach vorne">⬆️</button>
          <button className="icon-btn" onClick={actions.sendToBack} title="Nach hinten">⬇️</button>
          <button className="icon-btn" onClick={actions.duplicate} title="Duplizieren">📄</button>
          <button className={`icon-btn ${element.locked ? 'active' : ''}`} onClick={actions.toggleLock} title="Sperren">
            {element.locked ? '🔒' : '🔓'}
          </button>
          <button className="icon-btn delete-btn" onClick={actions.delete} title="Löschen">🗑️</button>
        </div>

        {/* Image Upload */}
        {element.type === 'image' && (
          <div className="prop-group">
            <label>Bildquelle</label>
            <button className="primary-btn full-width" onClick={() => fileInputRef.current.click()}>
              📁 Bild wählen
            </button>
            <input 
              type="file" ref={fileInputRef} style={{display: 'none'}} 
              accept="image/*" onChange={handleFileChange}
            />
          </div>
        )}

        {/* Inhalt Text */}
        {['text', 'button', 'input'].includes(element.type) && (
          <div className="prop-group">
            <label>Textinhalt</label>
            <input 
              type="text" disabled={element.locked}
              value={element.content} 
              onChange={(e) => updateElement(element.id, 'content', e.target.value)} 
            />
          </div>
        )}

        {/* Styles */}
        <div className="prop-group">
          <label>Farben</label>
          <div className="prop-row">
             <div className="color-field">
               <span>Hintergrund</span>
               <input type="color" disabled={element.locked} value={element.styles.backgroundColor === 'transparent' ? '#ffffff' : element.styles.backgroundColor} onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, backgroundColor: e.target.value })} />
             </div>
             <div className="color-field">
               <span>Text/Rand</span>
               <input type="color" disabled={element.locked} value={element.styles.color} onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, color: e.target.value })} />
             </div>
          </div>
        </div>

        <div className="prop-group">
           <label>Deckkraft: {Math.round(element.styles.opacity * 100)}%</label>
           <input 
             type="range" min="0" max="1" step="0.1"
             disabled={element.locked}
             value={element.styles.opacity} 
             onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, opacity: parseFloat(e.target.value) })} 
           />
        </div>

        <div className="prop-group">
          <label>Geometrie</label>
          <div className="grid-2">
             <input type="number" disabled={element.locked} placeholder="X" value={element.x} onChange={(e) => updateElement(element.id, 'x', parseInt(e.target.value))} />
             <input type="number" disabled={element.locked} placeholder="Y" value={element.y} onChange={(e) => updateElement(element.id, 'y', parseInt(e.target.value))} />
             <input type="number" disabled={element.locked} placeholder="B" value={element.width} onChange={(e) => updateElement(element.id, 'width', parseInt(e.target.value))} />
             <input type="number" disabled={element.locked} placeholder="H" value={element.height} onChange={(e) => updateElement(element.id, 'height', parseInt(e.target.value))} />
          </div>
        </div>
      </div>
    </div>
  );
};


// --- HAUPT APP ---

function App() {
  // Data State
  const [components, setComponents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [canvasSettings, setCanvasSettings] = useState({ 
    format: 'a4', 
    width: 800, 
    height: 600,
    backgroundColor: '#ffffff' 
  });
  
  // History
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // UI State
  const [darkMode, setDarkMode] = useState(true); // Default Dark Mode für "Cyber" Look
  const [gridOn, setGridOn] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);
  const [activePanel, setActivePanel] = useState('toolbox'); 
  const [activeTab, setActiveTab] = useState('tools');

  // REFS FIX: Stabile Referenzen für Draggable
  const nodeRefs = useRef({});
  const canvasRef = useRef(null);

  // --- HISTORY MANAGEMENT ---
  const addToHistory = useCallback((newState) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.stringify(newState));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  useEffect(() => {
    if (history.length === 0) addToHistory([]);
  }, []);

  const updateComponents = (newComponents, saveToHistory = true) => {
    setComponents(newComponents);
    if (saveToHistory) addToHistory(newComponents);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setComponents(JSON.parse(history[historyIndex - 1]));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setComponents(JSON.parse(history[historyIndex + 1]));
    }
  };

  // --- REFS HELPER (FIX FÜR STICKY ELEMENTS) ---
  const getNodeRef = (id) => {
    if (!nodeRefs.current[id]) {
      nodeRefs.current[id] = React.createRef();
    }
    return nodeRefs.current[id];
  };

  // Cleanup alter Refs
  useEffect(() => {
    const currentIds = components.map(c => c.id);
    Object.keys(nodeRefs.current).forEach(id => {
      if (!currentIds.includes(id)) delete nodeRefs.current[id];
    });
  }, [components]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return; // Nicht feuern wenn man tippt

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) deleteElement();
      }
      // Arrows
      if (selectedId && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        setComponents(prev => prev.map(c => {
          if (c.id === selectedId && !c.locked) {
             const update = { ...c };
             if (e.key === 'ArrowUp') update.y -= step;
             if (e.key === 'ArrowDown') update.y += step;
             if (e.key === 'ArrowLeft') update.x -= step;
             if (e.key === 'ArrowRight') update.x += step;
             return update;
          }
          return c;
        }));
      }
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, historyIndex, history]);

  // --- ACTIONS ---
  const addComponent = (type) => {
    const newComp = getInitialComponent(type);
    // Setze zIndex höher als alle anderen
    const maxZ = components.length > 0 ? Math.max(...components.map(c => c.zIndex)) : 0;
    newComp.zIndex = maxZ + 1;
    
    updateComponents([...components, newComp]);
    if (window.innerWidth < 768) setActivePanel(null); 
    setSelectedId(newComp.id);
  };

  const updateElement = (id, key, value) => {
    const updated = components.map(c => {
      if (c.id === id) {
        if (key === 'styles') return { ...c, styles: { ...c.styles, ...value } };
        return { ...c, [key]: value };
      }
      return c;
    });
    updateComponents(updated);
  };

  const handleDragStop = (id, data) => {
    const updated = components.map(c => c.id === id ? { ...c, x: data.x, y: data.y } : c);
    updateComponents(updated);
  };

  const handleResize = (id, size) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, width: size.width, height: size.height } : c));
  };
  
  const handleResizeStop = (id, size) => {
     const updated = components.map(c => c.id === id ? { ...c, width: size.width, height: size.height } : c);
     addToHistory(updated);
  };

  const deleteElement = () => {
    if (!selectedId) return;
    const comp = components.find(c => c.id === selectedId);
    if (comp && comp.locked) return;
    updateComponents(components.filter(c => c.id !== selectedId));
    setSelectedId(null);
  };

  const duplicateElement = () => {
    if (!selectedId) return;
    const original = components.find(c => c.id === selectedId);
    const copy = { 
      ...original, 
      id: generateId(), 
      x: original.x + 20, 
      y: original.y + 20,
      zIndex: original.zIndex + 1
    };
    updateComponents([...components, copy]);
    setSelectedId(copy.id);
  };

  const moveLayer = (dir) => {
    if (!selectedId) return;
    const updated = components.map(c => c.id === selectedId ? { ...c, zIndex: Math.max(0, c.zIndex + dir) } : c);
    updateComponents(updated);
  };

  const toggleLock = (idToLock = selectedId) => {
    if (!idToLock) return;
    const updated = components.map(c => c.id === idToLock ? { ...c, locked: !c.locked } : c);
    updateComponents(updated);
  };

  const clearCanvas = () => {
    if (window.confirm("Alles löschen?")) {
      updateComponents([]);
      setSelectedId(null);
    }
  };

  const handleZoom = (delta) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  // Export
  const saveLayout = () => { localStorage.setItem('cyber9_layout', JSON.stringify(components)); alert('Gespeichert!'); };
  const loadLayout = () => { 
    const data = localStorage.getItem('cyber9_layout');
    if (data) updateComponents(JSON.parse(data));
  };
  
  const exportPDF = () => {
    setPreviewMode(true); setSelectedId(null); setZoom(1);
    setTimeout(() => {
      html2canvas(canvasRef.current, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: canvasSettings.backgroundColor 
      })
        .then(canvas => {
          const pdf = new jsPDF({ 
            orientation: canvas.width > canvas.height ? 'l' : 'p', 
            unit: 'px', 
            format: canvasSettings.format === 'custom' ? [canvas.width, canvas.height] : canvasSettings.format 
          });
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
          pdf.save('cyber9-design.pdf');
          setPreviewMode(false);
        });
    }, 500);
  };

  useEffect(() => { document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light'); }, [darkMode]);
  const selectedComponent = components.find(c => c.id === selectedId);

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="logo">CYBER<span>9</span></div>
        
        <div className="zoom-controls">
          <button className="icon-btn" onClick={() => handleZoom(-0.1)}>➖</button>
          <span className="zoom-val">{Math.round(zoom * 100)}%</span>
          <button className="icon-btn" onClick={() => handleZoom(0.1)}>➕</button>
        </div>

        <div className="actions">
          <button className="icon-btn" onClick={undo} title="Undo (Ctrl+Z)">↩️</button>
          <button className="icon-btn" onClick={redo} title="Redo (Ctrl+Y)">↪️</button>
          <div className="sep"></div>
          <button className={`icon-btn ${gridOn ? 'active' : ''}`} onClick={() => setGridOn(!gridOn)}>{gridOn ? '📅' : '⬜'}</button>
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)}>{darkMode ? '☀️' : '🌙'}</button>
          <button className="icon-btn" onClick={saveLayout}>💾</button>
          <button className="icon-btn" onClick={loadLayout}>📂</button>
          <button className="icon-btn danger" onClick={clearCanvas}>♻️</button>
          <button className="primary-btn" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      <div className="workspace">
        <Toolbox 
          addComponent={addComponent} 
          isOpen={activePanel === 'toolbox' || window.innerWidth > 768} 
          closePanel={() => setActivePanel(null)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          components={components}
          selectComponent={(id) => { setSelectedId(id); if(window.innerWidth < 768) setActivePanel('props'); }}
          selectedId={selectedId}
          toggleLock={toggleLock}
        />

        {/* CANVAS AREA */}
        <div className={`canvas-area ${gridOn ? 'grid-on' : ''} ${previewMode ? 'preview' : 'edit-mode'}`}>
          <div 
            className="canvas-wrapper-zoom"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center top',
              width: canvasSettings.format === 'a4' ? '595px' : canvasSettings.format === 'letter' ? '612px' : '100%',
              height: canvasSettings.format === 'a4' ? '842px' : canvasSettings.format === 'letter' ? '792px' : '100%',
              backgroundColor: canvasSettings.backgroundColor
            }}
          >
            <div 
              className="canvas-container" 
              ref={canvasRef} 
              onClick={(e) => { if(e.target === e.currentTarget) setSelectedId(null); }}
            >
              {components.length === 0 && <div className="empty-state"><h3>Leere Leinwand</h3><p>Elemente aus der Toolbox hinzufügen</p></div>}

              {components.map((comp) => (
                <Draggable
                  key={comp.id}
                  nodeRef={getNodeRef(comp.id)} // WICHTIG: Hier der Fix!
                  position={{ x: comp.x, y: comp.y }}
                  grid={gridOn ? [10, 10] : [1, 1]} // Performanteres Snapping
                  scale={zoom}
                  onStop={(e, d) => handleDragStop(comp.id, d)}
                  onStart={() => !comp.locked && setSelectedId(comp.id)}
                  disabled={previewMode || comp.locked}
                  bounds="parent"
                  cancel=".react-resizable-handle" 
                >
                  <div 
                    ref={getNodeRef(comp.id)}
                    className={`draggable-wrapper ${comp.locked ? 'locked' : ''} ${selectedId === comp.id ? 'selected-wrapper' : ''}`}
                    style={{ position: 'absolute', width: comp.width, height: comp.height, zIndex: comp.zIndex }}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(comp.id); setActivePanel('props'); }}
                  >
                    <Resizable
                      width={comp.width} height={comp.height}
                      onResize={(e, data) => !comp.locked && handleResize(comp.id, data.size)}
                      onResizeStop={(e, data) => !comp.locked && handleResizeStop(comp.id, data.size)}
                      resizeHandles={selectedId === comp.id && !comp.locked ? ['se'] : []}
                      minConstraints={[20, 20]}
                    >
                      <div 
                        className="component-inner"
                        style={{
                          ...comp.styles,
                          borderRadius: comp.type === 'circle' ? '50%' : `${comp.styles.borderRadius}px`,
                          backgroundImage: comp.type === 'image' ? `url(${comp.content})` : 'none',
                          backgroundSize: comp.styles.objectFit || 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        {comp.locked && selectedId === comp.id && <div className="lock-indicator">🔒</div>}
                        
                        <div className="comp-content">
                           {comp.type === 'input' ? <input disabled className="mock-input" placeholder={comp.content}/> 
                           : comp.type === 'image' ? null 
                           : comp.content}
                        </div>
                      </div>
                    </Resizable>
                  </div>
                </Draggable>
              ))}
            </div>
          </div>
        </div>

        <PropertiesPanel 
          element={selectedComponent} 
          updateElement={updateElement} 
          isOpen={activePanel === 'props' || (selectedId && window.innerWidth > 768)} 
          closePanel={() => setActivePanel(null)}
          actions={{
            delete: deleteElement,
            duplicate: duplicateElement,
            bringToFront: () => moveLayer(1),
            sendToBack: () => moveLayer(-1),
            toggleLock: () => toggleLock(),
          }}
          canvasSettings={canvasSettings}
          updateCanvasSettings={(k, v) => setCanvasSettings({...canvasSettings, [k]: v})}
        />
      </div>

      {/* Mobile Footer */}
      <div className="mobile-nav">
         <button onClick={() => setActivePanel(activePanel === 'toolbox' ? null : 'toolbox')}>🛠️</button>
         <button onClick={undo}>↩️</button>
         <button onClick={() => setActivePanel(activePanel === 'props' ? null : 'props')}>🎨</button>
      </div>
    </div>
  );
}

export default App;