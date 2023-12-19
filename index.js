import shapeUtils from './shapeUtils.js';

const canvas = document.querySelector('#container');
canvas.width = 1500;
canvas.height = 600;

const snapTolerance = 30;
const showCoords = false;

const context = canvas.getContext('2d');

let lineMatch;
let dragging;
let selection = [];

let draggingBox;
let boxStart;
let boxEnd;

const drawShape = (shape) => {
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

    context.strokeStyle = 'grey';
    context.lineWidth = 2;
    context.fillStyle = 'black';
    if (lineMatch !== undefined) {
        lineMatch.matchingPoints.forEach((pair) => {
            context.beginPath();
            context.moveTo(pair[0][0], pair[0][1]);
            context.lineTo(pair[1][0], pair[1][1]);
            context.stroke();
            pair.forEach((point) => {
                context.beginPath();
                context.arc(point[0], point[1], 2, 0, Math.PI * 2);
                context.fill();
            });
        });
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
                if (e.ctrlKey) {
                    const subShape = shapeUtils.getSubShape(context, shape, x, y);
                    if (subShape !== undefined && shape !== undefined && shape.subShapes.length > 1) {
                        shapeUtils.removeSubShape(shape, subShape);
                        shapes.push(subShape);
                        selection.forEach((s) => shapeUtils.toggleHighlight(s));
                        selection = [];
                        dragging = false;
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
            for (let i = 0; i < shapes.length; i++) {
                const shape = shapes[i];
                if (shape !== selection[0] && selection[0] !== undefined) {
                    lineMatch = shapeUtils.findMatchingLine(selection[0], shape, snapTolerance);
                    if (lineMatch.matchingPoints.length > 0) {
                        break;
                    } else {
                        lineMatch = undefined;
                    }
                }
            }
        }
        draw();
    }
});
canvas.addEventListener('mouseup', () => {
    if (dragging) {
        if (lineMatch !== undefined) {
            shapeUtils.snapLine(lineMatch);
            const index = shapes.findIndex(((s) => s === lineMatch.shapes[0]));
            shapes.splice(index, 1);
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
});