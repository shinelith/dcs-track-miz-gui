// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron')

const os = require('os')
const path = require('path')
// 加载DCS Track Miz 模块
const dtm = require('./lib/dtm')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  Menu.setApplicationMenu(null)
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 780, //650
    height: 400, //355
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')
  // Open the DevTools.
  //mainWindow.webContents.openDevTools()
  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow()
})

// 处理trk转miz
ipcMain.on('trkToMiz', (e, file, clearTrack) => {
  // 输出到源文件相同路径
  let outputdir = path.dirname(file) + "/"
  //let {name} = path.parse(file)
  dtm.convert(file, outputdir, {
    clean: clearTrack
  })
  mainWindow.webContents.send('execResult', 200, {
    outputdir: outputdir
  })
})

// trk合并到miz
ipcMain.on('trkMergeToMiz', (e, trkFile, mizFile) => {
  // 输出到源文件相同路径
  let outputdir = path.dirname(mizFile) + "/"
  let inputMizInfo = path.parse(mizFile)
  let outputFileName = inputMizInfo.name + "_withTrack" + inputMizInfo.ext
  dtm.merge(trkFile,mizFile,outputdir,outputFileName)
  mainWindow.webContents.send('execResult', 200, {
    outputdir: outputdir
  })
})

// 清除miz的track数据
ipcMain.on('cleanMizTrack', (e, mizFile) => {
  let outputdir = path.dirname(mizFile) + "/"
  let inputMizInfo = path.parse(mizFile)
  let outputFileName = inputMizInfo.name + "_clean" + inputMizInfo.ext
  dtm.clean(mizFile,outputdir,outputFileName)
  mainWindow.webContents.send('execResult', 200, {
    outputdir: outputdir
  })
})

// 使用浏览器打开网址
ipcMain.on('openUrl', (e, url) => {
  shell.openExternal(url)
})

// 打开目录
ipcMain.on('openDir', (e, path) => {
  shell.showItemInFolder(path)
})