import shapeUtils from './shapeUtils.js';

const canvas = document.querySelector('#container');
canvas.width = 1500;
canvas.height = 600;

const snapTolerance = 15;
const showCoords = false;

const context = canvas.getContext('2d');

let lineMatch;
let dragging;
let selection = [];

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
        
        
        const closestLine = shapeUtils.getClosestLine(selection[0], lineMatch);
        context.beginPath();
        context.moveTo(closestLine[0][0], closestLine[0][1]);
        context.lineTo(closestLine[1][0], closestLine[1][1]);
        context.stroke();

        context.lineWidth = 1;
    }
}
draw();

let prevX;
let prevY;

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    prevX = x;
    prevY = y;
    for (let i = shapes.length - 1; i >= 0; i--) {
        if (shapeUtils.shapeContainsPoint(context, shapes[i], x, y)) {
            const shape = shapes[i];
            dragging = true;
            shapeUtils.moveToFront(shape, shapes);
            if (selection.includes(shape)) {
                if (e.shiftKey) {
                    const index = selection.findIndex((s) => s === shape);
                    selection.splice(index, 1);
                    shapeUtils.toggleHighlight(shape);
                }
            } else {
                if (e.shiftKey) {
                    selection.push(shape);
                    shapeUtils.toggleHighlight(shape);
                } else {
                    selection.forEach((s) => {
                        shapeUtils.toggleHighlight(s);
                    });
                    selection = [shape];
                    shapeUtils.toggleHighlight(shape);
                }
            }
            draw();
            break;
        }
    }
    if (!dragging) {
        selection.forEach((s) => {
            shapeUtils.toggleHighlight(s);
        });
        selection = [];
        draw();
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dx = x - prevX;
    const dy = y - prevY;
    prevX = x;
    prevY = y;

    if (dragging) {
        shapeUtils.updateShapeGroupLocation(selection, dx, dy);
        lineMatch = shapeUtils.findMatchingLine(selection[0], shapes, snapTolerance);
        draw();
    }
});
canvas.addEventListener('mouseup', () => {
    if (dragging) {
        if (lineMatch !== undefined) {
            shapeUtils.snapLine(selection[0], lineMatch);
        }
        dragging = false
        lineMatch = undefined;
        draw();
    }
});
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (dragging) {
        lineMatch = undefined;
        if (e.buttons === 1) {
            if (e.deltaY < 0) {
                shapeUtils.updateShapeGroupRotation(selection, Math.PI / 16);
            } else {
                shapeUtils.updateShapeGroupRotation(selection, -1 * Math.PI / 16);
            }
        } else if (e.buttons === 2) {
            if (e.deltaY < 0) {
                shapeUtils.updateShapeGroupSize(selection, 1.1);
            } else {
                shapeUtils.updateShapeGroupSize(selection, 1 / 1.1);
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