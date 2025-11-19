import React, { useState, useRef, createRef, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import './App.css';

// --- HILFSFUNKTIONEN ---
const generateId = () => `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Template Generator
const getInitialComponent = (type) => {
  const base = {
    id: generateId(),
    type,
    x: 50,
    y: 50,
    width: 150,
    height: 60,
    zIndex: 1,
    locked: false, // NEU: Locking Feature
    content: 'Text',
    styles: {
      backgroundColor: 'transparent',
      color: '#333333',
      fontSize: 16,
      fontFamily: 'Arial, sans-serif', // NEU: Fonts
      opacity: 1, // NEU: Opacity
      boxShadow: 'none', // NEU: Shadow
      borderRadius: 0,
      borderWidth: 0,
      borderColor: '#000000',
      textAlign: 'center',
    }
  };

  switch (type) {
    case 'button':
      return { ...base, content: 'Button', width: 120, height: 40, styles: { ...base.styles, backgroundColor: '#3498db', color: '#ffffff', borderRadius: 4, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' } };
    case 'box':
      return { ...base, content: '', width: 100, height: 100, styles: { ...base.styles, backgroundColor: '#ecf0f1', borderWidth: 1, borderColor: '#bdc3c7' } };
    case 'circle':
      return { ...base, content: '', width: 100, height: 100, styles: { ...base.styles, backgroundColor: '#e74c3c', borderRadius: 50 } };
    case 'image':
      return { ...base, content: 'Bild', width: 200, height: 150, styles: { ...base.styles, backgroundColor: '#dfe6e9' } };
    case 'input':
      return { ...base, content: 'Eingabe...', width: 200, height: 40, styles: { ...base.styles, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ccc', borderRadius: 4, textAlign: 'left', padding: '5px' } };
    default:
      return base;
  }
};

// --- COMPONENTS ---

const Toolbox = ({ addComponent, isOpen, closePanel }) => (
  <div className={`panel ${isOpen ? 'open' : ''}`}>
    <div className="panel-header">
      <span>Toolbox</span>
      <button className="mobile-only icon-btn" onClick={closePanel}>✕</button>
    </div>
    <div className="panel-content">
      <div className="tool-grid">
        <button className="tool-item" onClick={() => addComponent('text')}>📝 Text</button>
        <button className="tool-item" onClick={() => addComponent('button')}>🔘 Button</button>
        <button className="tool-item" onClick={() => addComponent('box')}>YB Box</button>
        <button className="tool-item" onClick={() => addComponent('circle')}>O Kreis</button>
        <button className="tool-item" onClick={() => addComponent('image')}>🖼️ Bild</button>
        <button className="tool-item" onClick={() => addComponent('input')}>⌨️ Input</button>
      </div>
    </div>
  </div>
);

const PropertiesPanel = ({ element, updateElement, isOpen, closePanel, actions }) => {
  if (!element) {
    return (
      <div className={`panel panel-right ${isOpen ? 'open' : ''}`}>
        <div className="panel-header">
          <span>Eigenschaften</span>
          <button className="mobile-only icon-btn" onClick={closePanel}>✕</button>
        </div>
        <div className="panel-content empty-msg">
          <p>Wähle ein Element aus.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`panel panel-right ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <span>{element.type.toUpperCase()} Bearbeiten</span>
        <button className="mobile-only icon-btn" onClick={closePanel}>✕</button>
      </div>
      <div className="panel-content">
        
        {/* Quick Actions */}
        <div className="prop-group actions-row">
          <button className="icon-btn" onClick={actions.bringToFront} title="Nach vorne">⬆️</button>
          <button className="icon-btn" onClick={actions.sendToBack} title="Nach hinten">⬇️</button>
          <button className="icon-btn" onClick={actions.duplicate} title="Duplizieren">📄</button>
          <button className={`icon-btn ${element.locked ? 'active' : ''}`} onClick={actions.toggleLock} title={element.locked ? "Entsperren" : "Sperren"}>
            {element.locked ? '🔒' : 'mq'}
          </button>
          <button className="icon-btn delete-btn" onClick={actions.delete} title="Löschen">🗑️</button>
        </div>

        {/* Ausrichtung */}
        <div className="prop-group">
          <label>Ausrichtung (Canvas)</label>
          <div className="prop-row">
            <button className="small-btn" onClick={actions.centerH}>↔️ Mittig</button>
            <button className="small-btn" onClick={actions.centerV}>↕️ Mittig</button>
          </div>
        </div>

        <hr className="divider"/>

        {/* Inhalt */}
        {element.type !== 'box' && element.type !== 'circle' && (
          <div className="prop-group">
            <label>Inhalt</label>
            <input 
              type="text" 
              disabled={element.locked}
              value={element.content} 
              onChange={(e) => updateElement(element.id, 'content', e.target.value)} 
            />
          </div>
        )}

        {/* Design Styles */}
        <div className="prop-group">
          <label>Farbe & Transparenz</label>
          <div className="prop-row">
             <input type="color" disabled={element.locked} value={element.styles.backgroundColor === 'transparent' ? '#ffffff' : element.styles.backgroundColor} onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, backgroundColor: e.target.value })} />
             <input type="color" disabled={element.locked} value={element.styles.color} onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, color: e.target.value })} />
          </div>
          <div className="prop-row" style={{marginTop: 5}}>
            <span style={{fontSize: '0.8rem'}}>Opac:</span>
            <input 
              type="range" min="0" max="1" step="0.1"
              disabled={element.locked}
              value={element.styles.opacity} 
              onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, opacity: parseFloat(e.target.value) })} 
            />
          </div>
        </div>

        <div className="prop-group">
          <label>Schrift & Schatten</label>
          <select 
            value={element.styles.fontFamily} 
            disabled={element.locked}
            onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, fontFamily: e.target.value })}
          >
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Verdana, sans-serif">Verdana</option>
          </select>
          
          <div className="checkbox-row" style={{marginTop: 8}}>
            <input 
              type="checkbox" 
              id="shadowCheck"
              disabled={element.locked}
              checked={element.styles.boxShadow !== 'none'} 
              onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, boxShadow: e.target.checked ? '0 4px 8px rgba(0,0,0,0.2)' : 'none' })}
            />
            <label htmlFor="shadowCheck">Schatten aktiv</label>
          </div>
        </div>

        <div className="prop-group">
          <label>Größe & Radius</label>
          <div className="prop-row">
             <input type="number" disabled={element.locked} placeholder="B" value={element.width} onChange={(e) => updateElement(element.id, 'width', parseInt(e.target.value))} />
             <input type="number" disabled={element.locked} placeholder="H" value={element.height} onChange={(e) => updateElement(element.id, 'height', parseInt(e.target.value))} />
          </div>
           <input 
            type="range" min="0" max="50" 
            disabled={element.locked}
            value={parseInt(element.styles.borderRadius) || 0} 
            onChange={(e) => updateElement(element.id, 'styles', { ...element.styles, borderRadius: parseInt(e.target.value) })} 
            style={{marginTop: 5}}
          />
        </div>

      </div>
    </div>
  );
};


// --- HAUPT APP ---

function App() {
  const [components, setComponents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  
  // History State
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // UI State
  const [darkMode, setDarkMode] = useState(false);
  const [gridOn, setGridOn] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);
  const [activePanel, setActivePanel] = useState(null); 

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

  // --- KEYBOARD SHORTCUTS (NEU) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Löschen
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) deleteElement();
      }
      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      // Pfeiltasten Bewegung
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, historyIndex, history]); // Dependencies wichtig!

  // --- ACTIONS ---
  const addComponent = (type) => {
    const newComp = { ...getInitialComponent(type), ref: createRef() };
    updateComponents([...components, newComp]);
    setActivePanel(null);
  };

  const updateElement = (id, key, value) => {
    const updated = components.map(c => c.id === id ? { ...c, [key]: value } : c);
    updateComponents(updated);
  };

  const handleDragStop = (id, data) => {
    // Verhindern, dass gesperrte Elemente bewegt werden (Sicherheitsnetz)
    const comp = components.find(c => c.id === id);
    if (comp && comp.locked) return;

    const updated = components.map(c => c.id === id ? { ...c, x: data.x, y: data.y } : c);
    updateComponents(updated);
  };

  // Resize braucht lokalen State für Smoothness, History erst bei Stop
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
    if (comp.locked) return; // Gesperrte nicht löschen
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
      ref: createRef() 
    };
    updateComponents([...components, copy]);
    setSelectedId(copy.id);
  };

  const moveLayer = (dir) => {
    if (!selectedId) return;
    const updated = components.map(c => c.id === selectedId ? { ...c, zIndex: c.zIndex + dir } : c);
    updateComponents(updated);
  };

  const toggleLock = () => {
    if (!selectedId) return;
    const updated = components.map(c => c.id === selectedId ? { ...c, locked: !c.locked } : c);
    updateComponents(updated);
  };

  const alignCenter = (axis) => {
    if (!selectedId || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const updated = components.map(c => {
      if (c.id === selectedId && !c.locked) {
        if (axis === 'h') return { ...c, x: (canvasRect.width / 2) - (c.width / 2) };
        if (axis === 'v') return { ...c, y: (canvasRect.height / 2) - (c.height / 2) };
      }
      return c;
    });
    updateComponents(updated);
  };

  const clearCanvas = () => {
    if (window.confirm("Alles löschen?")) {
      updateComponents([]);
      setSelectedId(null);
    }
  };

  // Save/Load/Export Logik (wie gehabt)
  const saveLayout = () => { localStorage.setItem('cyber9_layout', JSON.stringify(components)); alert('Gespeichert!'); };
  const loadLayout = () => { 
    const data = localStorage.getItem('cyber9_layout');
    if (data) {
       const parsed = JSON.parse(data).map(c => ({...c, ref: createRef()}));
       updateComponents(parsed);
    }
  };
  
  const exportPDF = () => {
    setPreviewMode(true); setSelectedId(null);
    setTimeout(() => {
      html2canvas(canvasRef.current, { scale: 2, useCORS: true, backgroundColor: darkMode ? '#2c2c2c' : '#eef2f5' })
        .then(canvas => {
          const pdf = new jsPDF({ orientation: 'l', unit: 'px', format: [canvas.width, canvas.height] });
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save('cyber9-design.pdf');
          setPreviewMode(false);
        });
    }, 100);
  };

  useEffect(() => { document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light'); }, [darkMode]);

  const selectedComponent = components.find(c => c.id === selectedId);

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="logo">CYBER<span>9</span></div>
        <div className="actions">
          <button className="icon-btn" onClick={undo} title="Undo">↩️</button>
          <button className="icon-btn" onClick={redo} title="Redo">↪️</button>
          <div className="sep"></div>
          <button className="icon-btn" onClick={() => setGridOn(!gridOn)}>{gridOn ? '📅' : '⬜'}</button>
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)}>{darkMode ? '☀️' : '🌙'}</button>
          <button className="icon-btn" onClick={saveLayout}>💾</button>
          <button className="icon-btn" onClick={loadLayout}>📂</button>
          <button className="icon-btn danger" onClick={clearCanvas}>♻️</button>
          <button className="primary-btn" onClick={exportPDF}>Export PDF</button>
        </div>
      </div>

      <div className="workspace">
        <Toolbox addComponent={addComponent} isOpen={activePanel === 'toolbox'} closePanel={() => setActivePanel(null)} />

        <div className={`canvas-area ${gridOn ? 'grid-on' : ''} ${previewMode ? 'preview' : 'edit-mode'}`}>
          <div className="canvas-container" ref={canvasRef} onClick={(e) => { if(e.target === e.currentTarget) setSelectedId(null); }}>
            
            {components.length === 0 && <div className="empty-state"><h3>Leere Leinwand</h3><p>Drag & Drop gibt es bald, klicke links!</p></div>}

            {components.map((comp) => (
              <Draggable
                key={comp.id}
                nodeRef={comp.ref}
                position={{ x: comp.x, y: comp.y }}
                onStop={(e, d) => handleDragStop(comp.id, d)}
                onStart={() => !comp.locked && setSelectedId(comp.id)}
                disabled={previewMode || comp.locked} // WICHTIG: Locking
                bounds="parent"
                cancel=".react-resizable-handle" // FIX: Erlaubt Drag überall AUSSER am Resize-Handle
              >
                <div 
                  ref={comp.ref}
                  className={`draggable-wrapper ${comp.locked ? 'locked' : ''} ${selectedId === comp.id ? 'selected-wrapper' : ''}`}
                  style={{ position: 'absolute', width: comp.width, height: comp.height, zIndex: comp.zIndex }}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(comp.id); setActivePanel('props'); }}
                >
                  <Resizable
                    width={comp.width} height={comp.height}
                    onResize={(e, data) => !comp.locked && handleResize(comp.id, data.size)}
                    onResizeStop={(e, data) => !comp.locked && handleResizeStop(comp.id, data.size)}
                    resizeHandles={['se']}
                    minConstraints={[20, 20]}
                  >
                    <div 
                      className="component-inner"
                      style={{
                        ...comp.styles,
                        borderRadius: `${comp.styles.borderRadius}%`
                      }}
                    >
                      {/* Indikator wenn gesperrt */}
                      {comp.locked && selectedId === comp.id && <div className="lock-indicator">🔒</div>}
                      
                      <div className="comp-content">
                         {comp.type === 'input' ? <input disabled style={{pointerEvents:'none'}} placeholder={comp.content}/> : comp.content}
                      </div>
                    </div>
                  </Resizable>
                </div>
              </Draggable>
            ))}
          </div>
        </div>

        <PropertiesPanel 
          element={selectedComponent} 
          updateElement={updateElement} 
          isOpen={activePanel === 'props'} 
          closePanel={() => setActivePanel(null)}
          actions={{
            delete: deleteElement,
            duplicate: duplicateElement,
            bringToFront: () => moveLayer(1),
            sendToBack: () => moveLayer(-1),
            toggleLock: toggleLock,
            centerH: () => alignCenter('h'),
            centerV: () => alignCenter('v')
          }}
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