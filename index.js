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
        this.servers = {}

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
        
        if(this.servers[server]) this.servers[server].kill()
        this.servers[server] = spawn(this.pythonLocation, [this.pythonSrcLocation, '-s', server, '-o', 'csv', '-L', updateRate, '-r', ...tagList])

        readline.createInterface({
            input: this.servers[server].stdout,
            terminal: false
        }).on('line', (line) => {   
            this._processTagData(line.trim().split(','))
        })

        this.servers[server].stderr.on('data', data => {
            setTimeout(() => {
                this.startReadServer(server, updateRate)
            }, 10000)
        })   
    }

    _processTagData(data) {
        if(data.length >= 4) {
            let index = this.tags.findIndex(ele => ele.name == data[0])
            let value = data.slice(1, data.length-2).join()
            this.tags[index].lastupdate = new Date(data[data.length-1]);
            if (this.tags[index].value !== value) {
                this.tags[index].value = value;
                this.emit('tag change', this.tags[index])
            }
            
        } 
    }

    closeServer(server) {
        this.servers[server].kill()
    }

}

module.exports = OPC