import shapeUtils from './shapeUtils.js';

const canvas = document.querySelector('#container');
canvas.width = 1500;
canvas.height = 600;

const snapTolerance = 15;
const showCoords = false;

const context = canvas.getContext('2d');

let lineMatch;
let dragging;

const drawShape = (shape) => {
    context.strokeStyle = shape.highlighted ? 'blue' : 'black';
    context.stroke(shape.path);
    context.fillStyle = 'lightgrey';
    context.fill(shape.path)
    
    if (showCoords) {
        const points = shapeUtils.getRealPoints(shape.x, shape.y, shape.size, shape.def, shape.rot);
        context.fillStyle = 'black';
        points.forEach(([x, y]) => {
            context.fillText(`(${Math.floor(x)}, ${Math.floor(y)})`, x, y - 5);
        });
    }
}

const shapes = [];

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
        drawShape(shape);
    });

    if (lineMatch !== undefined) {
        context.strokeStyle = 'green';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(lineMatch[0][0], lineMatch[0][1]);
        context.lineTo(lineMatch[1][0], lineMatch[1][1]);
        context.stroke();
        
        
        const closestLine = shapeUtils.getClosestLine(dragging, lineMatch);
        context.beginPath();
        context.moveTo(closestLine[0][0], closestLine[0][1]);
        context.lineTo(closestLine[1][0], closestLine[1][1]);
        context.stroke();

        context.lineWidth = 1;
    }
}
draw();

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (shapeUtils.shapeContainsPoint(context, shapes[i], x, y)) {
            dragging = shapes[i];
            shapeUtils.moveToFront(dragging, shapes);
            break;
        }
    }
    if (dragging !== undefined) {
        shapeUtils.toggleHighlight(dragging);
        draw();
    }
});
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (dragging !== undefined) {
        shapeUtils.updateShapeLocation(dragging, x, y);
        lineMatch = shapeUtils.findMatchingLine(dragging, shapes, snapTolerance);
        draw();
    }
});
canvas.addEventListener('mouseup', () => {
    if (dragging !== undefined) {
        shapeUtils.toggleHighlight(dragging);
        if (lineMatch !== undefined) {
            shapeUtils.snapLine(dragging, lineMatch);
        }
        dragging = undefined;
        lineMatch = undefined;
        draw();
    }
});
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (dragging !== undefined) {
        lineMatch = undefined;
        if (e.buttons === 1) {
            if (e.deltaY < 0) {
                shapeUtils.updateShapeRotation(dragging, dragging.rot + (Math.PI / 16));
            } else {
                shapeUtils.updateShapeRotation(dragging, dragging.rot - (Math.PI / 16));
            }
        } else if (e.buttons === 2) {
            if (e.deltaY < 0) {
                shapeUtils.updateShapeSize(dragging, dragging.size * 1.1);
            } else {
                shapeUtils.updateShapeSize(dragging, dragging.size / 1.1);
            }
        }
        draw();
    }
});
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

window.addEventListener('keydown', (e) => { // not firing on canvas
    const sides = parseInt(e.key);
    if (sides !== NaN && sides > 2) {
        shapes.push(shapeUtils.createShape(100, 100, 20, shapeUtils.regularNGon(sides), 0));
        draw();
    }
});