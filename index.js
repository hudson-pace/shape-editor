const canvas = document.querySelector('#container');
canvas.width = 1500;
canvas.height = 600;

const context = canvas.getContext('2d');

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

const createPath = (x, y, width, height, def, rot) => {
    const realPoints = def.map(([x2, y2]) => {
        const [x3, y3] = rotatePoint(x2, y2, rot);
        return [(x3 * width) + x, (y3 * height) + y]
    });
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
        rot
    }
}
const drawShape = (shape) => {
    context.stroke(shape.path);
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

const shapes = [];

for (let i = 0; i < 10; i++) {
    shapes.push(createShape(((i+1) * 30), ((i+1) * 30), 30, 30, regularNGon(i + 3), 0))
}

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
}
draw();

let dragging;

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragging = shapes.find((shape) => shapeContainsPoint(shape, x, y));
});
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (dragging !== undefined) {
        updateShapeLocation(dragging, x, y);
        draw();
    }
});
canvas.addEventListener('mouseup', () => {
    dragging = undefined;
});
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (dragging !== undefined) {
        updateShapeRotation(dragging, dragging.rot + (e.deltaY / 400));
        draw();
    }
});