var gBoard // each cell: {minesAroundCount:X, isShown:Boolian, isMine:Boolian, isMarked:Boolian}
var gGame // {isOn:Boolian, isFirstClick:Boolian, shownCount:X, markedCount:X, startTime:X, strikesCount:X, hintsLeft:X}
var gLevel // {size:X , minesCount:X}
var gTimerInterval
var gHint

const MINE = '*'

function onInit() {
  gLevel = getGlevel()
  gBoard = createMat(gLevel.size, gLevel.size)
  gGame = {
    isOn: true,
    isFirstClick: true,
    shownCount: 0,
    markedCount: 0,
    startTime: null,
    strikesCount: 0,
    hintsLeft: 3,
  }

  changeSmiley('happy')
  clearInterval(gTimerInterval)
  gTimerInterval = null
  gHint = { isOn: false }

  document.querySelector('.timer').innerText = null

  renderStrikesCounter()
  renderMarkedCounter()
  renderBoard(gBoard)
}

function populateBoard(freePos) {
  // Call setMinesNegsCount()
  setMines(gBoard, freePos)

  for (let i = 0; i < gBoard.length; i++) {
    for (let j = 0; j < gBoard[i].length; j++) {
      var currCell = gBoard[i][j]
      if (currCell.isMine) continue

      currCell.minesAroundCount = getMineNegsCount(gBoard, { i, j })
    }
  }
}

function renderBoard(board) {
  var strHTML = ''

  for (let i = 0; i < board.length; i++) {
    strHTML += `<tr>`

    for (let j = 0; j < board[i].length; j++) {
      strHTML += `<td class="cell not-marked pointer" onclick="onCellClicked(this, ${i}, ${j})" oncontextmenu="javascript:onRightClick(this, ${i}, ${j});return false;" data-i="${i}" data-j="${j}"></td>`
    }

    strHTML += `</ tr>`
  }

  const elTable = document.querySelector('.board')
  elTable.innerHTML = strHTML
}

function setMines(board, freePos) {
  //   for (let i = 0; i < gLevel.minesCount; i++) {
  //     var chosenPos = {
  //       i: getRandomInt(0, gLevel.size),
  //       j: getRandomInt(0, gLevel.size),
  //     }
  //     while (
  //       (chosenPos.i === freePos.i && chosenPos.j === freePos.j) ||
  //       board[chosenPos.i][chosenPos.j].isMine
  //     ) {
  //       chosenPos = {
  //         i: getRandomInt(0, gLevel.size),
  //         j: getRandomInt(0, gLevel.size),
  //       }
  //     }
  //     board[chosenPos.i][chosenPos.j].isMine = true
  //   }
  board[1][1].isMine = true
  board[2][2].isMine = true
}

function onCellClicked(elCell, i, j) {
  const currCell = gBoard[i][j]
  if (!gGame.isOn || currCell.isShown || currCell.isMarked) return

  if (gGame.isFirstClick) {
    populateBoard({ i, j })
    console.table(gBoard)
    gGame.isFirstClick = false
    startClock()
  }

  if (gHint.isOn) {
    gHint.isOn = false
    const coordsToShow = getNegsCoords(gBoard, { i, j })
    coordsToShow.push({ i, j })

    for (let i = 0; i < coordsToShow.length; i++) {
      var currPos = coordsToShow[i]
      var currEl = getCellEl(currPos.i, currPos.j)
      currEl.innerText = getCellContent(gBoard[currPos.i][currPos.j])
      currEl.classList.remove('not-marked')
      currEl.classList.remove('pointer')

      setTimeout(() => {
        console.log('here')
        currEl.innerText = null
        currEl.classList.add('not-marked')
        currEl.classList.add('pointer')
      }, 3000)
    }
    return
  }

  elCell.innerText = getCellContent(currCell)
  elCell.classList.remove('not-marked')
  elCell.classList.remove('pointer')
  currCell.isShown = true

  if (currCell.isMine) {
    handleStrikes(elCell)
    return
  }

  gGame.shownCount++

  if (!currCell.minesAroundCount) handleEmptyCell({ i, j })
  if (isWin()) handleGameOver(true)
}

function onRightClick(elCell, i, j) {
  const currCell = gBoard[i][j]

  if (!gGame.isOn || currCell.isShown) return

  elCell.classList.toggle('marked')
  if (currCell.isMarked) {
    gGame.markedCount--
    currCell.isMarked = false
  } else {
    gGame.markedCount++
    currCell.isMarked = true
  }

  renderMarkedCounter()

  if (isWin()) handleGameOver(true)
}

function getNegsCoords(board, pos) {
  const negs = []

  for (let i = pos.i - 1; i <= pos.i + 1; i++) {
    if (i < 0 || i >= board.length) continue
    for (let j = pos.j - 1; j <= pos.j + 1; j++) {
      if (j < 0 || j >= board[i].length) continue
      if (pos.i === i && pos.j === j) continue
      negs.push({ i, j })
    }
  }

  return negs
}

function getMineNegsCount(board, pos) {
  var counter = 0

  for (let i = pos.i - 1; i <= pos.i + 1; i++) {
    if (i < 0 || i >= board.length) continue
    for (let j = pos.j - 1; j <= pos.j + 1; j++) {
      if (j < 0 || j >= board[i].length) continue
      if (pos.i === i && pos.j === j) continue
      if (board[i][j].isMine) counter++
    }
  }

  return counter
}

function isWin() {
  return (
    gGame.markedCount === gLevel.minesCount - gGame.strikesCount &&
    gGame.shownCount === gLevel.size ** 2 - gLevel.minesCount
  )
}

function handleGameOver(isWin) {
  gGame.isOn = false
  removeNotMarkedClass()
  if (isWin) changeSmiley('win')
  else changeSmiley('sad')
}

function getCellContent(cell) {
  if (cell.isMine) return MINE

  if (cell.minesAroundCount) return cell.minesAroundCount

  return null
}

function removeNotMarkedClass() {
  for (let i = 0; i < gBoard.length; i++) {
    for (let j = 0; j < gBoard[i].length; j++) {
      var elCurrCell = getCellEl(i, j)
      elCurrCell.classList.remove('pointer')
      if (gBoard[i][j].isShown) elCurrCell.classList.remove('not-marked')
    }
  }
}

function handleStrikes(elCell) {
  gGame.strikesCount++
  elCell.classList.add('mine')
  renderStrikesCounter()

  if (gGame.strikesCount === 2) handleGameOver(false)
  if (isWin()) handleGameOver(true)
}

function renderStrikesCounter() {
  const elStrikesCounter = document.querySelector('.strikes-counter')
  elStrikesCounter.innerText = 2 - gGame.strikesCount
}

function renderMarkedCounter() {
  const elMarkedCounter = document.querySelector('.marked-counter')
  elMarkedCounter.innerText = gLevel.minesCount - gGame.markedCount
}

function changeSmiley(emotion) {
  const elSmiley = document.querySelector('.smiley')

  switch (emotion) {
    case 'happy':
      elSmiley.src = './img/smiley.png'
      break
    case 'sad':
      elSmiley.src = './img/sad.png'
      break
    case 'win':
      elSmiley.src = './img/win.png'
      break
  }
}

function onLevelClick(elLevel) {
  const elCurrLevelBtn = document.querySelector('.selected-level')
  elCurrLevelBtn.classList.remove('selected-level')

  elLevel.classList.add('selected-level')
  onInit()
}

function getGlevel() {
  const elLevelBtn = document.querySelector('.selected-level')
  return {
    size: +elLevelBtn.dataset.size,
    minesCount: +elLevelBtn.dataset.minesCount,
  }
}

function handleEmptyCell(pos) {
  const negsCoords = getNegsCoords(gBoard, pos)

  for (let i = 0; i < negsCoords.length; i++) {
    var currPos = negsCoords[i]
    var currCell = gBoard[currPos.i][currPos.j]
    if (!currCell.isMarked) {
      const elCell = getCellEl(currPos.i, currPos.j)
      onCellClicked(elCell, currPos.i, currPos.j)
    }
  }
}

function getCellEl(i, j) {
  return document.querySelector(`[data-i="${i}"][data-j="${j}"]`)
}

function startClock() {
  const elTimer = document.querySelector('.timer')
  startTime = Date.now()

  gTimerInterval = setInterval(() => {
    var timeStamp = ((Date.now() - startTime) / 1000).toFixed(2)
    elTimer.innerText = timeStamp
  }, 100)
}

function onHint(elBulb) {
  if (gHint.isOn && gHint.elBulb !== elBulb) return
  if (gHint.isOn) {
    gHint.isOn = false
    gHint.elBulb = null
    elBulb.src = './img/off-hint.svg'
    return
  }
  gHint.isOn = true
  gHint.elBulb = elBulb
  elBulb.src = './img/on-hint.svg'
}
