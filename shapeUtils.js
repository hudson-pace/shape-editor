const createShape = (x, y, size, def, rot) => {
    return {
        x,
        y,
        size,
        def,
        path: createPath(x, y, size, def, rot),
        rot,
        highlighted: false,
    }
}
const createPath = (x, y, size, def, rot) => {
    const realPoints = getRealPoints(x, y, size, def, rot);
    const path = new Path2D();
    path.moveTo(realPoints[0][0], realPoints[0][1]);
    realPoints.slice(1).forEach((point) => {
        path.lineTo(point[0], point[1]);
    });
    path.closePath();
    return path;
}
const getRealPoints = (x, y, size, def, rot) => {
    return def.map(([x2, y2]) => {
        const [x3, y3] = rotatePoint(x2, y2, rot);
        return [(x3 * size) + x, (y3 * size) + y]
    });
}
const toggleHighlight = (shape) => {
    shape.highlighted = !shape.highlighted;
}
const updateShapeLocation = (shape, x, y) => {
    shape.x = x;
    shape.y = y;
    shape.path = createPath(shape.x, shape.y, shape.size, shape.def, shape.rot);
}
const updateShapeRotation = (shape, rot) => {
    shape.rot = rot;
    shape.path = createPath(shape.x, shape.y, shape.size, shape.def, shape.rot);
}
const updateShapeSize = (shape, size) => {
    shape.size = size;
    shape.path = createPath(shape.x, shape.y, shape.size, shape.def, shape.rot);
}
const distanceBetweenPoints = (p1, p2) => {
    return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}


const getDifferenceBetweenLines = (l1, l2) => {
    return Math.min(
        distanceBetweenPoints(l1[0], l2[0]) + distanceBetweenPoints(l1[1], l2[1]),
        distanceBetweenPoints(l1[0], l2[1]) + distanceBetweenPoints(l1[1], l2[0]),
    )
}
const findMatchingLine = (shape, shapes, snapTolerance) => {
    const neighboringShapes = shapes.filter((s) => (s !== shape
        && Math.abs(s.x - shape.x) - snapTolerance < (s.size + shape.size)
        && Math.abs(s.y - shape.y) - snapTolerance < (s.size + shape.size)
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

const moveToFront = (shape, shapes) => {
    const i = shapes.findIndex((s) => s === shape);
    shapes.splice(i, 1);
    shapes.push(shape);
}

const getClosestLine = (shape, line) => {
    const lines = getLines(shape);
    let closestLine = lines[0];
    let min = getDifferenceBetweenLines(closestLine, line);
    for (let i = 1; i < lines.length; i++) {
        const dist = getDifferenceBetweenLines(lines[i], line);
        if (dist < min) {
            closestLine = lines[i];
            min = dist;
        }
    }
    return closestLine;
}

const snapLine = (shape, line) => {
    let closestLine = getClosestLine(shape, line);
    const sizeMult = distanceBetweenPoints(line[0], line[1]) / distanceBetweenPoints(closestLine[0], closestLine[1]);
    updateShapeSize(shape, shape.size * sizeMult);
    const rotMult = getRotationBetweenLines(line, closestLine);
    updateShapeRotation(shape, shape.rot + rotMult);

    closestLine = getClosestLine(shape, line);
    updateShapeLocation(shape, shape.x + line[0][0] - closestLine[0][0], shape.y + line[0][1] - closestLine[0][1]);
}

const getRotationBetweenLines = (l1, l2) => {
    const dx = l1[1][0] - l1[0][0];
    const dy = l1[1][1] - l1[0][1];

    const dx2 = l2[1][0] - l2[0][0];
    const dy2 = l2[1][1] - l2[0][1];

    let rotationAngle = (Math.atan2(dy, dx) - Math.atan2(dy2, dx2)) % (Math.PI / 2);

    if (rotationAngle < -1 * Math.PI / 4) {
        rotationAngle += Math.PI / 2;
    } else if (rotationAngle > Math.PI / 4) {
        rotationAngle -= Math.PI / 2;
    }
    return rotationAngle;
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

const getLines = (shape) => {
    const lines = [];
    const points = getRealPoints(shape.x, shape.y, shape.size, shape.def, shape.rot);
    for (let i = 0; i < points.length; i++) {
        if (i + 1 === points.length) {
            lines.push([points[i], points[0]]);
        } else {
            lines.push([points[i], points[i + 1]]);
        }
    }
    lines.forEach((line) => {
        line.sort((p1, p2) => p1[0] < p2[0] || p1[0] === p2[0] && p1[1] < p2[1] ? -1 : 1);
    });
    return lines;
}

const shapeContainsPoint = (context, shape, x, y) => {
    return context.isPointInPath(shape.path, x, y);
}

const shapeUtils = {
    updateShapeLocation,
    updateShapeRotation,
    updateShapeSize,
    createShape,
    regularNGon,
    snapLine,
    toggleHighlight,
    moveToFront,
    shapeContainsPoint,
    getClosestLine,
    getRealPoints,
    findMatchingLine
}

export default shapeUtils;