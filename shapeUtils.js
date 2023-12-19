const tolerance = 5;

const createLinesFromPoints = (points) => {
    const lines = [];
    for (let i = 0; i < points.length; i++) {
        let line;
        if (i + 1 === points.length) {
            line = [points[i], points[0]];
        } else {
            line = [points[i], points[i + 1]];
        }
        lines.push(line);
    }
    lines.forEach((line) => {
        line.sort((p1, p2) => p1[0] < p2[0] || (p1[0] === p2[0] && p1[1] < p2[1]) ? -1 : 1);
    });
    return orderLines(lines);
}

const createShape = (x, y, size, def, rot) => {
    const points = def.map((point) => {
        return {
            0: point[0],
            1: point[1],
        }
    });
    const lines = createLinesFromPoints(points);

    const shape = {
        highlighted: false,
        subShapes: [{
            points: [...points],
            lines: [...lines]
        }],
    }
    recalculatePointsAndLines(shape);

    const center = getCenterOfShapeGroup([shape]);
    
    updatePoints(shape, center, x, y, size, rot);
    
    return shape;
}

const createPath = (shape) => {
    const lines = shape.lines;
    const path = new Path2D();

    let chainBeginning;
    let previous;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].length === 1 ? lines[i][0] : lines[i];
        if (chainBeginning === undefined) {
            chainBeginning = line;
            path.moveTo(line[0][0], line[0][1]);
            path.lineTo(line[1][0], line[1][1]);
        } else {
            if (line[0] !== previous[1]) {
                path.lineTo(chainBeginning[0][0], chainBeginning[0][1]);
                chainBeginning = line;
                path.moveTo(line[0][0], line[0][1]);
                path.lineTo(line[1][0], line[1][1]);
            } else {
                path.lineTo(line[1][0], line[1][1]);
            }
        }
        previous = line;
    }
    path.closePath();
    return path;
}
const updatePoints = (shape, center, dx, dy, size, rot) => {
    shape.points.forEach((p) => {
        const [x, y] = rotatePoint(p[0] - center[0], p[1] - center[1], rot);
        p[0] = (x * size) + center[0] + dx;
        p[1] = (y * size) + center[1] + dy;
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
    return distanceBetweenPoints(l1[0], l2[0]) + distanceBetweenPoints(l1[1], l2[1]);
}

const getUniquePointPairsFromLinePairs = (linePairs) => {
    const pointPairs = [];
    linePairs.forEach((linePair) => {
        if (!pointPairs.find((pp) => pp[0] === linePair[0][0])) {
            pointPairs.push([linePair[0][0], linePair[1][0]]);
        }
        if (!pointPairs.find((pp) => pp[0] === linePair[0][1])) {
            pointPairs.push([linePair[0][1], linePair[1][1]]);
        }
    });
    return pointPairs;
}

const findMatchingLine = (shape, shape2, snapTolerance) => {
    const matchingLines = [];
    for (let i = 0; i < shape.lines.length; i++) {
        const l1 = shape.lines[i];
        const l2 = shape2.lines.find((l) => getDifferenceBetweenLines(l, l1) < snapTolerance);
        if (l2) {
            matchingLines.push([l1, l2]);
        } else {
            const l3 = shape2.lines.find((l) => getDifferenceBetweenLines([l[1], l[0]], l1) < snapTolerance)
            if (l3) {
                matchingLines.push([l1, [l3[1], l3[0]]]);
            }
        }
    }
    return {
        shapes: [shape, shape2],
        matchingLines,
        matchingPoints: getUniquePointPairsFromLinePairs(matchingLines)
    }
}

const moveToFront = (shape, shapes) => {
    const i = shapes.findIndex((s) => s === shape);
    shapes.splice(i, 1);
    shapes.push(shape);
}

const snapLine = (lineMatch) => {
    const l1 = lineMatch.matchingLines[0][1];
    const l2 = lineMatch.matchingLines[0][0];
    const shape = lineMatch.shapes[0];
    
    const sizeMult = distanceBetweenPoints(l1[0], l1[1]) / distanceBetweenPoints(l2[0], l2[1]);

    const center = getCenterOfShapeGroup([shape]);
    updatePoints(shape, center, 0, 0, sizeMult, 0);

    const rot = getRotationBetweenLines(l1, l2);
    updatePoints(shape, center, 0, 0, 1, rot);

    updatePoints(shape, center, l1[0][0] - l2[0][0], l1[0][1] - l2[0][1], 1, 0);

    const outerShape = lineMatch.shapes[1];

    shape.subShapes.forEach((subShape) => {
        subShape.points.forEach((point, i) => {
            const index = outerShape.points.findIndex((p) => distanceBetweenPoints(point, p) < tolerance);
            if (index !== -1) {
                subShape.points[i] = outerShape.points[index];
            }
        });
        subShape.lines = createLinesFromPoints(subShape.points);
    });
    outerShape.subShapes.push(...shape.subShapes);
    recalculatePointsAndLines(outerShape);
}

const recalculatePointsAndLines = (shape) => {
    const points = [];
    const lines = [];
    shape.subShapes.forEach((s) => {
        s.points.forEach((p) => {
            if (!points.includes(p)) {
                points.push(p);
            }
        });
        s.lines.forEach((l) => {
           lines.push(l);
        });
    });
    shape.points = points;
    shape.lines = lines;
    reduceLinesToPerimeter(shape);
    shape.lines = orderLines(shape.lines);
    shape.path = createPath(shape);
}

const removeSubShape = (shape, subShape) => {
    if (shape === undefined || subShape === undefined) {
        return;
    }
    const index = shape.subShapes.findIndex((s) => s === subShape);
    if (index !== -1) {
        shape.subShapes.splice(index, 1);

        const points = subShape.points.map((p) => {
            return { ...p };
        });
        const lines = createLinesFromPoints(points);
        subShape.subShapes = [{ points, lines }];

        recalculatePointsAndLines(shape);
        recalculatePointsAndLines(subShape);
    }
}

const getSubShape = (context, shape, x, y) => {
    return shape.subShapes.find((s) => {
        return context.isPointInPath(createPath(s), x, y);
    });
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

const reduceLinesToPerimeter = (shape) => {
    const uniqueLines = [];
    const repeatedLines = [];
    shape.lines.forEach((line) => {
        if (!repeatedLines.find((l) => (l[0] === line[0] && l[1] === line[1]) || (l[1] === line[0] && l[0] === line[1]))) {
            const index = uniqueLines.findIndex((l) => (l[0] === line[0] && l[1] === line[1]) || (l[1] === line[0] && l[0] === line[1]));
            if (index === -1) {
                uniqueLines.push(line);
            } else {
                uniqueLines.splice(index, 1);
                repeatedLines.push(line);
            }
        }
    })

    shape.lines = orderLines(uniqueLines);
    shape.path = createPath(shape);
}

const orderLines = (linesInput) => {
    const lines = [...linesInput];
    const orderedLines = lines.splice(0, 1);
    let previousPoint = orderedLines[0][1];
    while (lines.length > 0) {
        let index = lines.findIndex((line) => line[0] === previousPoint || line[1] === previousPoint);
        if (index === -1) {
            orderedLines.push(lines.splice(0, 1)[0]);
            previousPoint = orderedLines[orderedLines.length - 1][1];
        } else {
            const newLine = lines.splice(index, 1)[0];
            if (newLine[0] === previousPoint) {
                previousPoint = newLine[1];
                orderedLines.push([newLine[0], newLine[1]]);
            } else {
                previousPoint = newLine[0];
                orderedLines.push([newLine[1], newLine[0]]);
            }
        }
    }
    return orderedLines;
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
    findMatchingLine,
    removeSubShape,
    getSubShape,
}

export default shapeUtils;