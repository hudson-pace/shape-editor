import shapeUtils from './shapeUtils.js';
import canvasUtils from './canvasUtils.js';

const canvas = document.querySelector('#editor-container');
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
        const points = shape.points;
        context.fillStyle = 'black';
        points.forEach((p) => {
            context.fillText(`(${Math.floor(p[0])}, ${Math.floor(p[1])})`, p[0], p[1] - 5);
        });
    }
}

const shapes = [];

const draw = () => {
    // Clears the canvas.
    canvasUtils.drawCanvas(canvas, context);

    // Draws translucent blue box showing current selection.
    if (draggingBox) {
        canvasUtils.drawBox(context, 'rgba(0, 0, 255, 0.1)', 'rgba(0, 0, 255, 0.3)', boxStart, boxEnd);
    }

    shapes.forEach((shape) => {
        drawShape(shape);
    });

    // When dragging shapes, and releasing will cause them to snap together.
    // Draws circles at the aligned points, and lines between them.
    if (lineMatch !== undefined) {
        context.strokeStyle = 'grey';
        context.lineWidth = 2;
        context.fillStyle = 'black';
        lineMatch.matchingPoints.forEach((pair) => {
            // Draws line between each pair of points.
            context.beginPath();
            context.moveTo(pair[0][0], pair[0][1]);
            context.lineTo(pair[1][0], pair[1][1]);
            context.stroke();

            // Draws circle at each point.
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

let mouseInCanvas = false;
canvas.addEventListener('mouseenter', () => {
    mouseInCanvas = true;
});
canvas.addEventListener('mouseleave', () => {
    mouseInCanvas = false;
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
        if (e.buttons === 1) { // left mouse button
            const rotationDivisor = e.shiftKey ? 64 : 16; // More precise rotation when shift is held.
            if (e.deltaY < 0) {
                shapeUtils.updateShapeGroupRotation(selection, Math.PI / rotationDivisor);
            } else {
                shapeUtils.updateShapeGroupRotation(selection, -1 * Math.PI / rotationDivisor);
            }
        } else if (e.buttons === 2) { // right mouse button
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

const editor = document.querySelector('#editor');
window.addEventListener('keydown', (e) => { // not firing on canvas. could give canvas a tabindex to let it receive focus.
    if (editor.style.display === 'none') return; // listener attached to window, ignore event if editor is not displayed.
    if (!mouseInCanvas) return;
    const sides = parseInt(e.key);
    if (sides !== NaN && sides > 2) {
        shapes.push(shapeUtils.createShape(prevX, prevY, 20, shapeUtils.regularNGon(sides), 0));
        draw();
    }

    if (e.key === 'd' && selection.length > 0) {
        selection.forEach((shape) => {
            const i = shapes.findIndex((s) => s === shape);
            shapes.splice(i, 1);
        });
        selection = [];
        draw();
    }

    if (e.key === 'l') {
        for (let i = 0; i < shapes.length; i++) {
            if (shapeUtils.shapeContainsPoint(context, shapes[i], prevX, prevY)) {
                const subShape = shapeUtils.getSubShape(context, shapes[i], prevX, prevY);
                console.log(subShape.id);
                break;
            }
        }
    }

    if (e.key === 'c') {
        if (selection.length === 1) {
            shapes.push(shapeUtils.duplicateShape(selection[0]));
            draw();
        }
    }
});

const exportData = () => {
    const mineCountInput = document.querySelector('#mine-count-input');
    const cornersCheckbox = document.querySelector('#corners-checkbox');
    let mineCount = parseInt(mineCountInput.value);
    if (isNaN(mineCount)) {
        mineCount = 0;
    }
    const data = {
        shapes: shapes.map((shape) => ({
            subShapes: shape.subShapes.map((subShape) => ({
                points: subShape.points,
            })),
        })),
        mineCount,
        corners: cornersCheckbox.checked,
    };
    console.log(JSON.stringify(data));
}
const exportButton = document.querySelector('#export-button');
exportButton.addEventListener('click', () => {
    exportData();
});

const game = document.querySelector('#game');
const switchToGameButton = document.querySelector('#switch-to-game-button');
switchToGameButton.addEventListener('click', () => {
    editor.style.display = 'none';
    game.style.display = 'block';
});