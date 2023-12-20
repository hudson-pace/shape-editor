import shapeUtils from './shapeUtils.js';

const editor = document.querySelector('#editor');
const game = document.querySelector('#game');
const switchToEditorButton = document.querySelector('#switch-to-editor-button');
switchToEditorButton.addEventListener('click', () => {
    game.style.display = 'none';
    editor.style.display = 'block';
});

const canvas = document.querySelector('#game-container');
canvas.width = 1500;
canvas.height = 600;
const context = canvas.getContext('2d');
let shapes = [];
let highlighted = [];
const draw = () => {
  context.fillStyle = 'whitesmoke';
  context.strokeStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(canvas.width, 0);
  context.lineTo(canvas.width, canvas.height);
  context.lineTo(0, canvas.height);
  context.closePath();
  context.stroke();

  
  shapes.forEach((shape) => {
    context.fillStyle = 'lightgrey';
    context.fill(shape.path, 'evenodd');

    context.beginPath();
    context.strokeStyle = 'grey';
    context.lineWidth = 1;
    shape.subShapes.forEach((s) => {
        s.lines.forEach((l) => {
            context.moveTo(l[0][0], l[0][1]);
            context.lineTo(l[1][0], l[1][1]);
        });
        
    });
    context.stroke();
    context.lineWidth = 2;
    context.strokeStyle = shape.highlighted ? 'blue' : 'black';
    context.stroke(shape.path);
    context.fillStyle = 'yellow';
    highlighted.forEach((subShape) => {
      context.fill(shapeUtils.createPath(subShape));
    });
    shape.subShapes.forEach((s) => {
      const center = shapeUtils.getCenterOfShapeGroup([s]);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = 'black';
      context.font = '20px serif';
      context.fillText(`${s.id}`, center[0], center[1]);
    });
  });
}
draw();

const dataInput = document.querySelector('#data-input');
const inputButton = document.querySelector('#input-button');
inputButton.addEventListener('click', () => {
  const data = JSON.parse(dataInput.value);
  shapes = data.shapes;
  shapeUtils.fillShapesFromInputData(shapes);
  draw();
  calculateNeighbors();
});

const calculateNeighbors = () => {
  shapes.forEach((shape) => {
    shape.subShapes.forEach((subShape) => {
      calculateNeighborsOfSubShape(subShape, shape);
    });
  });
  console.log(shapes);
}

const calculateNeighborsOfSubShape = (subShape, shape) => {
  const neighbors = [];
  subShape.points.forEach((point) => {
    const neighbor = shape.subShapes.filter((ss) => ss !== subShape && !neighbors.find((n) => n === ss) && ss.points.find((p) => p === point));
    if (neighbor.length > 0) {
      neighbors.push(...neighbor);
    }
  });
  subShape.neighbors = neighbors;
}

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  shapes.forEach((shape) => {
    if (shapeUtils.shapeContainsPoint(context, shape, x, y)) {
      const subShape = shapeUtils.getSubShape(context, shape, x, y);
      if (subShape) {
        highlighted = subShape.neighbors;
        draw();
      }
    }
  })
});

canvas.addEventListener('mouseup', () => {
  highlighted = [];
  draw();
});