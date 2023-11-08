'use strict'

function createMat(ROWS, COLS) {
  const mat = []

  for (var i = 0; i < ROWS; i++) {
    const row = []
    for (var j = 0; j < COLS; j++) {
      row.push({ isShown: false, isMine: false, isMarked: false })
    }
    mat.push(row)
  }
  return mat
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min) + min)
}

function hideEl(elName, isHide) {
  const el = document.querySelector(elName)
  if (isHide) {
    el.classList.add('hidden')
  } else {
    el.classList.remove('hidden')
  }
}

function makeId(length = 6) {
  var txt = ''
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (var i = 0; i < length; i++) {
    txt += possible.charAt(Math.floor(Math.random() * possible.length))
  }

  return txt
}
