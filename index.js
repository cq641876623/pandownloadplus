const { app, BrowserWindow,Menu, Tray,ipcMain  } = require('electron')
const electron = require('electron')
const { session } = require('electron')
const exec = require('child_process').exec
const {resolve} = require('path')
var websocket = require('./websocket');



const path = require('path');

// 保持对window对象的全局引用，如果不这么做的话，当JavaScript对象被
// 垃圾回收的时候，window对象将会自动的关闭
let win
let defWidth=400
let defHeight=300
var appIcon = null;
var aria2cStatus={status:true,msg:"成功"}
let processWin;
function createWindow () {



    let keyCookie=null;
    // 创建浏览器窗口。
    win = new BrowserWindow({
        width: defWidth, height: defHeight,
        autoHideMenuBar :true,
        frame: false,
        transparent:true,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
            webviewTag:true
        },
        titleBarStyle:"hidden"
    })

    // 然后加载应用的 index.html。
    win.loadFile('index.html')

    // 打开开发者工具
    // win.webContents.openDevTools()

    win.on("maximize",function () {
        console.log("max")
    })
    win.on("unmaximize",function () {
        console.log("unmaximize")
    })
    // win.maximize()
    ipcMain.on('win-maxed', function(event, arg) {
        win.maximize()
    });

    ipcMain.on('set-key-cookie', function(event, arg) {
        session.defaultSession.cookies.get({ name:"BDUSS",domain: '.baidu.com' })
            .then((cookies) => {
                if(cookies.length>0){
                    keyCookie= cookies[0].name+"="+cookies[0].value
                }
            }).catch((error) => {
            // console.log(error)
            });
    })
    ipcMain.on('get-key-cookie', function(event, arg) {
        if(arg!=null){
            arg[0].cookie=keyCookie;
        }
        event.sender.send("start-task",arg)
    })
    ipcMain.on('get-aria2c-status', function(event, arg) {
        event.sender.send("response-aria2c-status",aria2cStatus)
    })


    ipcMain.on('win-control-message', function(event, arg) {
        // console.log(arg);  // prints "ping"
        win.setBounds(0,0,defWidth, defHeight)
        // console.log(win.getBounds())
        // console.log(win.getSize())
        switch (arg) {
            case 'close':
               win.close()
                break;
            case 'max':


                if(win.isMaximized()){
                    win.restore();
                }else{
                    win.maximize()
                }
                // if(win.isMaximized()){
                //     console.log(1)
                //     win.unmaximize()
                //     win.setBounds(0,0,defWidth, defHeight)
                // }else{
                //     console.log(2)
                //     win.maximize()
                // }
                break;
            case 'min':
                win.hide()
                break;

        }

    });

    // let cmdPath = resolve(__dirname,  "../");//打包
    let cmdPath =  resolve(__dirname,"");//未打包
    let cmdStr = 'aria2c.exe --conf-path='+cmdPath+'"/aria2.conf" -D'

    workerProcess = exec(cmdStr, {cwd: cmdPath},(error, stdout, stderr) => {
        if (error) {
            console.error(`执行的错误: ${error}`);
            aria2cStatus.status=false;
            aria2cStatus.msg=error;
            return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);

    })
    workerProcess.stdout.on('data', function (data) {
        // console.log('stdout: ' + data);
        console.log('stdout: ' ,data);

    });
    // workerProcess.disconnect()

    // workerProcess





    // var appTray = new Tray("1.jpg");
    // var contextMenu = Menu.buildFromTemplate([
    //     { label: 'Item1', type: 'radio' },
    //     { label: 'Item2', type: 'radio' },
    //     { label: 'Item3', type: 'radio', checked: true },
    //     { label: 'Item4', type: 'radio' }
    // ]);
    // appTray.setToolTip('This is my application.');
    // appTray.setContextMenu(contextMenu);
    // 当 window 被关闭，这个事件会被触发。
    win.on('closed', () => {
        // 取消引用 window 对象，如果你的应用支持多窗口的话，
        // 通常会把多个 window 对象存放在一个数组里面，
        // 与此同时，你应该删除相应的元素。
        win = null
    })


    createTray()
    createProccessWin()
}

function createTray(){

    appIcon = new Tray( path.join(__dirname, 'yun.png'));
    var contextMenu = Menu.buildFromTemplate([
        { label: '显示主界面', type: 'normal' ,click: function() { win.show(); }},
        { label: '显示/隐藏悬浮', type: 'normal' ,click: function() {
            if(processWin.isVisible()){
                processWin.hide();
            }else {
                processWin.show();
            }

        }},
        { label: '退出', type: 'normal' ,click: function() { win.close(); }}
    ]);
    appIcon.setToolTip('云盘下载器');
    appIcon.setContextMenu(contextMenu);

    appIcon.on('click', function () {
        win.show();
    })






}


function createProccessWin(){
    processWin = new BrowserWindow({ parent: win , width: 110, height: 110,
        autoHideMenuBar :true,
        x:100,
        y:100,
        frame: false,
        transparent:true,
        maximizable:false,
        alwaysOnTop:true,
        resizeable:false,
        fullscreen:false,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
            webviewTag:true,

        },
        titleBarStyle:"hidden"})

    processWin.loadFile('proccess.html')
    processWin.on('app-command', function(e, cmd) {
        // Navigate the window back when the user hits their mouse back button
        console.log(cmd)

    });
    // processWin.webContents.openDevTools()

}


// Electron 函会在初始化后并准备
// // 创建浏览器窗口时，调用这个数。
// 部分 API 在 ready 事件触发后才能使用。
app.allowRendererProcessReuse=false
app.on('ready', createWindow)

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        websocket.connect(function() {
            websocket.send({
                "method": "aria2.shutdown",
                "params": [
                    "token:rorochen-download"
                ]
            }, function(result) {
                console.log(result);
            });
        });
        workerProcess = exec("taskkill /F /im aria2c.exe")

        app.quit()
    }
})

app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (win === null) {
        createWindow()
    }
})
