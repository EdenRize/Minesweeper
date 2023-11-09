var gBoard // each cell: {minesAroundCount:X, isShown:Boolian, isMine:Boolian, isMarked:Boolian}
var gGame // {isOn:Boolian, isFirstClick:Boolian, shownCount:X, markedCount:X, startTime:X, strikesCount:X, hintsLeft:X}
var gLevel // {size:X , minesCount:X}
var gTimerInterval
var gHint
var gMegaHint
var gIsSafeClick
var gCreative
var gMoves
var gIsExterminator

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
    safeClicksLeft: 3,
  }

  changeSmiley('happy')
  clearInterval(gTimerInterval)
  gTimerInterval = null
  gHint = { isOn: false, isHinting: false }
  gMegaHint = { isOn: false, isMegaHinting: false }
  gCreative = { isCreative: false, isCreating: false }
  gIsSafeClick = false
  gIsExterminator = false
  gMoves = []

  document.querySelector('.timer').innerText = null
  const elCreativeMines = document.querySelector('.creative-mines')
  elCreativeMines.hidden = true
  const elMegaHint = document.querySelector('.mega-hint')
  elMegaHint.hidden = false
  const elExterminator = document.querySelector('.exterminator')
  elExterminator.hidden = false

  renderStrikesCounter()
  renderMarkedCounter()
  renderSafeClicks()
  reRenderBulbs()
  renderBoard(gBoard)
}

function populateBoard(freePos) {
  if (!gCreative.isCreative && !gIsExterminator) {
    console.log('here')
    setMines(gBoard, freePos)
  }

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
  for (let i = 0; i < gLevel.minesCount; i++) {
    var chosenPos = {
      i: getRandomInt(0, gLevel.size),
      j: getRandomInt(0, gLevel.size),
    }
    while (
      (chosenPos.i === freePos.i && chosenPos.j === freePos.j) ||
      board[chosenPos.i][chosenPos.j].isMine
    ) {
      chosenPos = {
        i: getRandomInt(0, gLevel.size),
        j: getRandomInt(0, gLevel.size),
      }
    }
    board[chosenPos.i][chosenPos.j].isMine = true
  }
  //   board[1][1].isMine = true
  //   board[2][2].isMine = true
}

function onCellClicked(elCell, i, j, isRecursive = false) {
  const currCell = gBoard[i][j]
  if (
    !gGame.isOn ||
    currCell.isShown ||
    currCell.isMarked ||
    gHint.isHinting ||
    gIsSafeClick ||
    gMegaHint.isMegaHinting
  )
    return

  if (gCreative.isCreating) {
    if (currCell.isMine || gCreative.minesLeft === 0) return
    currCell.isMine = true
    gCreative.minesLeft--
    renderCreativeMinesCounter()
    handleCellDisplay(elCell, MINE, true)
    if (gCreative.minesLeft === 0) {
      const elCreativeMines = document.querySelector('.creative-mines')
      elCreativeMines.hidden = true
      setTimeout(() => {
        gCreative.isCreating = false
        renderAllMines(false)
      }, 1000)
    }
    return
  }

  if (gGame.isFirstClick) {
    populateBoard({ i, j })
    console.table(gBoard)
    gGame.isFirstClick = false
    startClock()
  }

  if (gHint.isOn) {
    gHint.isOn = false
    gHint.isHinting = true

    const coordsToShow = getNegsCoords(gBoard, { i, j })
    coordsToShow.push({ i, j })

    displayCoords(coordsToShow, true)

    setTimeout(() => {
      displayCoords(coordsToShow, false)
      gHint.elBulb.hidden = true
      gHint.isHinting = false
    }, 2000)
    return
  }

  if (gMegaHint.isOn) {
    if (!gMegaHint.firstCoords) {
      gMegaHint.firstCoords = { i, j }
      return
    }
    gMegaHint.secondCoords = { i, j }

    handleMegaHint()
    return
  }

  gMoves.push({})

  handleCellDisplay(elCell, getCellContent(currCell), false)
  gMoves[gMoves.length - 1].handleCellDisplay = {
    elCell,
    cellContent: null,
    isAddClassLists: true,
  }
  currCell.isShown = true
  gMoves[gMoves.length - 1].isShown = { cell: currCell, isShown: false }

  if (currCell.isMine) {
    gMoves[gMoves.length - 1].isMine = true
    handleStrikes(elCell)
    return
  }

  gGame.shownCount++

  if (isRecursive) gMoves[gMoves.length - 1].isRecursive = true
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

function getMinesCoords() {
  const minesCoords = []

  for (let i = 0; i < gBoard.length; i++) {
    for (let j = 0; j < gBoard[i].length; j++) {
      var currCell = gBoard[i][j]
      if (currCell.isMine) minesCoords.push({ i, j })
    }
  }

  return minesCoords
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
  //   console.log(
  //     'gGame.markedCount === gLevel.minesCount - gGame.strikesCount',
  //     gGame.markedCount === gLevel.minesCount - gGame.strikesCount
  //   )
  //   console.log(
  //     'gGame.shownCount === gLevel.size ** 2 - gLevel.minesCount',
  //     gGame.shownCount === gLevel.size ** 2 - gLevel.minesCount
  //   )
  return (
    gGame.markedCount === gLevel.minesCount - gGame.strikesCount &&
    gGame.shownCount === gLevel.size ** 2 - gLevel.minesCount
  )
}

function handleGameOver(isWin) {
  gGame.isOn = false
  removeNotMarkedClass()
  clearInterval(gTimerInterval)
  if (isWin) {
    changeSmiley('win')
    handleLocalStorage()
  } else {
    changeSmiley('sad')
    renderAllMines(true)
  }
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
  renderStrikesCounter()

  if (gGame.strikesCount === 2) handleGameOver(false)
  //   if (isWin()) handleGameOver(true)
}

function renderStrikesCounter() {
  const elStrikesCounter = document.querySelector('.strikes-counter')
  elStrikesCounter.innerText = 2 - gGame.strikesCount
}

function renderMarkedCounter() {
  const elMarkedCounter = document.querySelector('.marked-counter')
  elMarkedCounter.innerText = gLevel.minesCount - gGame.markedCount
}

function renderSafeClicks() {
  const elSafeClickCounter = document.querySelector('.safe-click-counter')
  elSafeClickCounter.innerText = gGame.safeClicksLeft
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

  if (gHint.isOn) {
    gHint.isOn = false
    const elBulb = gHint.elBulb
    gHint.elBulb = null
    elBulb.src = './img/off-hint.svg'
  }
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
      onCellClicked(elCell, currPos.i, currPos.j, true)
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
  if (
    !gGame.isOn ||
    (gHint.isOn && gHint.elBulb !== elBulb) ||
    gHint.isHinting ||
    gCreative.isCreating ||
    gIsSafeClick
  )
    return
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

function onSafeClick() {
  if (
    !gGame.isOn ||
    gGame.isFirstClick ||
    !gGame.safeClicksLeft ||
    gHint.isHinting ||
    gIsSafeClick
  )
    return
  gIsSafeClick = true
  const SafeCellsCoords = getSafeCellsCoords()
  const selectedPos = SafeCellsCoords[getRandomInt(0, SafeCellsCoords.length)]
  const elCell = getCellEl(selectedPos.i, selectedPos.j)

  handleCellDisplay(
    elCell,
    getCellContent(gBoard[selectedPos.i][selectedPos.j]),
    false
  )
  gGame.safeClicksLeft--
  renderSafeClicks()

  setTimeout(
    () => {
      handleCellDisplay(elCell, null, true)
      gIsSafeClick = false
    },
    2000,
    elCell
  )
}

function getSafeCellsCoords() {
  const SafeCellsCoords = []

  for (let i = 0; i < gBoard.length; i++) {
    for (let j = 0; j < gBoard[i].length; j++) {
      var currCell = gBoard[i][j]
      if (!currCell.isMine && !currCell.isShown) SafeCellsCoords.push({ i, j })
    }
  }

  return SafeCellsCoords
}

function renderAllMines(isShow) {
  const minesCoords = getMinesCoords()

  for (let i = 0; i < minesCoords.length; i++) {
    var currPos = minesCoords[i]
    var elCell = getCellEl(currPos.i, currPos.j)
    if (isShow) handleCellDisplay(elCell, MINE, false)
    else handleCellDisplay(elCell, null, true)
  }
}

function handleCellDisplay(elCell, cellContent, isAddClassLists) {
  elCell.innerText = cellContent
  if (isAddClassLists) {
    elCell.classList.add('not-marked')
    elCell.classList.add('pointer')
  } else {
    elCell.classList.remove('not-marked')
    elCell.classList.remove('pointer')
  }
}

function reRenderBulbs() {
  const elBulbs = document.querySelectorAll('.hints-container img')
  for (let i = 0; i < elBulbs.length; i++) {
    elBulbs[i].hidden = false
    elBulbs[i].src = './img/off-hint.svg'
  }
}

function renderCreativeMinesCounter() {
  const elCreativeMinesCounter = document.querySelector('.creative-mines span')
  elCreativeMinesCounter.innerText = gCreative.minesLeft
}

function handleLocalStorage() {
  const currBest = localStorage.getItem(`${gLevel.size}`)
  const elTimer = document.querySelector('.timer')
  console.log(elTimer.innerText)
  var winTime = elTimer.innerText
  if (currBest) {
    if (currBest < winTime) winTime = currBest
  }

  localStorage.setItem(`${gLevel.size}`, winTime)
}

function handleCreative() {
  onInit()
  gCreative.isCreative = true
  gCreative.isCreating = true
  gCreative.minesLeft = gLevel.minesCount

  const elCreativeMines = document.querySelector('.creative-mines')
  elCreativeMines.hidden = false

  renderCreativeMinesCounter()
}

function toggleDarkMode() {
  if (!localStorage.getItem('isDark')) {
    localStorage.setItem('isDark', false)
  }
  const isDark = JSON.parse(localStorage.getItem('isDark'))
  var elRoot = document.querySelector(':root')
  if (!isDark) {
    elRoot.style.setProperty('--main-color', '#331D2C')
    elRoot.style.setProperty('--text-color', '#EFE1D1')
    elRoot.style.setProperty('--nutral-color', '#A78295')
    elRoot.style.setProperty('--light-color', '#6c506a')
    elRoot.style.setProperty('--light-color-hover', '#61485f')
    localStorage.setItem('isDark', true)
  } else {
    elRoot.style.setProperty('--main-color', '#f5eec8')
    elRoot.style.setProperty('--text-color', '#555843')
    elRoot.style.setProperty('--nutral-color', '#d0d4ca')
    elRoot.style.setProperty('--light-color', '#a7d397')
    elRoot.style.setProperty('--light-color-hover', 'rgb(148, 189, 133)')
    localStorage.setItem('isDark', false)
  }
}

function onUndo() {
  if (!gGame.isOn || gGame.isFirstClick || !gMoves.length) return
  const move = gMoves.pop()

  handleCellDisplay(
    move.handleCellDisplay.elCell,
    move.handleCellDisplay.cellContent,
    move.handleCellDisplay.isAddClassLists
  )
  move.isShown.cell.isShown = move.isShown.isShown

  if (move.isMine) {
    gGame.strikesCount--
    renderStrikesCounter()
    return
  }

  gGame.shownCount--

  if (move.isRecursive) {
    onUndo()
  }
}

function onMegaHint() {
  if (
    !gGame.isOn ||
    gHint.isOn ||
    gCreative.isCreating ||
    gGame.isFirstClick ||
    gIsSafeClick
  )
    return

  if (gMegaHint.isOn) {
    gMegaHint.isOn = false
    return
  }

  gMegaHint.isOn = true
}

function handleMegaHint() {
  const coords = getMegaHintCoords()

  displayCoords(coords, true)
  gMegaHint.isMegaHinting = true

  setTimeout(() => {
    displayCoords(coords, false)
    gMegaHint.isMegaHinting = false
    gMegaHint.isOn = false

    const elMegaHint = document.querySelector('.mega-hint')
    elMegaHint.hidden = true
  }, 2000)
}

function getMegaHintCoords() {
  var firstCoords
  var secondCoords

  if (gMegaHint.firstCoords.i > gMegaHint.secondCoords.i) {
    firstCoords = gMegaHint.secondCoords
    secondCoords = gMegaHint.firstCoords
  } else if (gMegaHint.firstCoords.i < gMegaHint.secondCoords.i) {
    firstCoords = gMegaHint.firstCoords
    secondCoords = gMegaHint.secondCoords
  } else {
    if (gMegaHint.firstCoords.j > gMegaHint.secondCoords.j) {
      firstCoords = gMegaHint.secondCoords
      secondCoords = gMegaHint.firstCoords
    } else {
      firstCoords = gMegaHint.firstCoords
      secondCoords = gMegaHint.secondCoords
    }
  }

  const megaHintCoords = []

  var startIdxJ =
    firstCoords.j > secondCoords.j ? secondCoords.j : firstCoords.j
  var endIdxJ = secondCoords.j > firstCoords.j ? secondCoords.j : firstCoords.j

  for (let i = firstCoords.i; i <= secondCoords.i; i++) {
    for (let j = startIdxJ; j <= endIdxJ; j++) {
      megaHintCoords.push({ i, j })
    }
  }

  return megaHintCoords
}

function onExterminator() {
  if (
    !gGame.isOn ||
    gMegaHint.isMegaHinting ||
    gHint.isHinting ||
    gIsSafeClick ||
    gIsExterminator
  )
    return

  gIsExterminator = true
  const MinesCoords = getMinesCoords()

  for (let i = 0; i < MinesCoords.length; i++) {
    var currPos = MinesCoords[i]
    if (gBoard[currPos.i][currPos.j].isShown) {
      MinesCoords.splice(i, 1)
    }
  }

  var endIdx

  if (gLevel.MinesCount < 3) endIdx = gLevel.MinesCount
  else if (MinesCoords.length < 3) endIdx = MinesCoords.length
  else endIdx = 3

  for (let i = 0; i < endIdx; i++) {
    var currMineCoords = MinesCoords.splice(
      getRandomInt(0, MinesCoords.length),
      1
    )[0]
    gBoard[currMineCoords.i][currMineCoords.j].isMine = false
    gLevel.minesCount--
  }

  populateBoard(null)
  renderMarkedCounter()

  for (let i = 0; i < gBoard.length; i++) {
    for (let j = 0; j < gBoard[i].length; j++) {
      var currCell = gBoard[i][j]
      if (!currCell.isShown) continue
      var elCurrCell = getCellEl(i, j)
      handleCellDisplay(elCurrCell, getCellContent(currCell), false)
    }
  }

  const elExterminator = document.querySelector('.exterminator')
  elExterminator.hidden = true
}

function displayCoords(coords, isShow) {
  for (let i = 0; i < coords.length; i++) {
    var currPos = coords[i]
    if (!isShow) {
      if (gBoard[currPos.i][currPos.j].isShown) continue
    }
    var currEl = getCellEl(currPos.i, currPos.j)
    if (isShow) {
      handleCellDisplay(
        currEl,
        getCellContent(gBoard[currPos.i][currPos.j]),
        false
      )
      currEl.innerText = getCellContent(gBoard[currPos.i][currPos.j])
    } else {
      handleCellDisplay(currEl, null, true)
    }
  }
}
