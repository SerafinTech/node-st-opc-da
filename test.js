const { spawn, exec } = require("child_process")
const EventEmitter = require("events")
const readline = require('readline')

//const OPC = spawn('C:\\python27\\python.exe', ['libs\\OpenOPC\\src\\opc.py','-s', 'Matrikon.OPC.Simulation.1', '-o', 'csv','-L' , '0.1', '-r', 'Random.Real8'])
//let lines = 0
 /*
//readline.createInterface({
//    input: OPC.stdout,
//    terminal: false
//}).on('line', (line) => {
    lines++
    console.log(lines, line.trim().split(','))
    //console.log(OPC.stdout)
})
*/
class OPC extends EventEmitter {
    constructor() {
        super()
        this.pythonLocation = 'C:\\python27\\python.exe'
        this.pythonSrcLocation = 'libs\\OpenOPC\\src\\opc.py'
        this.tags = []
        this.servers = []
    }

    getOPCServers() {
        return new Promise((resolve, reject) => {
            exec(this.pythonLocation + ' ' + this.pythonSrcLocation + ' -q', (error, stdout) => {
                if (error) {
                    reject(error)
                } else {
                    resolve(stdout.toString().trim().split(/\r?\n/))
                }
            }) 
        })
    }

    addReadOPCTag(server, name) {
        this.tags.push({
            server: server,
            name: name,
            value: null,
            lastupdate: 0
        })
    }

    startReadServer(server, updateRate = 1) {
        let tagList = []
        
        this.tags.forEach(tag => {
            if (tag.server == server) {
                tagList.push(tag.name)
            }
        })
        
        const Server = spawn(this.pythonLocation, [this.pythonSrcLocation, '-s', server, '-o', 'csv', '-L', updateRate, '-r', ...tagList])

        readline.createInterface({
            input: Server.stdout,
            terminal: false
        }).on('line', (line) => {
           this._processTagData(line.trim().split(','))
        })
    }

    _processTagData(data) {
        let tag = this.tags.find(ele => ele.name === data[0])
        tag.value = data[1]
        tag.lastupdate = new Date(data[3]);      
    }
}

let opc = new OPC()

opc.getOPCServers().then((data) => {
    //console.log(data)
})

opc.addReadOPCTag('Matrikon.OPC.Simulation.1', 'Random.Real8')

opc.startReadServer('Matrikon.OPC.Simulation.1')

setInterval(() => {
    console.log(opc.tags)
},1000)