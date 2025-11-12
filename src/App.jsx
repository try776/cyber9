import React, { useState, useRef } from 'react'; // createRef entfernt, wird nicht mehr gebraucht
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

// 2. Die PDF Export-Funktion (unverändert)
const exportToPDF = (canvasRef) => {
  console.log("Exportiere PDF...");
  const input = canvasRef.current;
  const activeHandles = input.querySelectorAll('.dragging-active');
  activeHandles.forEach(handle => handle.style.display = 'none');

  html2canvas(input, { useCORS: true, scale: 2 })
    .then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save("mein-ui-design.pdf");

      activeHandles.forEach(handle => handle.style.display = 'block');
    });
};


// 3. Die Haupt-App-Komponente
function App() {
  const [components, setComponents] = useState([]);
  const canvasRef = useRef(null);

  // GEÄNDERT: addComponent
  const addComponent = (type) => {
    const newComponent = {
      id: Date.now(),
      type: type,
      content: `Neues ${type}-Element`,
      // NEU: Wir speichern x und y jetzt direkt im Objekt
      x: 10,
      y: 10
    };
    
    setComponents(prevComponents => [...prevComponents, newComponent]);
  };

  // GEÄNDERT: onStopDrag (jetzt implementiert)
  const onStopDrag = (e, data, id) => {
    // data.x und data.y sind die neuen Positionen
    
    setComponents(prevComponents => 
      prevComponents.map(comp => 
        // Finde die Komponente, die wir verschoben haben
        comp.id === id ? { ...comp, x: data.x, y: data.y } : comp
        // ... und gib ein neues Objekt mit den aktualisierten x/y-Werten zurück
      )
    );
  };

  // Render-Funktion (unverändert)
  const renderComponent = (comp) => {
    switch (comp.type) {
      case 'text':
        return <span>{comp.content}</span>;
      case 'button':
        return <button>{comp.content}</button>;
      case 'image':
        return <img src="https://via.placeholder.com/150" alt="placeholder" style={{ width: '150px' }} />;
      default:
        return null;
    }
  };

  return (
    <div className="App-Builder">
      
      <Toolbox addComponent={addComponent} />
      
      <div className="main-area">
        <div className="toolbar">
          <button onClick={() => exportToPDF(canvasRef)}>Als PDF exportieren</button>
        </div>

        <div className="canvas" ref={canvasRef}>
          
          {components.map((comp) => (
            <Draggable
              key={comp.id}
              // GEÄNDERT: Wir "kontrollieren" jetzt die Position aus unserem State
              position={{ x: comp.x, y: comp.y }} 
              // onStop ruft unsere neue Funktion auf
              onStop={(e, data) => onStopDrag(e, data, comp.id)}
              bounds="parent"
            >
              <div className="draggable-component dragging-active">
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
    </div>
  );
}

export default App;