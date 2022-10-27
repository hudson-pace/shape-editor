const canvas = document.querySelector('#container');
canvas.width = 1500;
canvas.height = 600;

const snapTolerance = 15;
const showCoords = false;

const context = canvas.getContext('2d');

const getLines = (shape) => {
    const lines = [];
    const points = getRealPoints(shape.x, shape.y, shape.width, shape.height, shape.def, shape.rot);
    for (let i = 0; i < points.length; i++) {
        if (i + 1 === points.length) {
            lines.push([points[i], points[0]]);
        } else {
            lines.push([points[i], points[i + 1]]);
        }
    }
    return lines;
}

const regularNGon = (n) => {
    const def = [];
    for (let i = 0; i < n; i++) {
        def.push([
            Math.cos((2 * Math.PI * i) / n),
            Math.sin((2 * Math.PI * i) / n),
        ]);
    }
    return def;
}

const rotatePoint = (x, y, rot) => {
    return [
        (x * Math.cos(rot)) - (y * Math.sin(rot)),
        (y * Math.cos(rot)) + (x * Math.sin(rot)),
    ]
}

const toggleHighlight = (shape) => {
    shape.highlighted = !shape.highlighted;
}

const getRealPoints = (x, y, width, height, def, rot) => {
    return def.map(([x2, y2]) => {
        const [x3, y3] = rotatePoint(x2, y2, rot);
        return [(x3 * width) + x, (y3 * height) + y]
    });
}

const createPath = (x, y, width, height, def, rot) => {
    const realPoints = getRealPoints(x, y, width, height, def, rot);
    const path = new Path2D();
    path.moveTo(realPoints[0][0], realPoints[0][1]);
    realPoints.slice(1).forEach((point) => {
        path.lineTo(point[0], point[1]);
    });
    path.closePath();
    return path;
}
const createShape = (x, y, width, height, def, rot) => {
    return {
        x,
        y,
        width,
        height,
        def,
        path: createPath(x, y, width, height, def, rot),
        rot,
        highlighted: false,
    }
}
const drawShape = (shape) => {
    context.strokeStyle = shape.highlighted ? 'blue' : 'black';
    context.stroke(shape.path);

    if (showCoords) {
        const points = getRealPoints(shape.x, shape.y, shape.width, shape.height, shape.def, shape.rot);
        context.fillStyle = 'black';
        points.forEach(([x, y]) => {
            context.fillText(`(${Math.floor(x)}, ${Math.floor(y)})`, x, y - 5);
        });
    }
}
const shapeContainsPoint = (shape, x, y) => {
    return context.isPointInPath(shape.path, x, y);
}

const updateShapeLocation = (shape, x, y) => {
    shape.x = x;
    shape.y = y;
    shape.path = createPath(shape.x, shape.y, shape.width, shape.height, shape.def, shape.rot);
}
const updateShapeRotation = (shape, rot) => {
    shape.rot = rot;
    shape.path = createPath(shape.x, shape.y, shape.width, shape.height, shape.def, shape.rot);
}
const updateShapeSize = (shape, width, height) => {
    shape.width = width;
    shape.height = height;
    shape.path = createPath(shape.x, shape.y, shape.width, shape.height, shape.def, shape.rot);
}

const snapLine = (shape, line) => {
    let lines = getLines(shape);
    let closestLine = lines[0];
    let min = distanceBetweenLinePoints(closestLine, line);
    for (let i = 1; i < lines.length; i++) {
        const dist = distanceBetweenLinePoints(lines[i], line);
        if (dist < min) {
            closestLine = lines[i];
            min = dist;
        }
    }
    const sizeMult = actualDistanceBetweenPoints(line[0], line[1]) / actualDistanceBetweenPoints(closestLine[0], closestLine[1]);
    updateShapeSize(shape, shape.width * sizeMult, shape.height * sizeMult);
    const rotMult = getRotMult(line, closestLine);
    updateShapeRotation(shape, shape.rot + rotMult);


    lines = getLines(shape);
    closestLine = lines[0];
    min = distanceBetweenLinePoints(closestLine, line);
    for (let i = 1; i < lines.length; i++) {
        const dist = distanceBetweenLinePoints(lines[i], line);
        if (dist < min) {
            closestLine = lines[i];
            min = dist;
        }
    }
    updateShapeLocation(shape, shape.x + (line[0][0] - closestLine[0][0]), shape.y + (line[0][1] - closestLine[0][1]));
}

const getRotMult = (line, l) => {
    if (Math.abs(line[0][0] - l[0][0]) > Math.abs(line[1][0] - l[0][0])) {
        const tmp = line[0];
        line[0] = line[1];
        line[1] = tmp;
    }
    const dx = line[1][0] - line[0][0];
    const dy = line[1][1] - line[0][1];

    const dx2 = l[1][0] - l[0][0];
    const dy2 = l[1][1] - l[0][1];

    const ang = Math.atan2(dy, dx);
    const ang2 = Math.atan2(dy2, dx2);
    
    return (ang - ang2);
}

const actualDistanceBetweenPoints = (p1, p2) => {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

const distanceBetweenPoints = (p1, p2) => {
    const dist = (Math.abs(p1[0] - p2[0]) + Math.abs(p1[1] - p2[1]));
    return dist;
}

const distanceBetweenLinePoints = (l1, l2) => {
    return Math.min(
        distanceBetweenPoints(l1[0], l2[0]) + distanceBetweenPoints(l1[1], l2[1]),
        distanceBetweenPoints(l1[0], l2[1]) + distanceBetweenPoints(l1[1], l2[0]),
    )
}

const findMatchingLine = (shape, shapes) => {
    const neighboringShapes = shapes.filter((s) => (s !== shape
        && Math.abs(s.x - shape.x) - snapTolerance < (s.width + shape.width)
        && Math.abs(s.y - shape.y) - snapTolerance < (s.height + shape.height)
        ));
    if (neighboringShapes.length > 0) {
        const lines = getLines(shape);
        for (let i = 0; i < neighboringShapes.length; i++) {
            const s = neighboringShapes[i];
            const nLines = getLines(neighboringShapes[i]);
            for (let j = 0; j < lines.length; j++) {
                const l = lines[j];
                const match = nLines.find((l2) => (
                    l !== l2
                    && (
                        distanceBetweenPoints(l[0], l2[0]) < snapTolerance && distanceBetweenPoints(l[1], l2[1]) < snapTolerance
                        || distanceBetweenPoints(l[0], l2[1]) < snapTolerance && distanceBetweenPoints(l[1], l2[0]) < snapTolerance)
                ));
                if (match) {
                    return match;
                }
            }
        }
    }
}

const shapes = [];

for (let i = 0; i < 10; i++) {
    shapes.push(createShape(((i+1) * 30), ((i+1) * 30), 30, 30, regularNGon(i + 3), 0))
}

let lineMatch;

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
        // context.lineWidth = 10;
        context.beginPath();
        context.moveTo(lineMatch[0][0], lineMatch[0][1]);
        context.lineTo(lineMatch[1][0], lineMatch[1][1]);
        context.stroke();
        context.lineWidth = 1;
    }
}
draw();

let dragging;

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragging = shapes.find((shape) => shapeContainsPoint(shape, x, y));
    if (dragging !== undefined) {
        toggleHighlight(dragging);
        draw();
    }
});
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (dragging !== undefined) {
        updateShapeLocation(dragging, x, y);
        lineMatch = findMatchingLine(dragging, shapes);
        draw();
    }
});
canvas.addEventListener('mouseup', () => {
    if (dragging !== undefined) {
        toggleHighlight(dragging);
        if (lineMatch !== undefined) {
            snapLine(dragging, lineMatch);
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
                updateShapeRotation(dragging, dragging.rot + (Math.PI / 8));
            } else {
                updateShapeRotation(dragging, dragging.rot - (Math.PI / 8));
            }
        } else if (e.buttons === 2) {
            if (e.deltaY < 0) {
                updateShapeSize(dragging, dragging.width * 1.1, dragging.height * 1.1);
            } else {
                updateShapeSize(dragging, dragging.width / 1.1, dragging.height / 1.1);
            }
        }
        draw();
    }
});
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});
