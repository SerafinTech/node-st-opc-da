const { spawn } = require("child_process")
const EventEmitter = require("events")
const path = require("path")
const readline = require("readline")

class OPC extends EventEmitter {
    constructor() {
        super()
        this.pythonLocation = 'C:\\python27\\python.exe'
        this.pythonSrcLocation = path.join(__dirname, 'lib', 'OpenOPC', 'src', 'opc.py')
        this.tags = []
        this.servers = []
    }

    getOPCServers() {
        return this._runSingleCommand(['-q']) 
    }

    getTagList() {
        return this._runSingleCommand(['-f'])
    }

    _runSingleCommand(command) {
        return new Promise((resolve, reject) => {
            
            let opcCommand = spawn(this.pythonLocation,[this.pythonSrcLocation, ...command])
            let result = Buffer.alloc(0)

            opcCommand.stdout.on('data', data => {
                result = Buffer.concat([result, data])
            })

            opcCommand.on('close', code => {
                resolve(result.toString().trim().split(/\r?\n/))
            })

            opcCommand.stderr.on('data', err => {
                reject(err.toString().trim())
            })
        })
    }

    writeTag(tag, newValue) {
        tag.value = newValue.toString();
        let command = ['-o', 'csv', '-s', tag.server, '-w', tag.name, newValue];
        return this._runSingleCommand(command)
    }

    writeTags(server, tags, newValues) {
        let command = ['-o', 'csv', '-s', server, '-w'];

        tags.forEach((tag, i) => {
            tag.value = newValues[i].toString()
            command.push(tag.name)
            command.push(newValues[i].toString())
        })
        
        return this._runSingleCommand(command)
    }

    addReadOPCTag(server, name) {
        this.tags.push({
            server: server,
            name: name,
            value: null,
            lastupdate: 0
        })

        return this.tags[this.tags.length-1]
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

        Server.stderr.on('data', data => {
            setTimeout(() => {
                this.startReadServer(server, updateRate)
            }, 5000)
        })   
    }

    _processTagData(data) {
        if(data.length >= 4) {
            let tag = this.tags.find(ele => ele.name === data[0])
            let value = data.slice(1, data.length-2).join()
            tag.lastupdate = new Date(data[data.length-1]);
            if (tag.value !== value) {
                tag.value = value;
                this.emit('tag change', tag)
            }
            
        } 
    }
}

module.exports = OPC