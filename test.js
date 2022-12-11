let OPC = require('./')

let opc = new OPC()

opc.getOPCServers().then(console.log)

opc.getTagList().then(taglist => {
    taglist.forEach((tag,i) => {
        if (tag.charAt(0) != '@' && tag.charAt(0) != '#') {
            opc.addReadOPCTag('Matrikon.OPC.Simulation.1', tag) 
        }
    })
    opc.startReadServer('Matrikon.OPC.Simulation.1', 1)
})

opc.on('tag change', (tag) => {
    console.log(tag)
})
