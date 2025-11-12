// createRef und useEffect sind wieder da, sie sind alle notwendig
import React, { useState, useRef, createRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Resizable-Importe
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css'; 

import './App.css'; 

// 1. Toolbox (unverändert)
const Toolbox = ({ addComponent }) => {
  return (
    <div className="toolbox">
      <h3>Toolbox</h3>
      <button onClick={() => addComponent('text')}>Text hinzufügen</button>
      <button onClick={() => addComponent('button')}>Button hinzufügen</button>
      <button onClick={() => addComponent('image')}>Bild hinzufügen</button>
    </div>
  );
};

// 2. Properties-Panel (JETZT KORRIGIERT)
const PropertiesPanel = ({ selectedComponent, updateComponent }) => {
  if (!selectedComponent) {
    return (
      <div className="properties-panel">
        <div className="panel-placeholder">Wähle ein Element aus, um es zu bearbeiten.</div>
      </div>
    );
  }
  
  const handleContentChange = (e) => {
    updateComponent(selectedComponent.id, 'content', e.target.value);
  };

  // KORRIGIERTER HANDLER: Verhindert 0 oder negative Zahlen
  const handleWidthChange = (e) => {
    let newWidth = parseInt(e.target.value);
    if (isNaN(newWidth) || newWidth < 10) {
      newWidth = 10; // Mindestbreite
    }
    updateComponent(selectedComponent.id, 'width', newWidth);
  };

  // KORRIGIERTER HANDLER: Verhindert 0 oder negative Zahlen
  const handleHeightChange = (e) => {
    let newHeight = parseInt(e.target.value);
    if (isNaN(newHeight) || newHeight < 10) {
      newHeight = 10; // Mindesthöhe
    }
    updateComponent(selectedComponent.id, 'height', newHeight);
  };

  return (
    <div className="properties-panel">
      <h3>Eigenschaften</h3>
      <div className="property-item">
        <label>Inhalt (Text)</label>
        <input 
          type="text" 
          value={selectedComponent.content} 
          onChange={handleContentChange}
          disabled={selectedComponent.type === 'image'} 
        />
      </div>
      <div className="property-item">
        <label>Breite (px)</label>
        <input 
          type="number" 
          value={selectedComponent.width} 
          onChange={handleWidthChange}
          min="10" // Fügt auch eine HTML5-Validierung hinzu
        />
      </div>
      <div className="property-item">
        <label>Höhe (px)</label>
        <input 
          type="number" 
          value={selectedComponent.height} 
          onChange={handleHeightChange}
          min="10" // Fügt auch eine HTML5-Validierung hinzu
        />
      </div>
    </div>
  );
};


// 3. PDF Export-Funktion (Die funktionierende Version)
const generatePDF = (canvasRef, setExporting) => {
  console.log("PDF-Generierung startet...");
  const input = canvasRef.current;
  
  setTimeout(() => {
    html2canvas(input, { useCORS: true, scale: 2, allowTaint: true })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save("mein-ui-design.pdf");
        
        setExporting(false); 
      })
      .catch(err => {
        console.error("Fehler bei html2canvas:", err);
        setExporting(false);
      });
  }, 0);
};


// 4. Haupt-App-Komponente
function App() {
  const [components, setComponents] = useState([]);
  const [selectedComponentId, setSelectedComponentId] = useState(null);
  const [isExporting, setIsExporting] = useState(false); 
  const canvasRef = useRef(null);

  // addComponent (MIT createRef)
  const addComponent = (type) => {
    const newComponent = {
      id: `comp-${Date.now()}`,
      type: type,
      content: type === 'image' ? 'Bild-Platzhalter' : `Neues ${type}-Element`,
      x: 10,
      y: 10,
      width: type === 'image' ? 150 : 180,
      height: type === 'image' ? 100 : 40,
      ref: createRef(null) // WICHTIG: Die Ref für Draggable
    };
    setComponents(prevComponents => [...prevComponents, newComponent]);
  };

  // onStopDrag (unverändert)
  const onStopDrag = (e, data, id) => {
    setComponents(prevComponents => 
      prevComponents.map(comp => 
        comp.id === id ? { ...comp, x: data.x, y: data.y } : comp
      )
    );
  };

  // onResize (unverändert)
  const onResize = (event, { size }, id) => {
    // Sorge auch hier für eine Mindestgrösse beim direkten Resizen
    const newWidth = size.width < 10 ? 10 : size.width;
    const newHeight = size.height < 10 ? 10 : size.height;

    setComponents(prevComponents =>
      prevComponents.map(comp =>
        comp.id === id ? { ...comp, width: newWidth, height: newHeight } : comp
      )
    );
  };

  // renderComponent (unverändert)
  const renderComponent = (comp) => {
    switch (comp.type) {
      case 'text':
        return <span className="content-fill">{comp.content}</span>;
      case 'button':
        return <button className="content-fill">{comp.content}</button>;
      case 'image':
        return <div className="placeholder-image content-fill">{comp.content}</div>;
      default:
        return null;
    }
  };

  // updateComponent (unverändert)
  const updateComponent = (id, property, value) => {
    setComponents(prevComponents =>
      prevComponents.map(comp => 
        comp.id === id ? { ...comp, [property]: value } : comp
      )
    );
  };
  
  const selectedComponent = components.find(comp => comp.id === selectedComponentId);

  // useEffect (für PDF-Export)
  useEffect(() => {
    if (isExporting) {
      generatePDF(canvasRef, setIsExporting);
    }
  }, [isExporting]);

  // Render-Funktion
  return (
    <div className="App-Builder">
      
      <Toolbox addComponent={addComponent} />
      
      <div className="main-area">
        <div className="toolbar">
          <button onClick={() => setIsExporting(true)} disabled={isExporting}>
            {isExporting ? 'Exportiere...' : 'Als PDF exportieren'}
          </button>
        </div>

        <div 
          className="canvas" 
          ref={canvasRef}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedComponentId(null);
            }
          }}
        >
          
          {/* === KONDITIONALES RENDERING === */}
          
          {/* 1. Normaler Modus (Drag, Resize, Select) */}
          {!isExporting && components.map((comp) => (
            <Draggable
              key={comp.id}
              nodeRef={comp.ref} 
              position={{ x: comp.x, y: comp.y }} 
              onStop={(e, data) => onStopDrag(e, data, comp.id)}
              bounds="parent"
              handle=".drag-handle" 
            >
              <div
                ref={comp.ref} 
                style={{ 
                  width: comp.width, 
                  height: comp.height,
                  position: 'absolute' 
                }}
              >
                <Resizable
                  width={comp.width} 
                  height={comp.height} 
                  onResize={(e, data) => onResize(e, data.size, comp.id)}
                  resizeHandles={['se']} 
                  // Füge Mindestmasse hinzu, um Absturz zu verhindern
                  minConstraints={[10, 10]} 
                >
                  <div 
                    id={comp.id}
                    className={`draggable-component dragging-active ${comp.id === selectedComponentId ? 'selected' : ''}`} 
                    onClick={() => setSelectedComponentId(comp.id)}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <div className="drag-handle">::</div>
                    {renderComponent(comp)}
                  </div>
                </Resizable>
              </div>
            </Draggable>
          ))}
          
          {/* 2. Export-Modus (reines, positioniertes HTML) */}
          {isExporting && components.map((comp) => (
            <div
              key={comp.id}
              id={comp.id}
              className="draggable-component" 
              style={{
                position: 'absolute',
                top: `${comp.y}px`,
                left: `${comp.x}px`,
                width: `${comp.width}px`,
                height: `${comp.height}px`
              }}
            >
              {renderComponent(comp)}
            </div>
          ))}

          {/* 3. Platzhalter */}
          {components.length === 0 && (
            <div className="canvas-placeholder">
              Klicke auf Elemente in der Toolbox, um sie hinzuzufügen.
            </div>
          )}
        </div>
      </div>
      
      <PropertiesPanel 
        selectedComponent={selectedComponent}
        updateComponent={updateComponent}
      />
    </div>
  );
}

export default App;