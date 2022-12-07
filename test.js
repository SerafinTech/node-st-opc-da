const winax = require('winax');
const libraryName = 'Graybox.OPC.DAWrapper'
const defaultHost = 'localhost'
const serverName = 'Matrikon.OPC.Simulation.1'
const clientName = 'OPC'
const OPC = new winax.Object(libraryName);

OPC.Connect(serverName, defaultHost);

let OPCGroups = OPC.OPCGroups;
OPCGroups.DefaultGroupIsActive = true;
let OPCGroup = OPCGroups.Add('testGroup')

let OPCItems = OPCGroups.Item(1).OPCItems

let res = OPCItems.AddItem('Random.Int8', new winax.Variant(1975, 'long'))
console.log(OPCItems)

function getServerList (host=defaultHost) {   
    return OPC.GetOPCServers(host);
}

//console.log(getServerList())