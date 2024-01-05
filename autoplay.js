import gameUtils from './gameUtils.js';


const getFlagCountRequirement = (tiles, flagCount) => {
    return {
        tiles: tiles.filter((t) => !t.flagged && !t.exposed), // All unflagged and unexposed tiles
        count: flagCount // The number of remaining flags
    }
}

const constraintsAreEqual = (c1, c2) => {
    if (c1.count !== c2.count || c1.tiles.length !== c2.tiles.length) {
        return false;
    }
    for (let i = 0; i < c1.tiles.length; i++) {
        if (c1.tiles[i] !== c2.tiles[i]) {
            return false;
        }
    }
    return true;
};

// Constraints targeting the same tiles with the same count are redundant. Return a list with no repeats.
const reduceConstraints = (constraints) => {
    const uniqueConstraints = [];
    constraints.forEach((constraint) => {
        if (!uniqueConstraints.find((c) => constraintsAreEqual(c, constraint))) {
            uniqueConstraints.push(constraint);
        }
    });
    return uniqueConstraints;
}

const autoplay = (tiles, getFlagCount) => {
    let constraints = gameUtils.getFrontier(tiles).map((tile) => {
        return {
            tiles: gameUtils.getUnexposedUnflaggedNeighbors(tile).sort((a, b) => a.id < b.id),
            count: tile.value - gameUtils.countNeighboringFlags(tile),
        }
    });

    constraints = reduceConstraints(constraints);

    const clickTargets = new Set();
    const flagTargets = new Set();

    constraints.forEach((constraint) => {
        const relevantConstraints = findRelevantConstraints(constraints, constraint);
        const viableStrings = getViableStrings(generateBinaryStrings(constraint.tiles.length, constraint.count), relevantConstraints, constraint);

        if (viableStrings.length !== 0) {
            for (let i = 0; i < constraint.tiles.length; i++) {
                let allMine = true;
                let allSafe = true;
                viableStrings.forEach((s) => {
                    if (s.charAt(i) === '1') {
                        allSafe = false;
                    } else if (s.charAt(i) === '0') {
                        allMine = false;
                    }
                });
                if (allMine) {
                    flagTargets.add(constraint.tiles[i]);
                } else if (allSafe) {
                    clickTargets.add(constraint.tiles[i]);
                }
            }
        }
    });

    if (clickTargets.size === 0 && flagTargets.size === 0) {
        if (minimumMinesToFillConstraints(constraints) === getFlagCount()) {
            const frontierTiles = getAllTilesFromConstraints(constraints);
            for (let i = 0; i < tiles.length; i++) {
                if (!tiles[i].exposed && !tiles[i].flagged && !frontierTiles.includes(tiles[i])) {
                    clickTargets.add(tiles[i]);
                }
            }
        }
    }
    return {
        clickTargets,
        flagTargets,
    }
}
export default autoplay;

// Provided a list of binary strings (where a 1 indicates a mine), and a list of constraints,
// Return the strings which can fulfill every constraint.
const getViableStrings = (binaryStrings, constraints, constraint, firstOnly = false) => {
    const viableStrings = [];
    for (let j = 0; j < binaryStrings.length; j++) {
        const s = binaryStrings[j];
        const mines = [];
        const safe = [];
        for (let i = 0; i < s.length; i++) {
            if (s.charAt(i) === '1') {
                mines.push(constraint.tiles[i]);
            } else {
                safe.push(constraint.tiles[i]);
            }
        }
        let viable = true;
        for (let i = 0; i < constraints.length; i++) {
            if (!fitsConstraint(constraints[i], mines, safe)) {
                viable = false;
                break;
            }
        }
        if (viable) {
            if (firstOnly) {
                return [s];
            } else {
            }
            viableStrings.push(s);
        }
    }
    return viableStrings;
}

// Given a list of constraints and a specific constraint, return a list of all relevant constraints.
// Specifically, all constraints which contain at least one tile contained in the given constraint.
// ie, if constraint deals with tiles (a,b,c), return constraints dealing with (a,b), (b), (c,d,e), etc.
const findRelevantConstraints = (constraints, constraint) => {
    const relevantConstraints = [];
    constraints.forEach((c) => {
        if (c.tiles.find((t) => constraint.tiles.find((tile) => t === tile))) {
            relevantConstraints.push(c);
        }
    });
    return relevantConstraints;
}

// Provides a constraint, and lists of tiles that are mines and safe. Tests if those lists fit the constraint.
// Returns false if that combination of tiles would necessarily mean too many or too few mines.
const fitsConstraint = (constraint, mines, safe) => {
    let mineCount = 0;
    let safeCount = 0;
    let undecidedCount = 0;
    constraint.tiles.forEach((tile) => {
        if (mines.includes(tile)) {
            mineCount++;
        } else if (safe.includes(tile)) {
            safeCount++;
        } else {
            undecidedCount++;
        }
    });
    // Undecided tiles can go either way. If all undecided are mines and the count is too low,
    // or if all undecided are safe and the count is too high, the constraint is violated.
    if (undecidedCount + mineCount < constraint.count || mineCount > constraint.count) {
        return false;
    }
    return true;
}



const generateBinaryStrings = (length, oneCount) => {
    if (length === 0) {
        return '';
    }
    const total = Math.pow(2, length);
    const strings = [];
    for (let i = 0; i < total; i++) {
        const str = i.toString(2);
        if (str.split('1').length === oneCount + 1) {
            const pad = length - str.length;
            strings.push('0'.repeat(pad).concat(str));
        }
    }
    return strings;
}

const getAllTilesFromConstraints = (constraints) => {
    const tiles = [];
    constraints.forEach((c) => {
        c.tiles.forEach((t) => {
            if (!tiles.includes(t)) {
                tiles.push(t);
            }
        });
    });
    return tiles;
}
const minimumMinesToFillConstraints = (constraints) => {
    const tiles = getAllTilesFromConstraints(constraints).sort((a, b) => a.id < b.id);
    for (let i = 0; i <= tiles.length; i++) {
        if (getViableStrings(generateBinaryStrings(tiles.length, i), constraints, { tiles }, true).length !== 0) {
            return i;
        }
    }
    return -1;
}
const maximumMinesToFillConstraints = (constraints) => {
    const tiles = getAllTilesFromConstraints(constraints).sort((a, b) => a.id < b.id);
    for (let i = tiles.length; i >= 0; i--) {
        if (getViableStrings(generateBinaryStrings(tiles.length, i), constraints, { tiles }, true).length !== 0) {
            return i;
        }
    }
    return -1;
}