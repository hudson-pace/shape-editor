import shapeUtils from './shapeUtils.js';
import canvasUtils from './canvasUtils.js';
import gameUtils from './gameUtils.js';
import autoplay from './autoplay.js';

fetch('./defaultGames.json')
  .then((res) => res.json())
  .then((json) => {
    const defaultOneButton = document.querySelector('#default-1-button');
    const defaultTwoButton = document.querySelector('#default-2-button');
    defaultOneButton.disabled = false;
    defaultTwoButton.disabled = false;
    defaultOneButton.addEventListener('click', () => {
      loadGame(json[0]);
    });
    defaultTwoButton.addEventListener('click', () => {
      loadGame(json[1]);
    });
  });
const editor = document.querySelector('#editor');
const game = document.querySelector('#game');
const switchToEditorButton = document.querySelector('#switch-to-editor-button');
switchToEditorButton.addEventListener('click', () => {
    game.style.display = 'none';
    editor.style.display = 'block';
});

const getRandomTile = () => {
  const tiles = getSubShapeList();
  return tiles[Math.floor(Math.random() * tiles.length)];
}

let isAutoplaying = false;

const autoplayCheckbox = document.querySelector('#autoplay-checkbox');
autoplayCheckbox.checked = false;
autoplayCheckbox.addEventListener('change', () => {
  isAutoplaying = autoplayCheckbox.checked;
  if (isAutoplaying) {
    startAutoplay();
  } else {
    stopAutoplay();
  }
});

let firstClick;

let autoplayInterval;
const startAutoplay = () => {
  autoplayInterval = setInterval(() => {
    if (!gameWon && !gameLost) {
      if (firstClick) {
        takeTurn([getRandomTile()], [], []);
      } else {
        const { clickTargets, flagTargets } = autoplay(getSubShapeList());
        takeTurn(clickTargets, flagTargets, []);
      }
    } else {
      resetBoard();
    }
  }, 1000)
}
const stopAutoplay = () => {
  clearInterval(autoplayInterval);
}

let flagCount;
let mineCount;
let gameWon;
let gameLost;

const canvas = document.querySelector('#game-container');
canvas.width = 1500;
canvas.height = 600;
const context = canvas.getContext('2d');
let shapes = [];
const draw = () => {
  canvasUtils.drawCanvas(canvas, context);

  
  shapes.forEach((shape) => {
    context.fillStyle = 'lightblue';
    // context.fill(shape.path, 'evenodd');

    // context.beginPath();
    context.strokeStyle = 'grey';
    context.lineWidth = 1;
    shape.subShapes.forEach((s) => {
      if (s.exposed) {
        if (s.value === -1) {
          context.fillStyle = 'red';
        } else {
          context.fillStyle = 'white';
        }
      } else if (s.flagged) {
        context.fillStyle = 'blue';
      } else {
        context.fillStyle = 'lightblue';
      }
      const path = shapeUtils.createPath(s);
      context.stroke(path);
      context.fill(path);
    });
    // context.stroke();
    context.lineWidth = 2;
    context.strokeStyle = 'black';
    context.stroke(shape.path);
    context.fillStyle = 'yellow';
    shape.subShapes.forEach((s) => {
      const center = shapeUtils.getCenterOfShapeGroup([s]);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillStyle = 'black';
      context.font = '20px serif';
      // context.fillText(`${s.id}`, center[0], center[1]);
      context.fillText(`${s.value > 0 && s.exposed ? s.value : ''}`, center[0], center[1]);
    });
  });
  context.textAlign = 'start';
  context.fillText(`Flags: ${mineCount - flagCount}`, 10, 20);
  if (gameWon) {
    context.fillStyle = 'green';
    context.fillText('You Win.', 10, 50);
  } else if (gameLost) {
    context.fillStyle = 'red';
    context.fillText('You Lose.', 10, 50);
  }
}
draw();

// Fisher-Yates Shuffle
const shuffleArray = (arr) => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const getSubShapeList = () => {
  const subShapes = [];
  shapes.forEach((shape) => {
    subShapes.push(...shape.subShapes);
  });
  return subShapes;
}
const dataInput = document.querySelector('#data-input');
const inputButton = document.querySelector('#input-button');
inputButton.addEventListener('click', (e) => {
  const data = JSON.parse(dataInput.value);
  loadGame(data);
});

const loadGame = (data) => {
  mineCount = data.mineCount;
  shapes = data.shapes;
  shapeUtils.fillShapesFromInputData(shapes);
  resetBoard();
  calculateNeighbors(data.corners);
  draw();
}
const resetBoard = () => {
  firstClick = true;
  gameWon = false;
  gameLost = false;
  flagCount = 0;
  const subShapes = getSubShapeList();
  subShapes.forEach((ss) => {
    ss.value = 0;
    ss.exposed = false;
    ss.flagged = false;
  });
  draw();
}

const placeMines = (startingTile) => {
  const clearTiles = [startingTile, ...startingTile.neighbors]; // The starting tile and its neighbors should be empty.
  const subShapes = getSubShapeList();
  let shuffledSubShapes;
  let notClear = true;
  while (notClear) {
    notClear = false;
    shuffledSubShapes = shuffleArray(subShapes);
    for (let i = 0; i < mineCount; i++) {
      if (clearTiles.find((tile) => tile === shuffledSubShapes[i])) {
        notClear = true;
        break;
      }
    }
  }

  for (let i = 0; i < mineCount; i++) {
    shuffledSubShapes[i].value = -1;
    shuffledSubShapes[i].neighbors.forEach((n) => {
      if (n.value !== -1) {
        n.value += 1;
      }
    });
  }
  draw();
}

const calculateNeighbors = (corners) => {
  shapes.forEach((shape) => {
    shape.subShapes.forEach((subShape) => {
      calculateNeighborsOfSubShape(subShape, shape, corners);
    });
  });
}

const subShapesShareLine = (s1, s2) => {
  for (let i = 0; i < s1.lines.length; i++) {
    for (let j = 0; j < s2.lines.length; j++) {
      const line1 = s1.lines[i];
      const line2 = s2.lines[j];
      if ((line1[0] === line2[0] && line1[1] === line2[1]) || (line1[0] === line2[1] && line1[1] === line2[0])) {
        return true;
      }
    }
  }
  return false;
}

const calculateNeighborsOfSubShape = (subShape, shape, corners) => {
  const neighbors = [];
  
  if (corners) {
    subShape.points.forEach((point) => {
      const neighbor = shape.subShapes.filter((ss) => ss !== subShape && !neighbors.find((n) => n === ss) && ss.points.find((p) => p === point));
      if (neighbor.length > 0) {
        neighbors.push(...neighbor);
      }
    });
  } else {
    shape.subShapes.forEach((ss) => {
      if (ss !== subShape && subShapesShareLine(subShape, ss)) {
        neighbors.push(ss);
      }
    });
  }
  subShape.neighbors = neighbors;
}
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

const showTile = (tile) => {
  tile.exposed = true;
  if (tile.value === 0) {
    tile.neighbors.forEach((n) => {
      if (!n.exposed) {
        showTile(n);
      }
    });
  } else if (tile.value === -1) {
    gameLost = true;
  }
}

const checkForWin = () => {
  if (flagCount !== mineCount) {
    return false;
  }
  const tiles = getSubShapeList();
  for (let i = 0; i < tiles.length; i++) {
    if (!tiles[i].flagged && !tiles[i].exposed) {
      return false;
    }
  }
  gameWon = true;
  return true;
}

const takeTurn = (clickTargets, flagTargets, revealTargets) => {
  clickTargets.forEach((tile) => {
    leftClickOnTile(tile);
  });
  flagTargets.forEach((tile) => {
    rightClickOnTile(tile);
  });
  revealTargets.forEach((tile) => {
    leftAndRightClickOnTile(tile);
  });
  checkForWin();
  draw();
}

const leftClickOnTile = (tile) => {
  if (!tile.flagged) {
    if (firstClick) {
      placeMines(tile);
      firstClick = false;
    }
    showTile(tile);
  }
}
const rightClickOnTile = (tile) => {
  if (!tile.exposed) {
    if (tile.flagged) {
      tile.flagged = false;
      flagCount--;
    } else {
      tile.flagged = true;
      flagCount++;
    }
  }
}
const leftAndRightClickOnTile = (tile) => {
  if (tile.exposed) {
    if (gameUtils.countNeighboringFlags(tile) === tile.value) {
      showUnflaggedNeighbors(tile);
    }
  }
}

canvas.addEventListener('mousedown', (e) => {
  if (gameWon || gameLost || isAutoplaying) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  shapes.forEach((shape) => {
    if (shapeUtils.shapeContainsPoint(context, shape, x, y)) {
      const subShape = shapeUtils.getSubShape(context, shape, x, y);
      if (subShape) {
        if (e.buttons === 1) { // leftclick
          takeTurn([subShape], [], []);
        } else if (e.buttons === 2) { //rightclick
          takeTurn([], [subShape], []);
        } else if (e.buttons === 3) {
          takeTurn([], [], [subShape]);
        }
      }
    }
  })
});

const showUnflaggedNeighbors = (tile) => {
  tile.neighbors.forEach((n) => {
    if (!n.flagged && !n.exposed) {
      showTile(n);
    }
  });
}