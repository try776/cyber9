import React, { useState, useRef, createRef, useEffect } from 'react'; // 1. useEffect importieren
import Draggable from 'react-draggable';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './App.css'; 

// 1. Toolbox-Komponente (unverändert)
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

// 2. Properties-Panel Komponente (unverändert)
const PropertiesPanel = ({ selectedComponent, updateComponent }) => {
  if (!selectedComponent) {
    return (
      <div className="properties-panel">
        <div className="panel-placeholder">Wähle ein Element aus, um es zu bearbeiten.</div>
      </div>
    );
  }
  const handleChange = (e) => {
    updateComponent(selectedComponent.id, 'content', e.target.value);
  };
  return (
    <div className="properties-panel">
      <h3>Eigenschaften</h3>
      <div className="property-item">
        <label>Inhalt (Text)</label>
        <input 
          type="text" 
          value={selectedComponent.content} 
          onChange={handleChange}
          disabled={selectedComponent.type === 'image'} 
        />
      </div>
    </div>
  );
};


// 3. PDF Export-Funktion (JETZT VIEL EINFACHER)
// Diese Funktion wird jetzt von einem 'useEffect'-Hook aufgerufen
const generatePDF = (canvasRef, setExporting) => {
  console.log("PDF-Generierung startet... (nach Re-Render)");
  const input = canvasRef.current;

  html2canvas(input, { 
    useCORS: true, 
    scale: 2,
    allowTaint: true // Hilft bei manchen Browser-Sicherheitsregeln
  })
    .then((canvas) => {
      // Prüfen, ob der Canvas leer ist (reine Vorsichtsmassnahme)
      if (canvas.width === 0 || canvas.height === 0) {
        console.error("html2canvas hat einen leeren Canvas erstellt.");
        setExporting(false); // Export-Modus beenden
        return;
      }
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save("mein-ui-design.pdf");
      
      // WICHTIG: Den Export-Modus beenden
      setExporting(false); 
    })
    .catch(err => {
      console.error("Fehler bei html2canvas:", err);
      setExporting(false); // Auch bei Fehler beenden
    });
};


// 4. Die Haupt-App-Komponente
function App() {
  const [components, setComponents] = useState([]);
  const [selectedComponentId, setSelectedComponentId] = useState(null);
  
  // NEUER STATE: Steuert den Export-Modus
  const [isExporting, setIsExporting] = useState(false); 
  
  const canvasRef = useRef(null);

  // addComponent (unverändert)
  const addComponent = (type) => {
    const newComponent = {
      id: `comp-${Date.now()}`,
      type: type,
      content: type === 'image' ? 'Bild-Platzhalter' : `Neues ${type}-Element`,
      x: 10,
      y: 10,
      ref: createRef(null) 
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

  // renderComponent (unverändert)
  const renderComponent = (comp) => {
    switch (comp.type) {
      case 'text':
        return <span>{comp.content}</span>;
      case 'button':
        return <button>{comp.content}</button>;
      case 'image':
        return <div className="placeholder-image">{comp.content}</div>;
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

  // NEUER HOOK: Löst den PDF-Export aus, *nachdem* der State
  // (und damit das DOM) aktualisiert wurde.
  useEffect(() => {
    if (isExporting) {
      // Wir rufen die PDF-Funktion auf und übergeben ihr die Setter-Funktion
      generatePDF(canvasRef, setIsExporting);
    }
  }, [isExporting]); // Lauscht nur auf Änderungen an 'isExporting'

  // Render-Funktion
  return (
    <div className="App-Builder">
      
      <Toolbox addComponent={addComponent} />
      
      <div className="main-area">
        <div className="toolbar">
          {/* GEÄNDERT: Der Button setzt jetzt nur noch den State */}
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
          
          {/* 1. Normaler Modus (mit Draggable) */}
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
                id={comp.id}
                className={`draggable-component dragging-active ${comp.id === selectedComponentId ? 'selected' : ''}`} 
                ref={comp.ref}
                onClick={() => setSelectedComponentId(comp.id)}
              >
                {/* WICHTIG: Das 'dragging-active' Tag ist für das alte PDF-Skript 
                    (das Handles versteckt), aber wir behalten es für den Klick-Handler.
                    Wir müssen sicherstellen, dass das Handle im Export-Modus nicht gerendert wird. */}
                <div className="drag-handle">::</div>
                {renderComponent(comp)}
              </div>
            </Draggable>
          ))}
          
          {/* 2. Export-Modus (reines HTML, kein Draggable, kein Handle) */}
          {isExporting && components.map((comp) => (
            <div
              key={comp.id}
              id={comp.id}
              className="draggable-component" // 'dragging-active' & 'selected' entfernt
              // WICHTIG: Positioniere es mit 'top'/'left', was html2canvas versteht
              style={{
                position: 'absolute',
                top: `${comp.y}px`,
                left: `${comp.x}px`
              }}
            >
              {/* Kein Drag-Handle rendern! */}
              {renderComponent(comp)}
            </div>
          ))}

          {/* 3. Platzhalter (unverändert) */}
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