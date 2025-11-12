import React, { useState, useRef, createRef } from 'react';
import Draggable from 'react-draggable';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './App.css'; 

// 1. Die Toolbox-Komponente (unverändert)
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

// 2. Die Properties-Panel Komponente (unverändert)
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


// 3. Die PDF Export-Funktion (JETZT KORRIGIERT)
const exportToPDF = (canvasRef, components) => {
  console.log("Exportiere PDF...");
  const input = canvasRef.current;
  const activeHandles = input.querySelectorAll('.dragging-active');

  // --- VORBEREITUNG FÜR HTML2CANVAS ---
  // 1. Verstecke die Drag-Handles
  activeHandles.forEach(handle => handle.style.display = 'none');

  // 2. Ersetze 'transform' durch 'top'/'left'
  components.forEach(comp => {
    const el = document.getElementById(comp.id);
    if (el) {
      el.style.transform = 'none';
      el.style.top = `${comp.y}px`;
      el.style.left = `${comp.x}px`;
    }
  });

  // 3. FIX: Warte mit 'setTimeout(0)', bis der Browser die DOM-Änderungen (top/left) gerendert hat
  setTimeout(() => {
    html2canvas(input, { 
      useCORS: true, 
      scale: 2,
      // Füge diese hinzu, um die Chancen weiter zu verbessern
      allowTaint: true 
    })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'p',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save("mein-ui-design.pdf");

        // --- AUFRÄUMEN NACH DEM EXPORT ---
        // 4. Mache die Handles wieder sichtbar
        activeHandles.forEach(handle => handle.style.display = 'block');

        // 5. Stelle die 'transform'-Positionierung wieder her
        components.forEach(comp => {
          const el = document.getElementById(comp.id);
          if (el) {
            el.style.transform = `translate(${comp.x}px, ${comp.y}px)`;
            el.style.top = '0px';
            el.style.left = '0px';
          }
        });
      });
  }, 0); // 0ms Timeout reicht aus, um es an das Ende der Event-Queue zu schieben
};


// 4. Die Haupt-App-Komponente (unverändert)
function App() {
  const [components, setComponents] = useState([]);
  const [selectedComponentId, setSelectedComponentId] = useState(null);
  const canvasRef = useRef(null);

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

  const onStopDrag = (e, data, id) => {
    setComponents(prevComponents => 
      prevComponents.map(comp => 
        comp.id === id ? { ...comp, x: data.x, y: data.y } : comp
      )
    );
  };

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

  const updateComponent = (id, property, value) => {
    setComponents(prevComponents =>
      prevComponents.map(comp => 
        comp.id === id ? { ...comp, [property]: value } : comp
      )
    );
  };
  
  const selectedComponent = components.find(comp => comp.id === selectedComponentId);

  return (
    <div className="App-Builder">
      
      <Toolbox addComponent={addComponent} />
      
      <div className="main-area">
        <div className="toolbar">
          <button onClick={() => exportToPDF(canvasRef, components)}>Als PDF exportieren</button>
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
          
          {components.map((comp) => (
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
                <div className="drag-handle">::</div>
                {renderComponent(comp)}
              </div>
            </Draggable>
          ))}
          
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