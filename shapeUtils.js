const createShape = (x, y, size, def, rot) => {
    const shape = {
        highlighted: false,
        points: [...def],
    }

    const center = getCenterOfShapeGroup([shape]);
    
    updatePoints(shape, center, x, y, size, rot);
    
    return shape;
}
const createPath = (shape) => {
    const realPoints = shape.points
    const path = new Path2D();
    path.moveTo(realPoints[0][0], realPoints[0][1]);
    realPoints.slice(1).forEach((point) => {
        path.lineTo(point[0], point[1]);
    });
    path.closePath();
    return path;
}
const updatePoints = (shape, center, dx, dy, size, rot) => {
    shape.points = shape.points.map((p) => {
        const [x, y] = rotatePoint(p[0] - center[0], p[1] - center[1], rot);
        return [(x * size) + center[0] + dx, (y * size) + center[1] + dy];
    });
    shape.path = createPath(shape);
}
const toggleHighlight = (shape) => {
    shape.highlighted = !shape.highlighted;
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
    const lines = getLines(shape, true);
    for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i];
        if (s !== shape) {
            const nLines = getLines(s, true);
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
    const lines = getLines(shape, true);
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

    const center = getCenterOfShapeGroup([shape]);
    updatePoints(shape, center, 0, 0, sizeMult, 0);

    const rot = getRotationBetweenLines(line, closestLine);
    updatePoints(shape, center, 0, 0, 1, rot);

    closestLine = getClosestLine(shape, line);

    updatePoints(shape, center, line[0][0] - closestLine[0][0], line[0][1] - closestLine[0][1], 1, 0);
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

const getLineMidPoint = (l) => {
    return [
        (l[0][0] + l[1][0]) / 2,
        (l[0][1] + l[1][1]) / 2,
    ];
}

const getLines = (shape, subsections = false) => {
    const lines = [];
    const points = shape.points
    for (let i = 0; i < points.length; i++) {
        let line;
        if (i + 1 === points.length) {
            line = [points[i], points[0]];
        } else {
            line = [points[i], points[i + 1]];
        }
        lines.push(line);

        if (subsections) {
            const midPoint = getLineMidPoint(line);
            lines.push([line[0], midPoint]);
            lines.push([midPoint, line[1]]);
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

const updateShapeGroupLocation = (shapeGroup, dx, dy) => {
    const center = getCenterOfShapeGroup(shapeGroup);
    shapeGroup.forEach((shape) => {
        updatePoints(shape, center, dx, dy, 1, 0);
    });
}
const updateShapeGroupRotation = (shapeGroup, rotation) => {
    const center = getCenterOfShapeGroup(shapeGroup);
    shapeGroup.forEach((shape) => {
        updatePoints(shape, center, 0, 0, 1, rotation);
    });
}
const updateShapeGroupSize = (shapeGroup, sizeMultiplier) => {
    const center = getCenterOfShapeGroup(shapeGroup);
    shapeGroup.forEach((shape) => {
        updatePoints(shape, center, 0, 0, sizeMultiplier, 0);
    });
}

const getCenterOfShapeGroup = (shapeGroup) => {
    let top, right, bottom, left;
    shapeGroup.forEach((shape) => {
        shape.points.forEach((point) => {
            if (top === undefined || point[1] < top) {
                top = point[1];
            }
            if (right === undefined || point[0] > right) {
                right = point[0];
            }
            if (bottom === undefined || point[1] > bottom) {
                bottom = point[1];
            }
            if (left === undefined || point[0] < left) {
                left = point[0];
            }
        });
    });
    return [(right + left) / 2, (bottom + top) / 2];
}


const tolerance = 5;
const compareLines = (l1, l2) => {
    return getDifferenceBetweenLines(l1, l2) < tolerance;
}

const getSlope = (l) => {
    if (l[0][0] === l[1][0]) {
        return -1;
    }
    return (l[1][1] - l[0][1]) / (l[1][0] - l[0][0]);
}

const isPointInLine = (p, l) => {
    return (
        Math.abs(getSlope(l) - getSlope([l[0], p])) < tolerance
        && p[0] > l[0][0]
        && p[0] < l[1][0]
        && Math.abs(p[1] - (l[0][1] + (getSlope(l) * (p[0] - l[0][0])))) < tolerance
        && distanceBetweenPoints(p, l[0]) > tolerance
        && distanceBetweenPoints(p, l[1]) > tolerance
    )
}

const getPerimeterPathOfShapeGroup = (context, shapeGroup) => {
    const path = new Path2D();
    const perimeterPoints = getPerimeterPointsInShapeGroup(context, shapeGroup);
    context.strokeStyle = 'red';
    context.lineWidth = 4;
    perimeterPoints.forEach((l) => {
        context.moveTo(l[0][0], l[0][1]);
        context.lineTo(l[1][0], l[1][1]);
        context.stroke();
    });
    context.lineWidth = 1;
}
const getPerimeterPointsInShapeGroup = (context, shapeGroup) => {
    const lines = [];
    const points = [];
    shapeGroup.forEach((shape) => {
        lines.push(...getLines(shape));
        points.push(...shape.points);
    });

    const uniquePoints = [];

    points.forEach((p) => {
        if (!uniquePoints.find((p2) => distanceBetweenPoints(p, p2) < tolerance)) {
            uniquePoints.push(p);
        }
    });

    const uniqueLines = [];
    const repeatedLines = [];

    lines.forEach((l) => {
        if (!repeatedLines.find((l2) => compareLines(l, l2))) {
            const index = uniqueLines.findIndex((l2) => compareLines(l, l2));
            if (index === -1) {
                uniqueLines.push(l);
            } else {
                uniqueLines.splice(index, 1);
                repeatedLines.push(l);
            }
        }
    });

    for (let i = 0; i < uniqueLines.length; i++) {
        const l = uniqueLines[i];
        for (let j = 0; j < uniquePoints.length; j++) {
            const p = uniquePoints[j];
            if (isPointInLine(p, l)) {
                uniqueLines.splice(i, 1);
                i--;

                [[l[0], p], [p, l[1]]].forEach((l1) => {
                    if (!repeatedLines.find((l2) => compareLines(l1, l2))) {
                        const index = uniqueLines.findIndex((l2) => compareLines(l1, l2));
                        if (index === -1) {
                            uniqueLines.push(l1);
                        } else {
                            uniqueLines.splice(index, 1);
                            repeatedLines.push(l1);
                        }
                    }
                });
            }
        }
    }
    console.log(`${lines.length} vs ${uniqueLines.length}`)

    return uniqueLines;
}

const shapeUtils = {
    updateShapeGroupLocation,
    updateShapeGroupRotation,
    updateShapeGroupSize,
    createShape,
    regularNGon,
    snapLine,
    toggleHighlight,
    moveToFront,
    shapeContainsPoint,
    getClosestLine,
    findMatchingLine,
    getPerimeterPathOfShapeGroup,
}

export default shapeUtils;