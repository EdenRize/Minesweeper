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
var gStrikes

const MINE = `<img src="./img/mine.svg"/>`

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
  gStrikes = gLevel.minesCount > 2 ? 3 : 2

  document.querySelector('.timer').innerText = '0.00'
  handlePointerClass(document.querySelectorAll('.hints-container img'), true)
  handleHiddenEl('.creative-mines', true)
  hadleDisabledEl('.undo', true)
  hadleDisabledEl('.exterminator', true)
  hadleDisabledEl('.safe-click', true)
  hadleDisabledEl('.mega-hint', true)
  const elCreativeBtn = document.querySelector('.creative-btn')
  elCreativeBtn.classList.remove('outline')

  renderStrikesCounter()
  renderMarkedCounter()
  renderSafeClicks()
  reRenderBulbs()
  renderBoard(gBoard)
  initDarkMode()
}

function populateBoard(freePos) {
  if (!gCreative.isCreative && !gIsExterminator) {
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
    gGame.isFirstClick = false
    startClock()
    hadleDisabledEl('.undo', false)
    hadleDisabledEl('.exterminator', false)
    hadleDisabledEl('.safe-click', false)
    hadleDisabledEl('.mega-hint', false)
  }

  if (!gMoves.length) {
    hadleDisabledEl('.undo', false)
  }

  if (gHint.isOn) {
    gHint.isOn = false
    gHint.isHinting = true
    handlePointerClass([gHint.elBulb], false)

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
      elCell.classList.add('marked')
      return
    }
    gMegaHint.secondCoords = { i, j }
    const elPrevCell = getCellEl(
      gMegaHint.firstCoords.i,
      gMegaHint.firstCoords.j
    )
    elPrevCell.classList.remove('marked')
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
    handleStrikes()
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
  if (elCell.innerHTML) elCell.innerHTML = null
  else elCell.innerHTML = `<img src="./img/flag.svg"/>`
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
  return (
    gGame.markedCount === gLevel.minesCount &&
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

  hadleDisabledEl('.undo', true)
  hadleDisabledEl('.exterminator', true)
  hadleDisabledEl('.safe-click', true)
  hadleDisabledEl('.mega-hint', true)
  handlePointerClass(document.querySelectorAll('.hints-container img'), false)
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

function handleStrikes() {
  gGame.strikesCount++
  gGame.markedCount++
  renderStrikesCounter()
  renderMarkedCounter()

  if (gGame.strikesCount === gStrikes) handleGameOver(false)
}

function renderStrikesCounter() {
  var strHTML = ''

  for (let i = 0; i < gStrikes - gGame.strikesCount; i++) {
    strHTML += `<img class="heart-img" src="./img/heart.svg" />`
  }

  const elStrikesCounter = document.querySelector('.strikes-container')
  elStrikesCounter.innerHTML = strHTML
  handleTransform(elStrikesCounter)
}

function renderMarkedCounter() {
  const elMarkedCounter = document.querySelector('.marked-counter')

  elMarkedCounter.innerText = gLevel.minesCount - gGame.markedCount
}

function handleTransform(el) {
  el.classList.add('big-transform')

  setTimeout(() => {
    el.classList.remove('big-transform')
  }, 300)
}

function renderSafeClicks() {
  const elSafeClickCounter = document.querySelector('.safe-click-counter')
  elSafeClickCounter.innerText = gGame.safeClicksLeft
}

function changeSmiley(emotion) {
  const elSmiley = document.querySelector('.smiley')

  switch (emotion) {
    case 'happy':
      elSmiley.src = './img/smiley.svg'
      break
    case 'sad':
      elSmiley.src = './img/sad.svg'
      break
    case 'win':
      elSmiley.src = './img/win.svg'
      break
  }

  handleTransform(elSmiley)
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
    gIsSafeClick ||
    gMegaHint.isOn
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
  const SafeCellsCoords = getSafeCellsCoords()
  if (!SafeCellsCoords.length) return
  gIsSafeClick = true
  const selectedPos = SafeCellsCoords[getRandomInt(0, SafeCellsCoords.length)]
  const elCell = getCellEl(selectedPos.i, selectedPos.j)

  handleCellDisplay(
    elCell,
    getCellContent(gBoard[selectedPos.i][selectedPos.j]),
    false
  )
  gGame.safeClicksLeft--
  renderSafeClicks()

  if (!gGame.safeClicksLeft) hadleDisabledEl('.safe-click', true)

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
  if (cellContent === MINE) {
    elCell.innerHTML = cellContent
  } else {
    elCell.innerText = cellContent
  }
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

function handlePointerClass(els, isPointer) {
  for (let i = 0; i < els.length; i++) {
    currEl = els[i]
    if (isPointer) currEl.classList.add('pointer')
    else currEl.classList.remove('pointer')
  }
}

function renderCreativeMinesCounter() {
  const elCreativeMinesCounter = document.querySelector('.creative-mines span')
  elCreativeMinesCounter.innerText = gCreative.minesLeft
}

function handleLocalStorage() {
  var currBest = localStorage.getItem(`${gLevel.size}`)
  const elTimer = document.querySelector('.timer')
  var winTime = +elTimer.innerText

  if (currBest) {
    if (currBest > winTime) {
      currBest = winTime
      var level
      if (gLevel.size === 4) level = 'Beginner'
      else if (gLevel.size === 8) level = 'Medium'
      else level = 'Expert'

      const elModal = document.querySelector('.best-score-modal')
      const elBestLevel = document.querySelector('.best-level')
      const elBestScore = document.querySelector('.best-score-container')
      elBestScore.innerText = currBest
      elBestLevel.innerText = level
      elModal.style.opacity = 1

      setTimeout(() => {
        elModal.style.opacity = 0
      }, 6000)
    }
  } else {
    currBest = winTime
  }

  localStorage.setItem(`${gLevel.size}`, currBest)
}

function handleCreative() {
  const elCreativeBtn = document.querySelector('.creative-btn')
  const elCreativeMines = document.querySelector('.creative-mines')

  if (gCreative.isCreative) {
    gCreative.isCreative = false
    gCreative.isCreating = false
    gCreative.minesLeft = null

    elCreativeMines.hidden = true
    elCreativeBtn.classList.remove('outline')
    onInit()
  } else {
    onInit()
    console.log('here')
    gCreative.isCreative = true
    gCreative.isCreating = true
    gCreative.minesLeft = gLevel.minesCount

    elCreativeMines.hidden = false
    elCreativeBtn.classList.add('outline')

    renderCreativeMinesCounter()
  }
}

function initDarkMode() {
  if (!localStorage.getItem('isDark')) return
  const isDark = JSON.parse(localStorage.getItem('isDark'))
  activeDarkMode(isDark)
}

function toggleDarkMode() {
  if (!localStorage.getItem('isDark')) {
    localStorage.setItem('isDark', false)
  }
  const isDark = JSON.parse(localStorage.getItem('isDark'))
  activeDarkMode(!isDark)
}

function activeDarkMode(isDark) {
  var elRoot = document.querySelector(':root')
  if (isDark) {
    elRoot.style.setProperty('--main-color', '#352F44')
    elRoot.style.setProperty('--text-color', '#FAF0E6')
    elRoot.style.setProperty('--nutral-color', '#5C5470')
    elRoot.style.setProperty('--nutral-color-hover', '#443e54')
    elRoot.style.setProperty('--light-color', '#B9B4C7')
    elRoot.style.setProperty('--light-color-hover', '#9691a4')
    localStorage.setItem('isDark', true)
  } else {
    elRoot.style.setProperty('--main-color', '#f5eec8')
    elRoot.style.setProperty('--text-color', '#2f3124')
    elRoot.style.setProperty('--nutral-color', '#d0d4ca')
    elRoot.style.setProperty('--nutral-color-hover', '#afb5a6')
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
    gGame.markedCount--
    renderStrikesCounter()
    renderMarkedCounter()
    return
  }

  gGame.shownCount--

  if (move.isRecursive) {
    onUndo()
  }

  if (!gMoves.length) {
    hadleDisabledEl('.undo', true)
  }

  const elUndo = document.querySelector('.undo')
  elUndo.classList.add('rotated')
  setTimeout(() => {
    elUndo.classList.remove('rotated')
  }, 400)
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

  const elMegaHint = document.querySelector('.mega-hint')
  if (gMegaHint.isOn) {
    gMegaHint.isOn = false
    elMegaHint.classList.remove('outline')
    if (gMegaHint.firstCoords) {
      const elFirstCoords = getCellEl(
        gMegaHint.firstCoords.i,
        gMegaHint.firstCoords.j
      )
      elFirstCoords.classList.remove('marked')
      gMegaHint.firstCoords = null
    }
    return
  }

  gMegaHint.isOn = true
  elMegaHint.classList.add('outline')
}

function handleMegaHint() {
  hadleDisabledEl('.mega-hint', true)
  const elMegaHint = document.querySelector('.mega-hint')
  elMegaHint.classList.remove('outline')
  const coords = getMegaHintCoords()

  displayCoords(coords, true)
  gMegaHint.isMegaHinting = true

  setTimeout(() => {
    displayCoords(coords, false)
    gMegaHint.isMegaHinting = false
    gMegaHint.isOn = false
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
    gIsExterminator ||
    gGame.isFirstClick
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

  if (gLevel.minesCount < 3) endIdx = gLevel.minesCount - 1
  else if (MinesCoords.length < 3) endIdx = MinesCoords.length
  else endIdx = 3

  for (let i = 0; i < endIdx; i++) {
    var currMineCoords = MinesCoords.splice(
      getRandomInt(0, MinesCoords.length),
      1
    )[0]
    gBoard[currMineCoords.i][currMineCoords.j].isMine = false
    gLevel.minesCount--
    if (gLevel.minesCount <= gStrikes) gStrikes--
  }

  populateBoard(null)
  renderMarkedCounter()
  renderStrikesCounter()

  for (let i = 0; i < gBoard.length; i++) {
    for (let j = 0; j < gBoard[i].length; j++) {
      var currCell = gBoard[i][j]
      if (!currCell.isShown) continue
      var elCurrCell = getCellEl(i, j)
      handleCellDisplay(elCurrCell, getCellContent(currCell), false)
    }
  }

  hadleDisabledEl('.exterminator', true)
  const elMarkedCounterContainer = document.querySelector(
    '.marked-counter-container'
  )
  handleTransform(elMarkedCounterContainer)
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
      if (getCellContent(gBoard[currPos.i][currPos.j]) === MINE) {
        currEl.innerHTML = MINE
      } else {
        currEl.innerText = getCellContent(gBoard[currPos.i][currPos.j])
      }
    } else {
      handleCellDisplay(currEl, null, true)
    }
  }
}

function handleHiddenEl(selector, isHidden) {
  const el = document.querySelector(selector)
  el.hidden = isHidden
}

function hadleDisabledEl(selector, isDisabled) {
  const el = document.querySelector(selector)
  if (isDisabled) {
    el.classList.add('disabled')
  } else {
    el.classList.remove('disabled')
  }
}
