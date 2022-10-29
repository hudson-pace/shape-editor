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

let draggingBox;
let boxStart;
let boxEnd;

const drawShape = (shape) => {
    context.strokeStyle = shape.highlighted ? 'blue' : 'black';
    context.stroke(shape.path);
    context.fillStyle = 'lightgrey';
    context.fill(shape.path)
    
    if (showCoords) {
        const points = shapeUtils.points;
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

    if (draggingBox) {
        context.fillStyle = 'rgba(0, 0, 255, 0.1)';
        context.fillRect(boxStart[0], boxStart[1], boxEnd[0] - boxStart[0], boxEnd[1] - boxStart[1]);
        context.strokeStyle = 'rgba(0, 0, 255, 0.3)';
        context.moveTo(boxStart[0], boxStart[1]);
        context.lineTo(boxEnd[0], boxStart[1]);
        context.lineTo(boxEnd[0], boxEnd[1]);
        context.lineTo(boxStart[0], boxEnd[1]);
        context.lineTo(boxStart[0], boxStart[1]);
        context.stroke();
    }

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
        draggingBox = true;
        dragging = true;
        boxStart = [x, y];
        boxEnd = [x, y];
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
        if (draggingBox) {
            boxEnd = [x, y];
            selection.forEach((s) => {
                shapeUtils.toggleHighlight(s);
            });
            selection = [];
            const path = new Path2D();
            path.moveTo(boxStart[0], boxStart[1]);
            path.lineTo(boxEnd[0], boxStart[1]);
            path.lineTo(boxEnd[0], boxEnd[1]);
            path.lineTo(boxStart[0], boxEnd[1]);
            path.lineTo(boxStart[0], boxStart[1]);
            shapes.forEach((s) => {
                for (let i = 0; i < s.points.length; i++) {
                    const point = s.points[i];
                    if (context.isPointInPath(path, point[0], point[1])) {
                        selection.push(s);
                        return;
                    }
                }
            });
            selection.forEach((s) => {
                shapeUtils.toggleHighlight(s);
            });
        } else {
            shapeUtils.updateShapeGroupLocation(selection, dx, dy);
            lineMatch = shapeUtils.findMatchingLine(selection[0], shapes, snapTolerance);
        }
        draw();
    }
});
canvas.addEventListener('mouseup', () => {
    if (dragging) {
        if (lineMatch !== undefined) {
            shapeUtils.snapLine(selection[0], lineMatch);
        }
        dragging = false;
        draggingBox = false;
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
    if (e.key === 'c') {
        shapeUtils.getPerimeterPathOfShapeGroup(context, selection);
    }
});